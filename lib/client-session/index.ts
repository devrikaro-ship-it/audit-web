import "server-only";

import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import {
  assertClientAuthConfig,
  type ClientAuthConfig,
} from "../client-auth/config";
import {
  isOpaqueToken,
  keyedHash,
  opaqueToken,
  safeEqual,
} from "../client-auth/crypto";
import { recordSecurityAuditEvent } from "../client-identity/audit";
import type { ClientDatabase } from "../client-identity/database";
import { inImmediateTransaction } from "../client-identity/database";

export const CLIENT_SESSION_COOKIE = "client_session";
export const CLIENT_CSRF_COOKIE = "client_csrf";
export const CLIENT_AUTH_FLOW_COOKIE = "client_auth_flow";
export const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
export const SESSION_ROTATION_MS = 12 * 60 * 60 * 1_000;
export const AUTH_FLOW_LIFETIME_MS = 10 * 60 * 1_000;

export type ClientSession = Readonly<{
  id: string;
  clientId: string;
  createdAt: number;
  rotatedAt: number;
  expiresAt: number;
}>;

export type IssuedSession = ClientSession & Readonly<{
  token: string;
  csrfToken: string;
}>;

export type AuthFlowBinding = Readonly<{
  origin: string;
  sourceIp: string;
}>;

export type AuthFlowProof = AuthFlowBinding & Readonly<{
  token?: string;
  csrfToken?: string;
}>;

type SessionRow = {
  id: string;
  client_id: string;
  created_at: number;
  rotated_at: number;
  expires_at: number;
  revoked_at: number | null;
};

type AuthFlowRow = {
  csrf_hash: string;
  origin_hash: string;
  source_ip_hash: string;
};

function assertTimestamp(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Authentication operation rejected");
}

function validTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function assertIdentityId(value: string): void {
  if (!value || value.length > 128) throw new Error("Authentication operation rejected");
}

function normalizedSourceIp(value: string): string | null {
  const normalized = value.trim();
  return normalized.length <= 128 && isIP(normalized) !== 0 ? normalized : null;
}

function matchingOrigin(config: ClientAuthConfig, value: string): string | null {
  if (value !== config.appOrigin) return null;
  try {
    const parsed = new URL(value);
    return parsed.origin === value ? parsed.origin : null;
  } catch {
    return null;
  }
}

function insertSession(
  database: ClientDatabase,
  config: ClientAuthConfig,
  clientId: string,
  now: number,
): IssuedSession {
  const token = opaqueToken();
  const csrfToken = opaqueToken();
  const session: ClientSession = {
    id: randomUUID(),
    clientId,
    createdAt: now,
    rotatedAt: now,
    expiresAt: now + SESSION_LIFETIME_MS,
  };
  database.prepare(
    `INSERT INTO client_sessions(id, client_id, token_hash, csrf_hash, created_at, rotated_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    session.id,
    session.clientId,
    keyedHash(config.sessionSecret, token),
    keyedHash(config.sessionSecret, csrfToken),
    session.createdAt,
    session.rotatedAt,
    session.expiresAt,
  );
  recordSecurityAuditEvent(database, "auth.session.issued", clientId, now);
  return { ...session, token, csrfToken };
}

export function issueSession(
  database: ClientDatabase,
  config: ClientAuthConfig,
  clientId: string,
  now = Date.now(),
): IssuedSession {
  assertClientAuthConfig(config);
  assertIdentityId(clientId);
  assertTimestamp(now);
  return inImmediateTransaction(database, () => insertSession(database, config, clientId, now));
}

export function authenticateSession(
  database: ClientDatabase,
  config: ClientAuthConfig,
  token: string | undefined,
  now = Date.now(),
): ClientSession | null {
  assertClientAuthConfig(config);
  if (!isOpaqueToken(token) || !validTimestamp(now)) return null;
  const row = database.prepare(
    `SELECT id, client_id, created_at, rotated_at, expires_at, revoked_at
     FROM client_sessions WHERE token_hash = ?`,
  ).get(keyedHash(config.sessionSecret, token)) as SessionRow | undefined;
  if (!row || row.revoked_at !== null || row.expires_at <= now) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
    expiresAt: row.expires_at,
  };
}

export function verifySessionCsrf(
  database: ClientDatabase,
  config: ClientAuthConfig,
  sessionId: string,
  csrfToken: string | undefined,
  now = Date.now(),
): boolean {
  assertClientAuthConfig(config);
  if (!sessionId || sessionId.length > 128 || !isOpaqueToken(csrfToken) || !validTimestamp(now)) return false;
  const row = database.prepare(
    "SELECT csrf_hash FROM client_sessions WHERE id = ? AND revoked_at IS NULL AND expires_at > ?",
  ).get(sessionId, now) as { csrf_hash: string } | undefined;
  return Boolean(row && safeEqual(row.csrf_hash, keyedHash(config.sessionSecret, csrfToken)));
}

export function rotateSession(
  database: ClientDatabase,
  config: ClientAuthConfig,
  token: string | undefined,
  now = Date.now(),
  force = false,
): IssuedSession | null {
  assertClientAuthConfig(config);
  if (!isOpaqueToken(token) || !validTimestamp(now)) return null;
  return inImmediateTransaction(database, () => {
    const session = authenticateSession(database, config, token, now);
    if (!session || (!force && now - session.rotatedAt < SESSION_ROTATION_MS)) return null;
    const revoked = database.prepare(
      "UPDATE client_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL AND expires_at > ?",
    ).run(now, session.id, now);
    if (Number(revoked.changes) !== 1) return null;
    const replacement = insertSession(database, config, session.clientId, now);
    recordSecurityAuditEvent(database, "auth.session.rotated", session.clientId, now);
    return replacement;
  });
}

export function revokeSession(
  database: ClientDatabase,
  config: ClientAuthConfig,
  token: string | undefined,
  now = Date.now(),
): boolean {
  assertClientAuthConfig(config);
  if (!isOpaqueToken(token) || !validTimestamp(now)) return false;
  return inImmediateTransaction(database, () => {
    const session = authenticateSession(database, config, token, now);
    if (!session) return false;
    const result = database.prepare(
      "UPDATE client_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL AND expires_at > ?",
    ).run(now, session.id, now);
    if (Number(result.changes) !== 1) return false;
    recordSecurityAuditEvent(database, "auth.session.revoked", session.clientId, now);
    return true;
  });
}

export function revokeAllClientSessions(database: ClientDatabase, clientId: string, now = Date.now()): number {
  assertIdentityId(clientId);
  assertTimestamp(now);
  return inImmediateTransaction(database, () => {
    const result = database.prepare(
      "UPDATE client_sessions SET revoked_at = ? WHERE client_id = ? AND revoked_at IS NULL",
    ).run(now, clientId);
    const revoked = Number(result.changes);
    if (revoked > 0) recordSecurityAuditEvent(database, "auth.sessions.revoked", clientId, now);
    return revoked;
  });
}

export function createAuthFlow(
  database: ClientDatabase,
  config: ClientAuthConfig,
  binding: AuthFlowBinding,
  now = Date.now(),
): { token: string; csrfToken: string; expiresAt: number } {
  assertClientAuthConfig(config);
  assertTimestamp(now);
  const sourceIp = normalizedSourceIp(binding.sourceIp);
  const origin = matchingOrigin(config, binding.origin);
  if (!sourceIp || !origin) throw new Error("Authentication operation rejected");

  return inImmediateTransaction(database, () => {
    const token = opaqueToken();
    const csrfToken = opaqueToken();
    const expiresAt = now + AUTH_FLOW_LIFETIME_MS;
    database.prepare(
      `INSERT INTO client_auth_flows
        (token_hash, csrf_hash, origin_hash, source_ip_hash, created_at, expires_at, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    ).run(
      keyedHash(config.sessionSecret, token),
      keyedHash(config.sessionSecret, csrfToken),
      keyedHash(config.sessionSecret, origin),
      keyedHash(config.sessionSecret, sourceIp),
      now,
      expiresAt,
    );
    recordSecurityAuditEvent(database, "auth.flow.created", null, now);
    return { token, csrfToken, expiresAt };
  });
}

