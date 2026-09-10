import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ClientAuthConfigurationError,
  loadClientAuthConfig,
  type ClientAuthConfig,
} from "../../lib/client-auth/config";
import { keyedHash } from "../../lib/client-auth/crypto";
import {
  openClientDatabase,
  type ClientDatabase,
} from "../../lib/client-identity/database";
import {
  findIdentityByEmail,
  resolveEmailIdentity,
} from "../../lib/client-identity";
import {
  AUTH_FLOW_LIFETIME_MS,
  SESSION_LIFETIME_MS,
  SESSION_ROTATION_MS,
  authenticateSession,
  authFlowCookieOptions,
  consumeAuthFlow,
  createAuthFlow,
  csrfCookieOptions,
  issueSession,
  revokeAllClientSessions,
  revokeSession,
  rotateSession,
  sessionCookieOptions,
  verifyAuthFlow,
  verifySessionCsrf,
} from "../../lib/client-session";

const APP_ORIGIN = "https://client.example";
const SESSION_SECRET = "a-session-secret-with-at-least-32-bytes";
const FORGED_SESSION_TOKEN = "A".repeat(43);
const FORGED_CSRF_TOKEN = "B".repeat(43);
const FROZEN_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const FROZEN_SESSION_ROTATION_MS = 12 * 60 * 60 * 1_000;
const FROZEN_AUTH_FLOW_LIFETIME_MS = 10 * 60 * 1_000;

type CoreState = Readonly<{
  auditEvents: number;
  authFlows: number;
  consumedFlows: number;
  revokedSessions: number;
  sessions: number;
}>;

function scalarCount(database: ClientDatabase, sql: string): number {
  const row = database.prepare(sql).get() as { count: number };
  return row.count;
}

function readCoreState(database: ClientDatabase): CoreState {
  return {
    auditEvents: scalarCount(
      database,
      "SELECT COUNT(*) AS count FROM client_security_audit_events",
    ),
    authFlows: scalarCount(database, "SELECT COUNT(*) AS count FROM client_auth_flows"),
    consumedFlows: scalarCount(
      database,
      "SELECT COUNT(*) AS count FROM client_auth_flows WHERE consumed_at IS NOT NULL",
    ),
    revokedSessions: scalarCount(
      database,
      "SELECT COUNT(*) AS count FROM client_sessions WHERE revoked_at IS NOT NULL",
    ),
    sessions: scalarCount(database, "SELECT COUNT(*) AS count FROM client_sessions"),
  };
}

function environmentFor(databasePath: string, overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    CLIENT_APP_ORIGIN: APP_ORIGIN,
    CLIENT_IDENTITY_DB_PATH: databasePath,
    CLIENT_SESSION_SECRET: SESSION_SECRET,
    ...overrides,
  };
}

function openCore(databasePath: string): Readonly<{
  config: ClientAuthConfig;
  database: ClientDatabase;
}> {
  const config = loadClientAuthConfig(environmentFor(databasePath));
  return { config, database: openClientDatabase(config) };
}

