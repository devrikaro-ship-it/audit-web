import "server-only";

import { randomUUID } from "node:crypto";
import type { ClientDatabase } from "./database";

export type SecurityAuditCategory =
  | "auth.flow.consumed"
  | "auth.flow.created"
  | "auth.identity.created"
  | "auth.session.issued"
  | "auth.session.revoked"
  | "auth.session.rotated"
  | "auth.sessions.revoked";

export function recordSecurityAuditEvent(
  database: ClientDatabase,
  category: SecurityAuditCategory,
  identityId: string | null,
  occurredAt: number,
): void {
  database.prepare(
    "INSERT INTO client_security_audit_events(id, category, identity_id, occurred_at) VALUES (?, ?, ?, ?)",
  ).run(randomUUID(), category, identityId, occurredAt);
}
