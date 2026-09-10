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
