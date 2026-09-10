import "server-only";

import { randomInt, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import argon2 from "argon2";
import { deliverOtp, verifyGoogleCredential } from "./adapters";
import {
  loadClientAuthenticationConfig,
  type ClientAuthenticationConfig,
} from "./config";
import { keyedHash, safeEqual } from "./crypto";
import {
  findIdentityByEmail,
  isClientIdentityVerified,
  markClientIdentityVerified,
  resolveEmailIdentity,
  resolveVerifiedGoogleIdentity,
} from "../client-identity";
import { recordSecurityAuditEvent } from "../client-identity/audit";
import {
  inImmediateTransaction,
  openClientAuthenticationDatabase,
  type ClientDatabase,
} from "../client-identity/database";
import { canonicalClientEmail } from "../client-identity/email";
import {
  issueSession,
  revokeAllClientSessions,
  type IssuedSession,
} from "../client-session";

export const PASSWORD_MINIMUM_LENGTH = 12;
export const PASSWORD_MAXIMUM_LENGTH = 128;
export const OTP_LIFETIME_MS = 10 * 60 * 1_000;
export const OTP_RESEND_MS = 60 * 1_000;
export const OTP_RATE_WINDOW_MS = 60 * 60 * 1_000;
export const OTP_MAX_SENDS_PER_WINDOW = 5;
export const OTP_MAX_ATTEMPTS = 5;

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const;
const DUMMY_PASSWORD = "client-authentication-dummy-password";

let dummyPasswordHash: Promise<string> | undefined;

export type AuthenticationResult = Readonly<{
  clientId: string;
  session: IssuedSession;
}>;

type OtpChallengeRow = Readonly<{
  id: string;
  source_ip_hash: string;
  code_hash: string;
  expires_at: number;
  attempts_remaining: number;
}>;

type PendingOtp = Readonly<{ id: string; code: string }>;

function validTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function canonicalSourceIp(value: string): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 128) return null;
  if (value !== value.trim()) return null;
  const version = isIP(value);
  if (version === 4) return value;
  if (version !== 6) return null;
  try {
    const hostname = new URL(`http://[${value}]/`).hostname;
    return hostname.slice(1, -1);
  } catch {
    return null;
  }
}

function canonicalEmailOrNull(value: string): string | null {
  try {
    return canonicalClientEmail(value);
  } catch {
    return null;
  }
}

