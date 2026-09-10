import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const googleVerifyIdToken = vi.hoisted(() => vi.fn());
const argonInstrumentation = vi.hoisted(() => ({
  hashCalls: 0,
  verifyCalls: 0,
  verificationGate: null as (() => Promise<void>) | null,
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    constructor(readonly clientId: string) {}

    verifyIdToken(options: unknown) {
      return googleVerifyIdToken(options);
    }
  },
}));

vi.mock("argon2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("argon2")>();
  const implementation = (actual as unknown as { default: typeof actual }).default;
  return {
    ...actual,
    default: {
      ...implementation,
      async hash(
        password: Parameters<typeof implementation.hash>[0],
        options?: Parameters<typeof implementation.hash>[1],
      ) {
        argonInstrumentation.hashCalls += 1;
        return implementation.hash(password, options);
      },
      async verify(
        digest: Parameters<typeof implementation.verify>[0],
        password: Parameters<typeof implementation.verify>[1],
        options?: Parameters<typeof implementation.verify>[2],
      ) {
        argonInstrumentation.verifyCalls += 1;
        const result = await implementation.verify(digest, password, options);
        const gate = argonInstrumentation.verificationGate;
        if (gate) await gate();
        return result;
      },
    },
  };
});

import {
  createTestGoogleCredential,
  deliverOtp,
  verifyGoogleCredential,
} from "../../lib/client-auth/adapters";
import {
  ClientAuthConfigurationError,
  loadClientAuthenticationConfig,
} from "../../lib/client-auth/config";
import {
  authenticateGoogle,
  authenticatePassword,
  OTP_LIFETIME_MS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_RATE_WINDOW_MS,
  OTP_RESEND_MS,
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
  requestEmailOtp,
  setPasswordCredential,
  verifyEmailOtp,
} from "../../lib/client-auth/service";
import {
  resolveEmailIdentity,
} from "../../lib/client-identity";
import {
  openClientAuthenticationDatabase,
  type ClientDatabase,
} from "../../lib/client-identity/database";
import {
  authenticateSession,
  SESSION_LIFETIME_MS,
} from "../../lib/client-session";

const APP_ORIGIN = "https://client.test";
const GOOGLE_CLIENT_ID = "client-authentication-test.apps.googleusercontent.com";
const OTP_CODE = "617204";
const OTP_SECRET = "otp-secret-with-at-least-thirty-two-bytes";
const SESSION_SECRET = "session-secret-with-at-least-thirty-two-bytes";
const EXACT_MIGRATION_001_SHA256 = "9021589d64df98a049606d02a126c856a1e84b6591e637b23189f56fe28c7262";
const EXACT_AUDIT_CATEGORIES = [
  "auth.flow.consumed",
  "auth.flow.created",
  "auth.google.succeeded",
  "auth.identity.created",
  "auth.otp.delivery_failed",
  "auth.otp.requested",
  "auth.otp.succeeded",
  "auth.password.changed",
  "auth.password.succeeded",
  "auth.session.issued",
  "auth.session.revoked",
  "auth.session.rotated",
  "auth.sessions.revoked",
] as const;

let temporaryRoot: string;
let environment: NodeJS.ProcessEnv;

function testEnvironment(databasePath: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    CLIENT_AUTH_TEST_GOOGLE_ADAPTER: "1",
    CLIENT_AUTH_TEST_EMAIL_ADAPTER: "1",
    CLIENT_AUTH_TEST_OTP_CODE: OTP_CODE,
    CLIENT_GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
    CLIENT_IDENTITY_DB_PATH: databasePath,
    CLIENT_APP_ORIGIN: APP_ORIGIN,
    CLIENT_OTP_SECRET: OTP_SECRET,
    CLIENT_SESSION_SECRET: SESSION_SECRET,
  };
}

function openAuthenticationDatabase(
  selectedEnvironment: NodeJS.ProcessEnv = environment,
): ClientDatabase {
  return openClientAuthenticationDatabase(
    loadClientAuthenticationConfig(selectedEnvironment),
  );
}

function rows(database: ClientDatabase, table: string): unknown[] {
  return database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
}

function databaseState(selectedEnvironment: NodeJS.ProcessEnv = environment): string {
  const database = openAuthenticationDatabase(selectedEnvironment);
  try {
    return JSON.stringify({
      identities: rows(database, "client_identities"),
      verifications: rows(database, "client_identity_verifications"),
      external: rows(database, "client_external_identities"),
      passwords: rows(database, "client_password_credentials"),
      challenges: rows(database, "client_otp_challenges"),
      sends: rows(database, "client_otp_send_events"),
      sessions: rows(database, "client_sessions"),
      audit: rows(database, "client_security_audit_events"),
    });
  } finally {
    database.close();
  }
}