function authFlowHashes(config: ClientAuthConfig, input: AuthFlowProof) {
  if (!isOpaqueToken(input.token) || !isOpaqueToken(input.csrfToken)) return null;
  const sourceIp = normalizedSourceIp(input.sourceIp);
  const origin = matchingOrigin(config, input.origin);
  if (!sourceIp || !origin) return null;
  return {
    tokenHash: keyedHash(config.sessionSecret, input.token),
    csrfHash: keyedHash(config.sessionSecret, input.csrfToken),
    originHash: keyedHash(config.sessionSecret, origin),
    sourceIpHash: keyedHash(config.sessionSecret, sourceIp),
  };
}

export function verifyAuthFlow(
  database: ClientDatabase,
  config: ClientAuthConfig,
  input: AuthFlowProof,
  now = Date.now(),
): boolean {
  assertClientAuthConfig(config);
  if (!validTimestamp(now)) return false;
  const hashes = authFlowHashes(config, input);
  if (!hashes) return false;
  const row = database.prepare(
    `SELECT csrf_hash, origin_hash, source_ip_hash FROM client_auth_flows
     WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?`,
  ).get(hashes.tokenHash, now) as AuthFlowRow | undefined;
  return Boolean(
    row
      && safeEqual(row.csrf_hash, hashes.csrfHash)
      && safeEqual(row.origin_hash, hashes.originHash)
      && safeEqual(row.source_ip_hash, hashes.sourceIpHash),
  );
}

export function consumeAuthFlow(
  database: ClientDatabase,
  config: ClientAuthConfig,
  input: AuthFlowProof,
  now = Date.now(),
): boolean {
  assertClientAuthConfig(config);
  if (!validTimestamp(now)) return false;
  const hashes = authFlowHashes(config, input);
  if (!hashes) return false;
  return inImmediateTransaction(database, () => {
    const result = database.prepare(
      `UPDATE client_auth_flows SET consumed_at = ?
       WHERE token_hash = ? AND csrf_hash = ? AND origin_hash = ? AND source_ip_hash = ?
         AND consumed_at IS NULL AND expires_at > ?`,
    ).run(
      now,
      hashes.tokenHash,
      hashes.csrfHash,
      hashes.originHash,
      hashes.sourceIpHash,
      now,
    );
    if (Number(result.changes) !== 1) return false;
    recordSecurityAuditEvent(database, "auth.flow.consumed", null, now);
    return true;
  });
}

export function sessionCookieOptions(config: ClientAuthConfig) {
  assertClientAuthConfig(config);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.secureCookies,
    path: "/client",
    maxAge: SESSION_LIFETIME_MS / 1_000,
  };
}

export function csrfCookieOptions(config: ClientAuthConfig) {
  assertClientAuthConfig(config);
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: config.secureCookies,
    path: "/client",
    maxAge: SESSION_LIFETIME_MS / 1_000,
  };
}

export function authFlowCookieOptions(config: ClientAuthConfig) {
  assertClientAuthConfig(config);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.secureCookies,
    path: "/client",
    maxAge: AUTH_FLOW_LIFETIME_MS / 1_000,
  };
}