describe("client identity and session core", () => {
  let temporaryRoot: string;
  let databasePath: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(tmpdir(), "client-identity-core-"));
    databasePath = path.join(temporaryRoot, "identity.sqlite");
  });

  afterEach(() => {
    rmSync(temporaryRoot, { force: true, recursive: true });
  });

  it("applies migration 001 idempotently and preserves one immutable canonical identity", () => {
    const first = openCore(databasePath);
    first.database.close();

    const { database } = openCore(databasePath);
    const migration = database
      .prepare(
        "SELECT COUNT(*) AS count FROM client_schema_migrations WHERE version = ?",
      )
        .get(1) as { count: number };
    expect(migration.count).toBe(1);

    const firstIdentity = resolveEmailIdentity(database, "  Owne\u0301r@Example.COM  ", 100);
    const sameIdentity = resolveEmailIdentity(database, "OWNÉR@example.com", 200);

    expect(sameIdentity).toEqual(firstIdentity);
    expect(firstIdentity).toMatchObject({
      canonicalEmail: "ownér@example.com",
      createdAt: 100,
    });
    expect(findIdentityByEmail(database, " ownér@EXAMPLE.com ")).toEqual(firstIdentity);
    expect(scalarCount(database, "SELECT COUNT(*) AS count FROM client_identities")).toBe(1);
    expect(() =>
      database
        .prepare("UPDATE client_identities SET canonical_email = ? WHERE id = ?")
        .run("replacement@example.com", firstIdentity.id),
    ).toThrow(/immutable/i);
    expect(findIdentityByEmail(database, "ownér@example.com")).toEqual(firstIdentity);

    const applicationTables = (
      database
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map(({ name }) => name);
    expect(applicationTables).toEqual([
      "client_auth_flows",
      "client_identities",
      "client_schema_migrations",
      "client_security_audit_events",
      "client_sessions",
    ]);
    database.close();
  });

  it("issues, authenticates, rotates, and revokes opaque hashed sessions", () => {
    const { config, database } = openCore(databasePath);
    const identity = resolveEmailIdentity(database, "client@example.com", 1_000);
    const issuedAt = 10_000;
    const issued = issueSession(database, config, identity.id, issuedAt);

    expect(Buffer.from(issued.token, "base64url")).toHaveLength(32);
    expect(Buffer.from(issued.csrfToken, "base64url")).toHaveLength(32);
    expect(SESSION_LIFETIME_MS).toBe(FROZEN_SESSION_LIFETIME_MS);
    expect(SESSION_ROTATION_MS).toBe(FROZEN_SESSION_ROTATION_MS);
    expect(issued.expiresAt).toBe(issuedAt + FROZEN_SESSION_LIFETIME_MS);

    const stored = database
      .prepare(
        "SELECT token_hash, csrf_hash, expires_at, revoked_at FROM client_sessions WHERE id = ?",
      )
      .get(issued.id) as {
      csrf_hash: string;
      expires_at: number;
      revoked_at: number | null;
      token_hash: string;
    };
    expect(stored.token_hash).toBe(keyedHash(config.sessionSecret, issued.token));
    expect(stored.csrf_hash).toBe(keyedHash(config.sessionSecret, issued.csrfToken));
    expect(stored.token_hash).not.toBe(issued.token);
    expect(stored.csrf_hash).not.toBe(issued.csrfToken);
    expect(stored.expires_at).toBe(issued.expiresAt);
    expect(stored.revoked_at).toBeNull();

    expect(authenticateSession(database, config, issued.token, issuedAt + 1)).toMatchObject({
      clientId: identity.id,
      id: issued.id,
    });
    expect(verifySessionCsrf(database, config, issued.id, issued.csrfToken, issuedAt + 1)).toBe(
      true,
    );

    const beforeForgedProofs = readCoreState(database);
    expect(authenticateSession(database, config, FORGED_SESSION_TOKEN, issuedAt + 1)).toBeNull();
    expect(verifySessionCsrf(database, config, issued.id, FORGED_CSRF_TOKEN, issuedAt + 1)).toBe(
      false,
    );
    expect(readCoreState(database)).toEqual(beforeForgedProofs);

    const beforePrematureRotation = readCoreState(database);
    expect(
      rotateSession(
        database,
        config,
        issued.token,
        issuedAt + FROZEN_SESSION_ROTATION_MS - 1,
      ),
    ).toBeNull();
    expect(readCoreState(database)).toEqual(beforePrematureRotation);

    const rotatedAt = issuedAt + FROZEN_SESSION_ROTATION_MS;
    const rotated = rotateSession(database, config, issued.token, rotatedAt);
    expect(rotated).not.toBeNull();
    expect(authenticateSession(database, config, issued.token, rotatedAt)).toBeNull();
    expect(authenticateSession(database, config, rotated!.token, rotatedAt)).toMatchObject({
      clientId: identity.id,
      id: rotated!.id,
    });

    const forced = rotateSession(database, config, rotated!.token, rotatedAt + 1, true);
    expect(forced).not.toBeNull();
    expect(authenticateSession(database, config, rotated!.token, rotatedAt + 1)).toBeNull();
    expect(revokeSession(database, config, forced!.token, rotatedAt + 2)).toBe(true);
    expect(authenticateSession(database, config, forced!.token, rotatedAt + 2)).toBeNull();

    const beforeReplay = readCoreState(database);
    expect(revokeSession(database, config, forced!.token, rotatedAt + 3)).toBe(false);
    expect(readCoreState(database)).toEqual(beforeReplay);

    const expiring = issueSession(database, config, identity.id, 30_000);
    const beforeExpiryChecks = readCoreState(database);
    expect(authenticateSession(database, config, expiring.token, expiring.expiresAt)).toBeNull();
    expect(verifySessionCsrf(database, config, expiring.id, expiring.csrfToken, expiring.expiresAt)).toBe(
      false,
    );
    expect(rotateSession(database, config, expiring.token, expiring.expiresAt)).toBeNull();
    expect(readCoreState(database)).toEqual(beforeExpiryChecks);

    const bulkOne = issueSession(database, config, identity.id, 40_000);
    const bulkTwo = issueSession(database, config, identity.id, 40_001);
    expect(revokeAllClientSessions(database, identity.id, 40_002)).toBeGreaterThanOrEqual(2);
    expect(authenticateSession(database, config, bulkOne.token, 40_002)).toBeNull();
    expect(authenticateSession(database, config, bulkTwo.token, 40_002)).toBeNull();

    expect(sessionCookieOptions(config)).toEqual({
      httpOnly: true,
      maxAge: FROZEN_SESSION_LIFETIME_MS / 1_000,
      path: "/client",
      sameSite: "lax",
      secure: true,
    });
    expect(csrfCookieOptions(config)).toMatchObject({ httpOnly: false, sameSite: "lax", secure: true });
    expect(authFlowCookieOptions(config)).toMatchObject({
      httpOnly: true,
      maxAge: FROZEN_AUTH_FLOW_LIFETIME_MS / 1_000,
      sameSite: "lax",
      secure: true,
    });
    const developmentConfig = loadClientAuthConfig(
      environmentFor(databasePath, { NODE_ENV: "development" }),
    );
    expect(sessionCookieOptions(developmentConfig).secure).toBe(false);
    database.close();
  });

  it("binds CSRF auth flows to token, origin, source address, expiry, and one consumption", () => {
    const { config, database } = openCore(databasePath);
    const now = 50_000;
    const flow = createAuthFlow(
      database,
      config,
      { origin: APP_ORIGIN, sourceIp: "203.0.113.7" },
      now,
    );

    expect(Buffer.from(flow.token, "base64url")).toHaveLength(32);
    expect(Buffer.from(flow.csrfToken, "base64url")).toHaveLength(32);
    expect(AUTH_FLOW_LIFETIME_MS).toBe(FROZEN_AUTH_FLOW_LIFETIME_MS);
    expect(flow.expiresAt).toBe(now + FROZEN_AUTH_FLOW_LIFETIME_MS);

    const stored = database
      .prepare(
        "SELECT token_hash, csrf_hash, origin_hash, source_ip_hash, consumed_at FROM client_auth_flows WHERE token_hash = ?",
      )
      .get(keyedHash(config.sessionSecret, flow.token)) as Record<string, string | number | null>;
    expect(stored.token_hash).toBe(keyedHash(config.sessionSecret, flow.token));
    expect(stored.csrf_hash).toBe(keyedHash(config.sessionSecret, flow.csrfToken));
    expect(stored.origin_hash).toBe(keyedHash(config.sessionSecret, APP_ORIGIN));
    expect(stored.source_ip_hash).toBe(keyedHash(config.sessionSecret, "203.0.113.7"));
    expect(stored.token_hash).not.toBe(flow.token);
    expect(stored.csrf_hash).not.toBe(flow.csrfToken);
    expect(stored.consumed_at).toBeNull();

    expect(
      verifyAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        now + 1,
      ),
    ).toBe(true);

    const beforeInvalidProofs = readCoreState(database);
    expect(
      verifyAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: FORGED_CSRF_TOKEN,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        now + 1,
      ),
    ).toBe(false);
    expect(
      verifyAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.8",
        },
        now + 1,
      ),
    ).toBe(false);
    expect(
      verifyAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: "https://attacker.example",
          sourceIp: "203.0.113.7",
        },
        now + 1,
      ),
    ).toBe(false);
    expect(
      verifyAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        flow.expiresAt,
      ),
    ).toBe(false);
    expect(
      consumeAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: FORGED_CSRF_TOKEN,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        now + 1,
      ),
    ).toBe(false);
    expect(readCoreState(database)).toEqual(beforeInvalidProofs);

    expect(
      consumeAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        now + 2,
      ),
    ).toBe(true);
    expect(
      verifyAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        now + 3,
      ),
    ).toBe(false);

    const afterConsumption = readCoreState(database);
    expect(
      consumeAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "203.0.113.7",
        },
        now + 3,
      ),
    ).toBe(false);
    expect(readCoreState(database)).toEqual(afterConsumption);
    database.close();
  });

  it("stores a closed audit vocabulary without raw credentials, PII, or secrets", () => {
    const { config, database } = openCore(databasePath);
    const canonicalEmail = "audit-person@example.com";
    const identity = resolveEmailIdentity(database, canonicalEmail, 70_000);
    const session = issueSession(database, config, identity.id, 70_001);
    const flow = createAuthFlow(
      database,
      config,
      { origin: APP_ORIGIN, sourceIp: "198.51.100.9" },
      70_002,
    );
    expect(
      consumeAuthFlow(
        database,
        config,
        {
          token: flow.token,
          csrfToken: flow.csrfToken,
          origin: APP_ORIGIN,
          sourceIp: "198.51.100.9",
        },
        70_003,
      ),
    ).toBe(true);
    expect(revokeSession(database, config, session.token, 70_004)).toBe(true);

    const columns = (
      database.prepare("PRAGMA table_info(client_security_audit_events)").all() as Array<{ name: string }>
    ).map(({ name }) => name);
    expect(columns).toEqual(["id", "category", "identity_id", "occurred_at"]);

    const events = database
      .prepare(
        "SELECT id, category, identity_id, occurred_at FROM client_security_audit_events ORDER BY occurred_at, id",
      )
      .all() as Array<Record<string, string | number | null>>;
    expect(events.map(({ category }) => category)).toEqual([
      "auth.identity.created",
      "auth.session.issued",
      "auth.flow.created",
      "auth.flow.consumed",
      "auth.session.revoked",
    ]);
    const serializedEvents = JSON.stringify(events);
    for (const forbiddenValue of [
      canonicalEmail,
      session.token,
      session.csrfToken,
      flow.token,
      flow.csrfToken,
      SESSION_SECRET,
      APP_ORIGIN,
      "198.51.100.9",
      "password-sentinel",
      "otp-sentinel",
    ]) {
      expect(serializedEvents).not.toContain(forbiddenValue);
    }
    database.close();
  });

  it("fails before mutation when core configuration, storage, or proof input is invalid", () => {
    const incompleteEnvironment = environmentFor(databasePath);
    delete incompleteEnvironment.CLIENT_SESSION_SECRET;
    expect(() => loadClientAuthConfig(incompleteEnvironment)).toThrow(
      ClientAuthConfigurationError,
    );
    expect(existsSync(databasePath)).toBe(false);

    expect(() =>
      loadClientAuthConfig(environmentFor(databasePath, { CLIENT_IDENTITY_DB_PATH: "relative.db" })),
    ).toThrow(ClientAuthConfigurationError);
    expect(() =>
      loadClientAuthConfig(environmentFor(databasePath, { CLIENT_APP_ORIGIN: "javascript:alert(1)" })),
    ).toThrow(ClientAuthConfigurationError);
    expect(() =>
      loadClientAuthConfig(environmentFor(databasePath, { CLIENT_SESSION_SECRET: "too-short" })),
    ).toThrow(ClientAuthConfigurationError);
    expect(existsSync(databasePath)).toBe(false);

    const invalidDirectConfig = {
      appOrigin: APP_ORIGIN,
      databasePath,
      secureCookies: true,
      sessionSecret: "short",
    } as ClientAuthConfig;
    expect(() => openClientDatabase(invalidDirectConfig)).toThrow(ClientAuthConfigurationError);
    expect(existsSync(databasePath)).toBe(false);

    const absentParentPath = path.join(temporaryRoot, "absent", "identity.sqlite");
    const validConfig = loadClientAuthConfig(environmentFor(absentParentPath));
    expect(() => openClientDatabase(validConfig)).toThrow(/storage is unavailable/i);
    expect(existsSync(absentParentPath)).toBe(false);
    expect(existsSync(path.dirname(absentParentPath))).toBe(false);

    const { config, database } = openCore(databasePath);
    const identity = resolveEmailIdentity(database, "safe@example.com", 80_000);
    const beforeInvalidMutation = readCoreState(database);
    expect(() =>
      createAuthFlow(database, config, {
        origin: "https://attacker.example",
        sourceIp: "203.0.113.1",
      }),
    ).toThrow(/rejected/i);
    expect(() =>
      createAuthFlow(database, config, { origin: APP_ORIGIN, sourceIp: "not-an-ip-address" }),
    ).toThrow(/rejected/i);
    expect(() => issueSession(database, config, identity.id, Number.NaN)).toThrow(/rejected/i);
    expect(readCoreState(database)).toEqual(beforeInvalidMutation);

    database.close();
    expect(readFileSync(databasePath).byteLength).toBeGreaterThan(0);
  });
});