function domainSeparatedHash(
  secret: string,
  domain: "otp-code" | "otp-email-rate" | "otp-ip-rate",
  ...values: string[]
): string {
  const framed = values.map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`);
  return keyedHash(secret, [domain, ...framed].join("\0"));
}

function emailRateHash(config: ClientAuthenticationConfig, canonicalEmail: string): string {
  return domainSeparatedHash(config.otpSecret, "otp-email-rate", canonicalEmail);
}

function sourceIpRateHash(config: ClientAuthenticationConfig, sourceIp: string): string {
  return domainSeparatedHash(config.otpSecret, "otp-ip-rate", sourceIp);
}

function otpCodeHash(
  config: ClientAuthenticationConfig,
  canonicalEmail: string,
  challengeId: string,
  sourceIp: string,
  code: string,
): string {
  return domainSeparatedHash(
    config.otpSecret,
    "otp-code",
    canonicalEmail,
    challengeId,
    sourceIp,
    code,
  );
}

function passwordLength(password: unknown): number | null {
  if (typeof password !== "string") return null;
  return Array.from(password).length;
}

function hasValidPasswordLength(password: unknown): password is string {
  const length = passwordLength(password);
  return length !== null
    && length >= PASSWORD_MINIMUM_LENGTH
    && length <= PASSWORD_MAXIMUM_LENGTH;
}

function dummyHash(): Promise<string> {
  dummyPasswordHash ??= argon2.hash(DUMMY_PASSWORD, ARGON_OPTIONS);
  return dummyPasswordHash;
}

function otpSendCount(
  database: ClientDatabase,
  column: "canonical_email_hash" | "source_ip_hash",
  hash: string,
  windowStart: number,
): number {
  const row = database.prepare(
    `SELECT COUNT(*) AS count FROM client_otp_send_events WHERE ${column} = ? AND sent_at > ?`,
  ).get(hash, windowStart) as { count: number };
  return row.count;
}

export async function requestEmailOtp(
  input: { email: string; sourceIp: string; now?: number },
  environment: NodeJS.ProcessEnv = process.env,
): Promise<{ accepted: true }> {
  const config = loadClientAuthenticationConfig(environment);
  const canonicalEmail = canonicalEmailOrNull(input.email);
  const sourceIp = canonicalSourceIp(input.sourceIp);
  const now = input.now ?? Date.now();
  if (!canonicalEmail || !sourceIp || !validTimestamp(now)) return { accepted: true };

  const emailHash = emailRateHash(config, canonicalEmail);
  const sourceIpHash = sourceIpRateHash(config, sourceIp);
  const database = openClientAuthenticationDatabase(config);
  let pending: PendingOtp | null = null;
  try {
    pending = inImmediateTransaction(database, () => {
      const mostRecent = database.prepare(
        `SELECT sent_at FROM client_otp_send_events
         WHERE canonical_email_hash = ? ORDER BY sent_at DESC LIMIT 1`,
      ).get(emailHash) as { sent_at: number } | undefined;
      if (mostRecent && now - mostRecent.sent_at < OTP_RESEND_MS) return null;

      const windowStart = now - OTP_RATE_WINDOW_MS;
      if (
        otpSendCount(database, "canonical_email_hash", emailHash, windowStart)
          >= OTP_MAX_SENDS_PER_WINDOW
        || otpSendCount(database, "source_ip_hash", sourceIpHash, windowStart)
          >= OTP_MAX_SENDS_PER_WINDOW
      ) {
        return null;
      }

      const challengeId = randomUUID();
      const code = config.email.mode === "test"
        ? config.email.otpCode
        : randomInt(0, 1_000_000).toString().padStart(6, "0");
      database.prepare(
        `UPDATE client_otp_challenges SET consumed_at = ?
         WHERE canonical_email_hash = ? AND consumed_at IS NULL`,
      ).run(now, emailHash);
      database.prepare(
        `INSERT INTO client_otp_challenges
          (id, canonical_email_hash, source_ip_hash, code_hash, created_at, expires_at,
           attempts_remaining, consumed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      ).run(
        challengeId,
        emailHash,
        sourceIpHash,
        otpCodeHash(config, canonicalEmail, challengeId, sourceIp, code),
        now,
        now + OTP_LIFETIME_MS,
        OTP_MAX_ATTEMPTS,
      );
      database.prepare(
        `INSERT INTO client_otp_send_events
          (id, canonical_email_hash, source_ip_hash, sent_at)
         VALUES (?, ?, ?, ?)`,
      ).run(randomUUID(), emailHash, sourceIpHash, now);
      recordSecurityAuditEvent(database, "auth.otp.requested", null, now);
      return { id: challengeId, code };
    });

    if (!pending) return { accepted: true };
    try {
      await deliverOtp(config, canonicalEmail, pending.code, environment);
    } catch {
      inImmediateTransaction(database, () => {
        const consumed = database.prepare(
          `UPDATE client_otp_challenges SET consumed_at = ?
           WHERE id = ? AND consumed_at IS NULL`,
        ).run(now, pending!.id);
        if (Number(consumed.changes) === 1) {
          recordSecurityAuditEvent(database, "auth.otp.delivery_failed", null, now);
        }
      });
    }
    return { accepted: true };
  } finally {
    database.close();
  }
}