function count(database: ClientDatabase, table: string): number {
  return (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

function testGoogleCredential(
  input: Parameters<typeof createTestGoogleCredential>[0],
  now: number,
  selectedEnvironment: NodeJS.ProcessEnv = environment,
): string {
  return createTestGoogleCredential(input, selectedEnvironment, now);
}

function expectedDomainHash(domain: string, ...values: string[]): string {
  const framed = values.map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`);
  return createHmac("sha256", OTP_SECRET)
    .update([domain, ...framed].join("\0"))
    .digest("base64url");
}

function resetArgonInstrumentation(): void {
  argonInstrumentation.hashCalls = 0;
  argonInstrumentation.verifyCalls = 0;
  argonInstrumentation.verificationGate = null;
}

function argonWork(): { hashCalls: number; verifyCalls: number } {
  return {
    hashCalls: argonInstrumentation.hashCalls,
    verifyCalls: argonInstrumentation.verifyCalls,
  };
}

beforeEach(() => {
  temporaryRoot = mkdtempSync(path.join(tmpdir(), "client-authentication-"));
  environment = testEnvironment(path.join(temporaryRoot, "identity.sqlite"));
  googleVerifyIdToken.mockReset();
  resetArgonInstrumentation();
});

afterEach(() => {
  resetArgonInstrumentation();
  vi.unstubAllGlobals();
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("authentication identity convergence and persistence", () => {
  it("keeps the fixed authentication-method limits at the approved values", () => {
    expect({
      otpLifetimeMs: OTP_LIFETIME_MS,
      otpMaximumAttempts: OTP_MAX_ATTEMPTS,
      otpMaximumSendsPerWindow: OTP_MAX_SENDS_PER_WINDOW,
      otpRateWindowMs: OTP_RATE_WINDOW_MS,
      otpResendMs: OTP_RESEND_MS,
      passwordMaximumLength: PASSWORD_MAXIMUM_LENGTH,
      passwordMinimumLength: PASSWORD_MINIMUM_LENGTH,
    }).toEqual({
      otpLifetimeMs: 600_000,
      otpMaximumAttempts: 5,
      otpMaximumSendsPerWindow: 5,
      otpRateWindowMs: 3_600_000,
      otpResendMs: 60_000,
      passwordMaximumLength: 128,
      passwordMinimumLength: 12,
    });
  });

  it("resolves OTP, verified Google, and password credentials to one immutable identity and valid sessions", async () => {
    const now = Date.UTC(2026, 8, 10, 12);
    expect(await requestEmailOtp({
      email: "  Owne\u0301r@Example.COM  ",
      sourceIp: "203.0.113.10",
      now,
    }, environment)).toEqual({ accepted: true });

    const otp = verifyEmailOtp({
      email: "OWNÉR@example.com",
      code: OTP_CODE,
      sourceIp: "203.0.113.10",
      now: now + 1,
    }, environment);
    expect(otp).not.toBeNull();

    const googleCredential = testGoogleCredential({
      subject: "google-owner-1",
      email: "ownér@EXAMPLE.com",
      emailVerified: true,
    }, now + 2);
    const google = await authenticateGoogle({
      credential: googleCredential,
      now: now + 2,
    }, environment);
    expect(google?.clientId).toBe(otp?.clientId);

    const replacement = await setPasswordCredential({
      clientId: otp!.clientId,
      password: "a secure owner password",
      now: now + 3,
    }, environment);
    const password = await authenticatePassword({
      email: "  OWNÉR@example.com ",
      password: "a secure owner password",
      now: now + 4,
    }, environment);
    expect(password?.clientId).toBe(otp?.clientId);
    expect(replacement.clientId).toBe(otp?.clientId);

    const config = loadClientAuthenticationConfig(environment);
    const database = openAuthenticationDatabase();
    try {
      expect(count(database, "client_identities")).toBe(1);
      expect(database.prepare(
        "SELECT version, COUNT(*) AS count FROM client_schema_migrations GROUP BY version ORDER BY version",
      ).all()).toEqual([
        { version: 1, count: 1 },
        { version: 2, count: 1 },
      ]);
      expect(authenticateSession(database, config, otp!.session.token, now + 4)).toBeNull();
      expect(authenticateSession(database, config, google!.session.token, now + 4)).toBeNull();
      expect(authenticateSession(database, config, replacement.token, now + 4)?.clientId)
        .toBe(otp!.clientId);
      expect(authenticateSession(database, config, password!.session.token, now + 4)?.clientId)
        .toBe(otp!.clientId);
      expect(password!.session.expiresAt - password!.session.createdAt).toBe(SESSION_LIFETIME_MS);

      const storedPassword = database.prepare(
        "SELECT password_hash FROM client_password_credentials",
      ).get() as { password_hash: string };
      expect(storedPassword.password_hash).toMatch(/^\$argon2id\$v=19\$/);
      expect(storedPassword.password_hash.split("$")[3]?.split(",").sort()).toEqual([
        "m=65536",
        "p=1",
        "t=3",
      ]);
      expect(storedPassword.password_hash).not.toContain("a secure owner password");

      const challenge = database.prepare(
        `SELECT id, canonical_email_hash, source_ip_hash, code_hash
         FROM client_otp_challenges`,
      ).get() as {
        id: string;
        canonical_email_hash: string;
        source_ip_hash: string;
        code_hash: string;
      };
      expect(challenge.canonical_email_hash).toBe(
        expectedDomainHash("otp-email-rate", "ownér@example.com"),
      );
      expect(challenge.source_ip_hash).toBe(
        expectedDomainHash("otp-ip-rate", "203.0.113.10"),
      );
      expect(challenge.code_hash).toBe(expectedDomainHash(
        "otp-code",
        "ownér@example.com",
        challenge.id,
        "203.0.113.10",
        OTP_CODE,
      ));
      expect(Object.keys(challenge).sort()).toEqual([
        "canonical_email_hash",
        "code_hash",
        "id",
        "source_ip_hash",
      ]);

      const external = database.prepare(
        "SELECT provider, provider_subject, client_id FROM client_external_identities",
      ).get() as Record<string, string>;
      expect(external).toEqual({
        provider: "google",
        provider_subject: "google-owner-1",
        client_id: otp!.clientId,
      });
      expect(() => database.prepare(
        "UPDATE client_external_identities SET provider_subject = ? WHERE client_id = ?",
      ).run("replacement-subject", otp!.clientId)).toThrow(/immutable/i);
      expect(() => database.prepare(
        "DELETE FROM client_external_identities WHERE client_id = ?",
      ).run(otp!.clientId)).toThrow(/immutable/i);
      expect(() => database.prepare(
        "UPDATE client_identities SET canonical_email = ? WHERE id = ?",
      ).run("replacement@example.com", otp!.clientId)).toThrow(/immutable/i);

      const session = database.prepare(
        "SELECT token_hash, csrf_hash FROM client_sessions WHERE id = ?",
      ).get(password!.session.id) as { token_hash: string; csrf_hash: string };
      expect(session.token_hash).not.toBe(password!.session.token);
      expect(session.csrf_hash).not.toBe(password!.session.csrfToken);

      const auditColumns = database.prepare(
        "PRAGMA table_info(client_security_audit_events)",
      ).all() as Array<{ name: string }>;
      expect(auditColumns.map(({ name }) => name)).toEqual([
        "id",
        "category",
        "identity_id",
        "occurred_at",
      ]);
      const audit = JSON.stringify(rows(database, "client_security_audit_events"));
      for (const secret of [
        "ownér@example.com",
        "203.0.113.10",
        OTP_CODE,
        OTP_SECRET,
        SESSION_SECRET,
        googleCredential,
        "google-owner-1",
        "a secure owner password",
        password!.session.token,
        password!.session.csrfToken,
      ]) {
        expect(audit).not.toContain(secret);
      }
    } finally {
      database.close();
    }

    const reopened = openAuthenticationDatabase();
    try {
      expect(reopened.prepare(
        "SELECT version, COUNT(*) AS count FROM client_schema_migrations GROUP BY version ORDER BY version",
      ).all()).toEqual([
        { version: 1, count: 1 },
        { version: 2, count: 1 },
      ]);
    } finally {
      reopened.close();
    }
  });

  it("keeps migration 001 byte-identical and exposes only the exact expanded audit vocabulary", () => {
    const migration001 = readFileSync(
      path.join(process.cwd(), "db/client-identity/001_initial.sql"),
    );
    expect(createHash("sha256").update(migration001).digest("hex"))
      .toBe(EXACT_MIGRATION_001_SHA256);

    const database = openAuthenticationDatabase();
    try {
      const table = database.prepare(
        "SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'client_security_audit_events'",
      ).get() as { sql: string };
      const categories = [...table.sql.matchAll(/'(auth\.[a-z._]+)'/gu)]
        .map((match) => match[1])
        .sort();
      expect(categories).toEqual([...EXACT_AUDIT_CATEGORIES].sort());
    } finally {
      database.close();
    }
  });
});

describe("Google credential refusals and adapter boundary", () => {
  it("rejects unverified, invalid-claim, changed-email, and duplicate-subject identities without mutation", async () => {
    const now = Date.UTC(2026, 8, 10, 13);
    const initiallyEmpty = databaseState();
    const invalidCredentials = [
      testGoogleCredential({
        subject: "unverified",
        email: "owner@example.com",
        emailVerified: false,
      }, now),
      testGoogleCredential({
        subject: "bad-issuer",
        email: "owner@example.com",
        emailVerified: true,
        issuer: "https://example.com",
      }, now),
      testGoogleCredential({
        subject: "bad-audience",
        email: "owner@example.com",
        emailVerified: true,
        audience: "different-client",
      }, now),
      testGoogleCredential({
        subject: "expired",
        email: "owner@example.com",
        emailVerified: true,
        expiresAt: Math.floor(now / 1_000),
      }, now),
      "not-a-google-credential",
    ];
    for (const credential of invalidCredentials) {
      expect(await authenticateGoogle({ credential, now }, environment)).toBeNull();
      expect(databaseState()).toBe(initiallyEmpty);
    }

    const first = await authenticateGoogle({
      credential: testGoogleCredential({
        subject: "google-owner",
        email: "owner@example.com",
        emailVerified: true,
      }, now),
      now,
    }, environment);
    expect(first).not.toBeNull();
    const afterFirst = databaseState();

    expect(await authenticateGoogle({
      credential: testGoogleCredential({
        subject: "google-owner",
        email: "changed@example.com",
        emailVerified: true,
      }, now + 1),
      now: now + 1,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(afterFirst);

    expect(await authenticateGoogle({
      credential: testGoogleCredential({
        subject: "second-google-subject",
        email: "OWNER@example.com",
        emailVerified: true,
      }, now + 2),
      now: now + 2,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(afterFirst);
  });

  it("uses verifyIdToken in production mode and independently rejects invalid returned claims", async () => {
    const now = Date.UTC(2026, 8, 10, 14);
    const productionGoogleEnvironment = { ...environment };
    delete productionGoogleEnvironment.CLIENT_AUTH_TEST_GOOGLE_ADAPTER;
    const validClaims = {
      iss: "accounts.google.com",
      aud: GOOGLE_CLIENT_ID,
      exp: Math.floor(now / 1_000) + 300,
      sub: "production-google-subject",
      email: "production@example.com",
      email_verified: true,
    };
    googleVerifyIdToken.mockResolvedValueOnce({ getPayload: () => validClaims });
    const authenticated = await authenticateGoogle({
      credential: "signed-google-id-token",
      now,
    }, productionGoogleEnvironment);
    expect(authenticated).not.toBeNull();
    expect(googleVerifyIdToken).toHaveBeenCalledWith({
      idToken: "signed-google-id-token",
      audience: GOOGLE_CLIENT_ID,
    });

    const beforeInvalidPayload = databaseState(productionGoogleEnvironment);
    googleVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ ...validClaims, email_verified: false }),
    });
    expect(await authenticateGoogle({
      credential: "another-signed-token",
      now,
    }, productionGoogleEnvironment)).toBeNull();
    expect(databaseState(productionGoogleEnvironment)).toBe(beforeInvalidPayload);
  });

  it("makes each test adapter impossible outside its explicit test-mode gate", async () => {
    const now = Date.UTC(2026, 8, 10, 15);
    const config = loadClientAuthenticationConfig(environment);
    const credential = testGoogleCredential({
      subject: "test-boundary",
      email: "boundary@example.com",
      emailVerified: true,
    }, now);
    const outsideTest = { ...environment, NODE_ENV: "production" };
    expect(() => createTestGoogleCredential({
      subject: "test-boundary",
      email: "boundary@example.com",
      emailVerified: true,
    }, outsideTest, now)).toThrow(/unavailable/i);
    await expect(verifyGoogleCredential(config, credential, now, outsideTest)).rejects
      .toThrow(/failed/i);
    await expect(deliverOtp(config, "boundary@example.com", OTP_CODE, outsideTest)).rejects
      .toThrow(/failed/i);
    expect(() => loadClientAuthenticationConfig(outsideTest))
      .toThrow(ClientAuthConfigurationError);
  });
});

describe("OTP refusal, throttling, and delivery controls", () => {
  it("rejects invalid source addresses, invalid codes, exhaustion, expiry, replay, and early resend", async () => {
    const now = 2_000_000;
    const initial = databaseState();
    for (const sourceIp of ["", "unknown", "203.0.113.1, 198.51.100.2", "203.0.113.1 ", "999.1.1.1"]) {
      expect(await requestEmailOtp({
        email: "invalid-ip@example.com",
        sourceIp,
        now,
      }, environment)).toEqual({ accepted: true });
      expect(databaseState()).toBe(initial);
    }

    await requestEmailOtp({ email: "attempts@example.com", sourceIp: "198.51.100.9", now }, environment);
    const beforeEarlyResend = databaseState();
    expect(await requestEmailOtp({
      email: "ATTEMPTS@example.com",
      sourceIp: "198.51.100.9",
      now: now + OTP_RESEND_MS - 1,
    }, environment)).toEqual({ accepted: true });
    expect(databaseState()).toBe(beforeEarlyResend);
    expect(verifyEmailOtp({
      email: "attempts@example.com",
      code: OTP_CODE,
      sourceIp: "198.51.100.10",
      now: now + 1,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(beforeEarlyResend);
    expect(verifyEmailOtp({
      email: "attempts@example.com",
      code: "12345",
      sourceIp: "198.51.100.9",
      now: now + 1,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(beforeEarlyResend);

    for (let attempt = 0; attempt < OTP_MAX_ATTEMPTS; attempt += 1) {
      expect(verifyEmailOtp({
        email: "attempts@example.com",
        code: "000000",
        sourceIp: "198.51.100.9",
        now: now + attempt + 1,
      }, environment)).toBeNull();
    }
    expect(verifyEmailOtp({
      email: "attempts@example.com",
      code: OTP_CODE,
      sourceIp: "198.51.100.9",
      now: now + 10,
    }, environment)).toBeNull();

    await requestEmailOtp({ email: "expired@example.com", sourceIp: "198.51.100.20", now }, environment);
    expect(verifyEmailOtp({
      email: "expired@example.com",
      code: OTP_CODE,
      sourceIp: "198.51.100.20",
      now: now + OTP_LIFETIME_MS,
    }, environment)).toBeNull();

    await requestEmailOtp({ email: "replay@example.com", sourceIp: "198.51.100.21", now }, environment);
    const accepted = verifyEmailOtp({
      email: "replay@example.com",
      code: OTP_CODE,
      sourceIp: "198.51.100.21",
      now: now + 1,
    }, environment);
    expect(accepted).not.toBeNull();
    const afterSuccess = databaseState();
    expect(verifyEmailOtp({
      email: "replay@example.com",
      code: OTP_CODE,
      sourceIp: "198.51.100.21",
      now: now + 2,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(afterSuccess);

    const database = openAuthenticationDatabase();
    try {
      expect(count(database, "client_identities")).toBe(1);
      expect(count(database, "client_sessions")).toBe(1);
      const exhausted = database.prepare(
        `SELECT attempts_remaining, consumed_at FROM client_otp_challenges
         WHERE canonical_email_hash = ?`,
      ).get(expectedDomainHash("otp-email-rate", "attempts@example.com")) as {
        attempts_remaining: number;
        consumed_at: number | null;
      };
      expect(exhausted.attempts_remaining).toBe(0);
      expect(exhausted.consumed_at).not.toBeNull();
    } finally {
      database.close();
    }
  });

  it("consumes prior challenges on permitted resend and enforces email and IP rolling-hour limits independently", async () => {
    const now = 4_000_000;
    await requestEmailOtp({ email: "resend@example.com", sourceIp: "192.0.2.1", now }, environment);
    await requestEmailOtp({
      email: "RESEND@example.com",
      sourceIp: "192.0.2.1",
      now: now + OTP_RESEND_MS,
    }, environment);
    let database = openAuthenticationDatabase();
    try {
      const challenges = database.prepare(
        `SELECT consumed_at FROM client_otp_challenges
         WHERE canonical_email_hash = ? ORDER BY created_at`,
      ).all(expectedDomainHash("otp-email-rate", "resend@example.com")) as Array<{
        consumed_at: number | null;
      }>;
      expect(challenges).toEqual([
        { consumed_at: now + OTP_RESEND_MS },
        { consumed_at: null },
      ]);
    } finally {
      database.close();
    }

    for (let send = 0; send < OTP_MAX_SENDS_PER_WINDOW; send += 1) {
      await requestEmailOtp({
        email: "email-rate@example.com",
        sourceIp: `198.51.100.${send + 1}`,
        now: now + send * (OTP_RESEND_MS + 1),
      }, environment);
    }
    database = openAuthenticationDatabase();
    const sendsBeforeEmailLimit = count(database, "client_otp_send_events");
    database.close();
    expect(await requestEmailOtp({
      email: "EMAIL-RATE@example.com",
      sourceIp: "198.51.100.100",
      now: now + OTP_MAX_SENDS_PER_WINDOW * (OTP_RESEND_MS + 1),
    }, environment)).toEqual({ accepted: true });
    database = openAuthenticationDatabase();
    expect(count(database, "client_otp_send_events")).toBe(sendsBeforeEmailLimit);
    database.close();

    const ipRateStart = now + OTP_RATE_WINDOW_MS + 1;
    for (let send = 0; send < OTP_MAX_SENDS_PER_WINDOW; send += 1) {
      await requestEmailOtp({
        email: `ip-rate-${send}@example.com`,
        sourceIp: "203.0.113.200",
        now: ipRateStart + send,
      }, environment);
    }
    database = openAuthenticationDatabase();
    const sendsBeforeIpLimit = count(database, "client_otp_send_events");
    database.close();
    expect(await requestEmailOtp({
      email: "ip-rate-blocked@example.com",
      sourceIp: "203.0.113.200",
      now: ipRateStart + OTP_MAX_SENDS_PER_WINDOW,
    }, environment)).toEqual({ accepted: true });
    database = openAuthenticationDatabase();
    expect(count(database, "client_otp_send_events")).toBe(sendsBeforeIpLimit);
    database.close();
  });

  it("binds equivalent IPv6 spellings to one challenge source and one rolling-hour limit", async () => {
    const now = 5_000_000;
    const compactIpv6 = "2001:db8::1";
    const expandedIpv6 = "2001:0db8:0:0:0:0:0:1";

    await requestEmailOtp({
      email: "ipv6-continuity@example.com",
      sourceIp: compactIpv6,
      now,
    }, environment);
    expect(verifyEmailOtp({
      email: "ipv6-continuity@example.com",
      code: OTP_CODE,
      sourceIp: expandedIpv6,
      now: now + 1,
    }, environment)).not.toBeNull();

    for (let send = 1; send < OTP_MAX_SENDS_PER_WINDOW; send += 1) {
      await requestEmailOtp({
        email: `ipv6-rate-${send}@example.com`,
        sourceIp: send % 2 === 0 ? compactIpv6 : expandedIpv6,
        now: now + send + 1,
      }, environment);
    }

    let database = openAuthenticationDatabase();
    const sendsAtLimit = count(database, "client_otp_send_events");
    expect(database.prepare(
      "SELECT COUNT(DISTINCT source_ip_hash) AS count FROM client_otp_send_events",
    ).get()).toEqual({ count: 1 });
    expect(database.prepare(
      "SELECT source_ip_hash FROM client_otp_send_events LIMIT 1",
    ).get()).toEqual({
      source_ip_hash: expectedDomainHash("otp-ip-rate", compactIpv6),
    });
    database.close();

    expect(await requestEmailOtp({
      email: "ipv6-rate-blocked@example.com",
      sourceIp: expandedIpv6,
      now: now + OTP_MAX_SENDS_PER_WINDOW + 1,
    }, environment)).toEqual({ accepted: true });
    database = openAuthenticationDatabase();
    expect(count(database, "client_otp_send_events")).toBe(sendsAtLimit);
    database.close();
  });

  it("returns the neutral accepted response and atomically consumes a challenge when delivery is unavailable", async () => {
    const productionEmailEnvironment = { ...environment };
    delete productionEmailEnvironment.CLIENT_AUTH_TEST_EMAIL_ADAPTER;
    delete productionEmailEnvironment.CLIENT_AUTH_TEST_OTP_CODE;
    Object.assign(productionEmailEnvironment, {
      CLIENT_EMAIL_ENDPOINT: "https://mailer.example.test/v1/send",
      CLIENT_EMAIL_API_KEY: "mailer-api-key",
      CLIENT_EMAIL_FROM: "security@example.test",
    });
    const delivery = vi.fn().mockRejectedValue(new Error("delivery unavailable"));
    vi.stubGlobal("fetch", delivery);

    expect(await requestEmailOtp({
      email: "delivery@example.com",
      sourceIp: "192.0.2.44",
      now: 6_000_000,
    }, productionEmailEnvironment)).toEqual({ accepted: true });
    expect(delivery).toHaveBeenCalledOnce();

    const database = openAuthenticationDatabase(productionEmailEnvironment);
    try {
      expect(count(database, "client_identities")).toBe(0);
      expect(count(database, "client_sessions")).toBe(0);
      const challenge = database.prepare(
        "SELECT consumed_at FROM client_otp_challenges",
      ).get() as { consumed_at: number | null };
      expect(challenge.consumed_at).toBe(6_000_000);
      expect(database.prepare(
        "SELECT category FROM client_security_audit_events ORDER BY occurred_at, rowid",
      ).all()).toEqual([
        { category: "auth.otp.requested" },
        { category: "auth.otp.delivery_failed" },
      ]);
    } finally {
      database.close();
    }
  });
});

describe("password and configuration refusals", () => {
  it("permits enrollment only for a verified identity and leaves failures mutation-free", async () => {
    const now = 8_000_000;
    let database = openAuthenticationDatabase();
    const unverified = resolveEmailIdentity(database, "unverified@example.com", now);
    database.close();
    const beforeUnverifiedEnrollment = databaseState();
    await expect(setPasswordCredential({
      clientId: unverified.id,
      password: "a valid but forbidden password",
      now,
    }, environment)).rejects.toThrow(/rejected/i);
    expect(databaseState()).toBe(beforeUnverifiedEnrollment);

    await requestEmailOtp({ email: "verified@example.com", sourceIp: "203.0.113.80", now }, environment);
    const verified = verifyEmailOtp({
      email: "verified@example.com",
      code: OTP_CODE,
      sourceIp: "203.0.113.80",
      now: now + 1,
    }, environment)!;
    const beforeWeakPasswords = databaseState();
    for (const password of [
      "x".repeat(PASSWORD_MINIMUM_LENGTH - 1),
      "x".repeat(PASSWORD_MAXIMUM_LENGTH + 1),
    ]) {
      await expect(setPasswordCredential({
        clientId: verified.clientId,
        password,
        now: now + 2,
      }, environment)).rejects.toThrow(/rejected/i);
      expect(databaseState()).toBe(beforeWeakPasswords);
    }

    const replacement = await setPasswordCredential({
      clientId: verified.clientId,
      password: "correct horse battery staple",
      now: now + 3,
    }, environment);
    database = openAuthenticationDatabase();
    const config = loadClientAuthenticationConfig(environment);
    try {
      expect(authenticateSession(database, config, verified.session.token, now + 3)).toBeNull();
      expect(authenticateSession(database, config, replacement.token, now + 3)).not.toBeNull();
    } finally {
      database.close();
    }

    const beforeFailedLogins = databaseState();
    expect(await authenticatePassword({
      email: "verified@example.com",
      password: "wrong password that is long enough",
      now: now + 4,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(beforeFailedLogins);
    expect(await authenticatePassword({
      email: "unknown@example.com",
      password: "wrong password that is long enough",
      now: now + 4,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(beforeFailedLogins);
    expect(await authenticatePassword({
      email: "not-an-email",
      password: "wrong password that is long enough",
      now: now + 4,
    }, environment)).toBeNull();
    expect(databaseState()).toBe(beforeFailedLogins);
  });

  it("refuses an obsolete password when its credential changes during verification", async () => {
    const now = 9_000_000;
    await requestEmailOtp({
      email: "password-race@example.com",
      sourceIp: "203.0.113.90",
      now,
    }, environment);
    const verified = verifyEmailOtp({
      email: "password-race@example.com",
      code: OTP_CODE,
      sourceIp: "203.0.113.90",
      now: now + 1,
    }, environment)!;
    await setPasswordCredential({
      clientId: verified.clientId,
      password: "original password value",
      now: now + 2,
    }, environment);

    let releaseVerification!: () => void;
    const verificationRelease = new Promise<void>((resolve) => {
      releaseVerification = resolve;
    });
    let markVerificationComplete!: () => void;
    const verificationComplete = new Promise<void>((resolve) => {
      markVerificationComplete = resolve;
    });
    argonInstrumentation.verificationGate = async () => {
      markVerificationComplete();
      await verificationRelease;
    };

    const obsoleteLogin = authenticatePassword({
      email: "password-race@example.com",
      password: "original password value",
      now: now + 3,
    }, environment);
    await verificationComplete;
    const replacement = await setPasswordCredential({
      clientId: verified.clientId,
      password: "replacement password value",
      now: now + 4,
    }, environment);
    argonInstrumentation.verificationGate = null;
    releaseVerification();

    expect(await obsoleteLogin).toBeNull();
    expect(await authenticatePassword({
      email: "password-race@example.com",
      password: "replacement password value",
      now: now + 5,
    }, environment)).toMatchObject({ clientId: verified.clientId });

    const database = openAuthenticationDatabase();
    try {
      expect(authenticateSession(database, loadClientAuthenticationConfig(environment), replacement.token, now + 5))
        .toMatchObject({ clientId: verified.clientId });
      expect(database.prepare(
        "SELECT COUNT(*) AS count FROM client_sessions WHERE revoked_at IS NULL AND expires_at > ?",
      ).get(now + 5)).toEqual({ count: 2 });
    } finally {
      database.close();
    }
  });

  it("performs equal cold and warm Argon2 work for known and unknown wrong-password checks", async () => {
    const now = 10_000_000;
    await requestEmailOtp({
      email: "argon-work@example.com",
      sourceIp: "203.0.113.100",
      now,
    }, environment);
    const verified = verifyEmailOtp({
      email: "argon-work@example.com",
      code: OTP_CODE,
      sourceIp: "203.0.113.100",
      now: now + 1,
    }, environment)!;
    await setPasswordCredential({
      clientId: verified.clientId,
      password: "known account password",
      now: now + 2,
    }, environment);

    vi.resetModules();
    const coldKnownService = await import("../../lib/client-auth/service.js");
    resetArgonInstrumentation();
    expect(await coldKnownService.authenticatePassword({
      email: "argon-work@example.com",
      password: "wrong password value",
      now: now + 3,
    }, environment)).toBeNull();
    const coldKnownWork = argonWork();

    vi.resetModules();
    const coldUnknownService = await import("../../lib/client-auth/service.js");
    resetArgonInstrumentation();
    expect(await coldUnknownService.authenticatePassword({
      email: "unknown-argon-work@example.com",
      password: "wrong password value",
      now: now + 4,
    }, environment)).toBeNull();
    const coldUnknownWork = argonWork();
    expect(coldKnownWork).toEqual({ hashCalls: 1, verifyCalls: 1 });
    expect(coldUnknownWork).toEqual(coldKnownWork);

    resetArgonInstrumentation();
    expect(await coldUnknownService.authenticatePassword({
      email: "argon-work@example.com",
      password: "wrong password value",
      now: now + 5,
    }, environment)).toBeNull();
    const warmKnownWork = argonWork();
    resetArgonInstrumentation();
    expect(await coldUnknownService.authenticatePassword({
      email: "another-unknown-argon-work@example.com",
      password: "wrong password value",
      now: now + 6,
    }, environment)).toBeNull();
    const warmUnknownWork = argonWork();
    expect(warmKnownWork).toEqual({ hashCalls: 0, verifyCalls: 1 });
    expect(warmUnknownWork).toEqual(warmKnownWork);
  });

  it("fails closed before storage mutation for missing or invalid authentication configuration", () => {
    const databasePath = environment.CLIENT_IDENTITY_DB_PATH!;
    expect(existsSync(databasePath)).toBe(false);
    for (const name of [
      "CLIENT_IDENTITY_DB_PATH",
      "CLIENT_APP_ORIGIN",
      "CLIENT_SESSION_SECRET",
      "CLIENT_OTP_SECRET",
      "CLIENT_GOOGLE_CLIENT_ID",
      "CLIENT_AUTH_TEST_OTP_CODE",
    ]) {
      const missing = { ...environment };
      delete missing[name];
      expect(() => loadClientAuthenticationConfig(missing))
        .toThrow(ClientAuthConfigurationError);
      expect(existsSync(databasePath)).toBe(false);
    }

    const missingEmailAdapter = { ...environment };
    delete missingEmailAdapter.CLIENT_AUTH_TEST_EMAIL_ADAPTER;
    expect(() => loadClientAuthenticationConfig(missingEmailAdapter))
      .toThrow(ClientAuthConfigurationError);
    expect(existsSync(databasePath)).toBe(false);

    const invalidProductionEmail = {
      ...missingEmailAdapter,
      CLIENT_EMAIL_ENDPOINT: "http://mailer.example.test/send#credential",
      CLIENT_EMAIL_API_KEY: "key",
      CLIENT_EMAIL_FROM: "not-an-email",
    };
    expect(() => loadClientAuthenticationConfig(invalidProductionEmail))
      .toThrow(ClientAuthConfigurationError);
    expect(existsSync(databasePath)).toBe(false);

    for (const flag of [
      "CLIENT_AUTH_TEST_GOOGLE_ADAPTER",
      "CLIENT_AUTH_TEST_EMAIL_ADAPTER",
    ]) {
      expect(() => loadClientAuthenticationConfig({
        ...environment,
        NODE_ENV: "production",
        [flag]: "1",
      })).toThrow(ClientAuthConfigurationError);
      expect(() => loadClientAuthenticationConfig({
        ...environment,
        [flag]: "0",
      })).toThrow(ClientAuthConfigurationError);
    }
    expect(existsSync(databasePath)).toBe(false);
  });
});
