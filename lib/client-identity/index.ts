import "server-only";

import { randomUUID } from "node:crypto";
import { recordSecurityAuditEvent } from "./audit";
import type { ClientDatabase } from "./database";
import { inImmediateTransaction } from "./database";
import { canonicalClientEmail } from "./email";

export type ClientIdentity = Readonly<{
  id: string;
  canonicalEmail: string;
  createdAt: number;
}>;

type IdentityRow = {
  id: string;
  canonical_email: string;
  created_at: number;
};

export type VerifiedGoogleIdentityBinding = Readonly<{
  subject: string;
  email: string;
}>;

function toIdentity(row: IdentityRow): ClientIdentity {
  return {
    id: row.id,
    canonicalEmail: row.canonical_email,
    createdAt: row.created_at,
  };
}

function identityForEmail(database: ClientDatabase, canonicalEmail: string): IdentityRow | undefined {
  return database.prepare(
    "SELECT id, canonical_email, created_at FROM client_identities WHERE canonical_email = ?",
  ).get(canonicalEmail) as IdentityRow | undefined;
}

export function resolveEmailIdentity(database: ClientDatabase, email: string, now = Date.now()): ClientIdentity {
  const canonicalEmail = canonicalClientEmail(email);
  return inImmediateTransaction(database, () => {
    const existing = identityForEmail(database, canonicalEmail);
    if (existing) return toIdentity(existing);

    const identity: IdentityRow = {
      id: randomUUID(),
      canonical_email: canonicalEmail,
      created_at: now,
    };
    database.prepare("INSERT INTO client_identities(id, canonical_email, created_at) VALUES (?, ?, ?)")
      .run(identity.id, identity.canonical_email, identity.created_at);
    recordSecurityAuditEvent(database, "auth.identity.created", identity.id, now);
    return toIdentity(identity);
  });
}

export function findIdentityByEmail(database: ClientDatabase, email: string): ClientIdentity | undefined {
  const row = identityForEmail(database, canonicalClientEmail(email));
  return row ? toIdentity(row) : undefined;
}

export function isClientIdentityVerified(database: ClientDatabase, clientId: string): boolean {
  if (!clientId || clientId.length > 128) return false;
  return Boolean(database.prepare(
    "SELECT 1 AS verified FROM client_identity_verifications WHERE client_id = ?",
  ).get(clientId));
}

export function markClientIdentityVerified(
  database: ClientDatabase,
  clientId: string,
  now: number,
): void {
  database.prepare(
    `INSERT INTO client_identity_verifications(client_id, verified_at)
     VALUES (?, ?)
     ON CONFLICT(client_id) DO NOTHING`,
  ).run(clientId, now);
}

export function resolveVerifiedGoogleIdentity(
  database: ClientDatabase,
  input: VerifiedGoogleIdentityBinding,
  now = Date.now(),
): ClientIdentity {
  const canonicalEmail = canonicalClientEmail(input.email);
  if (!input.subject || input.subject.length > 255 || !Number.isSafeInteger(now) || now < 0) {
    throw new Error("Authentication operation rejected");
  }

  return inImmediateTransaction(database, () => {
    const subjectBinding = database.prepare(
      `SELECT identity.id, identity.canonical_email, identity.created_at
       FROM client_external_identities AS external
       JOIN client_identities AS identity ON identity.id = external.client_id
       WHERE external.provider = 'google' AND external.provider_subject = ?`,
    ).get(input.subject) as IdentityRow | undefined;
    if (subjectBinding) {
      if (subjectBinding.canonical_email !== canonicalEmail) {
        throw new Error("Authentication operation rejected");
      }
      markClientIdentityVerified(database, subjectBinding.id, now);
      return toIdentity(subjectBinding);
    }

    const existingIdentity = identityForEmail(database, canonicalEmail);
    if (existingIdentity) {
      const emailBinding = database.prepare(
        `SELECT provider_subject FROM client_external_identities
         WHERE provider = 'google' AND client_id = ?`,
      ).get(existingIdentity.id) as { provider_subject: string } | undefined;
      if (emailBinding) throw new Error("Authentication operation rejected");
      database.prepare(
        `INSERT INTO client_external_identities(provider, provider_subject, client_id, created_at)
         VALUES ('google', ?, ?, ?)`,
      ).run(input.subject, existingIdentity.id, now);
      markClientIdentityVerified(database, existingIdentity.id, now);
      return toIdentity(existingIdentity);
    }

    const identity: IdentityRow = {
      id: randomUUID(),
      canonical_email: canonicalEmail,
      created_at: now,
    };
    database.prepare(
      "INSERT INTO client_identities(id, canonical_email, created_at) VALUES (?, ?, ?)",
    ).run(identity.id, identity.canonical_email, identity.created_at);
    recordSecurityAuditEvent(database, "auth.identity.created", identity.id, now);
    database.prepare(
      `INSERT INTO client_external_identities(provider, provider_subject, client_id, created_at)
       VALUES ('google', ?, ?, ?)`,
    ).run(input.subject, identity.id, now);
    markClientIdentityVerified(database, identity.id, now);
    return toIdentity(identity);
  });
}