export function verifyEmailOtp(
  input: { email: string; code: string; sourceIp: string; now?: number },
  environment: NodeJS.ProcessEnv = process.env,
): AuthenticationResult | null {
  const config = loadClientAuthenticationConfig(environment);
  const canonicalEmail = canonicalEmailOrNull(input.email);
  const sourceIp = canonicalSourceIp(input.sourceIp);
  const now = input.now ?? Date.now();
  if (
    !canonicalEmail
    || !sourceIp
    || !/^\d{6}$/.test(input.code)
    || !validTimestamp(now)
  ) {
    return null;
  }

  const emailHash = emailRateHash(config, canonicalEmail);
  const sourceIpHash = sourceIpRateHash(config, sourceIp);
  const database = openClientAuthenticationDatabase(config);
  try {
    return inImmediateTransaction(database, () => {
      const row = database.prepare(
        `SELECT id, source_ip_hash, code_hash, expires_at, attempts_remaining
         FROM client_otp_challenges
         WHERE canonical_email_hash = ? AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
      ).get(emailHash) as OtpChallengeRow | undefined;
      if (!row || !safeEqual(row.source_ip_hash, sourceIpHash)) return null;
      if (row.expires_at <= now || row.attempts_remaining <= 0) {
        database.prepare(
          "UPDATE client_otp_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
        ).run(now, row.id);
        return null;
      }

      const codeHash = otpCodeHash(config, canonicalEmail, row.id, sourceIp, input.code);
      if (!safeEqual(row.code_hash, codeHash)) {
        database.prepare(
          `UPDATE client_otp_challenges
           SET attempts_remaining = CASE
                 WHEN attempts_remaining > 0 THEN attempts_remaining - 1
                 ELSE 0
               END,
               consumed_at = CASE
                 WHEN attempts_remaining <= 1 THEN ?
                 ELSE consumed_at
               END
           WHERE id = ? AND consumed_at IS NULL`,
        ).run(now, row.id);
        return null;
      }

      const consumed = database.prepare(
        `UPDATE client_otp_challenges SET consumed_at = ?
         WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts_remaining > 0`,
      ).run(now, row.id, now);
      if (Number(consumed.changes) !== 1) return null;

      const identity = resolveEmailIdentity(database, canonicalEmail, now);
      markClientIdentityVerified(database, identity.id, now);
      const session = issueSession(database, config, identity.id, now);
      recordSecurityAuditEvent(database, "auth.otp.succeeded", identity.id, now);
      return { clientId: identity.id, session };
    });
  } finally {
    database.close();
  }
}

export async function authenticateGoogle(
  input: { credential: string; now?: number },
  environment: NodeJS.ProcessEnv = process.env,
): Promise<AuthenticationResult | null> {
  const config = loadClientAuthenticationConfig(environment);
  const now = input.now ?? Date.now();
  if (!validTimestamp(now)) return null;

  let verified;
  try {
    verified = await verifyGoogleCredential(config, input.credential, now, environment);
  } catch {
    return null;
  }

  const database = openClientAuthenticationDatabase(config);
  try {
    return inImmediateTransaction(database, () => {
      const identity = resolveVerifiedGoogleIdentity(database, verified, now);
      const session = issueSession(database, config, identity.id, now);
      recordSecurityAuditEvent(database, "auth.google.succeeded", identity.id, now);
      return { clientId: identity.id, session };
    });
  } catch {
    return null;
  } finally {
    database.close();
  }
}

export async function authenticatePassword(
  input: { email: string; password: string; now?: number },
  environment: NodeJS.ProcessEnv = process.env,
): Promise<AuthenticationResult | null> {
  const config = loadClientAuthenticationConfig(environment);
  const canonicalEmail = canonicalEmailOrNull(input.email);
  const now = input.now ?? Date.now();
  if (!validTimestamp(now)) return null;

  const database = openClientAuthenticationDatabase(config);
  try {
    const identity = canonicalEmail ? findIdentityByEmail(database, canonicalEmail) : undefined;
    const credential = identity
      ? database.prepare(
        "SELECT password_hash FROM client_password_credentials WHERE client_id = ?",
      ).get(identity.id) as { password_hash: string } | undefined
      : undefined;
    const initializedDummyHash = await dummyHash();
    const passwordHash = credential?.password_hash ?? initializedDummyHash;
    const candidate = typeof input.password === "string" && input.password.length <= 1_024
      ? input.password
      : DUMMY_PASSWORD;
    let matches = false;
    try {
      matches = await argon2.verify(passwordHash, candidate);
    } catch {
      matches = false;
    }
    if (!identity || !credential || !hasValidPasswordLength(input.password) || !matches) {
      return null;
    }

    const verifiedCredentialHash = credential.password_hash;
    return inImmediateTransaction(database, () => {
      const currentCredential = database.prepare(
        "SELECT password_hash FROM client_password_credentials WHERE client_id = ?",
      ).get(identity.id) as { password_hash: string } | undefined;
      if (
        !currentCredential
        || !safeEqual(currentCredential.password_hash, verifiedCredentialHash)
      ) {
        return null;
      }
      const session = issueSession(database, config, identity.id, now);
      recordSecurityAuditEvent(database, "auth.password.succeeded", identity.id, now);
      return { clientId: identity.id, session };
    });
  } finally {
    database.close();
  }
}

export async function setPasswordCredential(
  input: { clientId: string; password: string; now?: number },
  environment: NodeJS.ProcessEnv = process.env,
): Promise<IssuedSession> {
  const config = loadClientAuthenticationConfig(environment);
  const now = input.now ?? Date.now();
  if (
    !input.clientId
    || input.clientId.length > 128
    || !hasValidPasswordLength(input.password)
    || !validTimestamp(now)
  ) {
    throw new Error("Authentication operation rejected");
  }

  const database = openClientAuthenticationDatabase(config);
  try {
    if (!isClientIdentityVerified(database, input.clientId)) {
      throw new Error("Authentication operation rejected");
    }
    const passwordHash = await argon2.hash(input.password, ARGON_OPTIONS);
    return inImmediateTransaction(database, () => {
      if (!isClientIdentityVerified(database, input.clientId)) {
        throw new Error("Authentication operation rejected");
      }
      database.prepare(
        `INSERT INTO client_password_credentials(client_id, password_hash, changed_at)
         VALUES (?, ?, ?)
         ON CONFLICT(client_id) DO UPDATE
         SET password_hash = excluded.password_hash, changed_at = excluded.changed_at`,
      ).run(input.clientId, passwordHash, now);
      revokeAllClientSessions(database, input.clientId, now);
      const session = issueSession(database, config, input.clientId, now);
      recordSecurityAuditEvent(database, "auth.password.changed", input.clientId, now);
      return session;
    });
  } finally {
    database.close();
  }
}
