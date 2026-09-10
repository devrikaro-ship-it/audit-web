CREATE TABLE IF NOT EXISTS client_schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS client_identities (
  id TEXT PRIMARY KEY,
  canonical_email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TRIGGER IF NOT EXISTS client_identity_is_immutable
BEFORE UPDATE ON client_identities
BEGIN
  SELECT RAISE(ABORT, 'client identity is immutable');
END;

CREATE TABLE IF NOT EXISTS client_auth_flows (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 43),
  csrf_hash TEXT NOT NULL CHECK (length(csrf_hash) = 43),
  origin_hash TEXT NOT NULL CHECK (length(origin_hash) = 43),
  source_ip_hash TEXT NOT NULL CHECK (length(source_ip_hash) = 43),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  consumed_at INTEGER
);

CREATE TABLE IF NOT EXISTS client_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client_identities(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 43),
  csrf_hash TEXT NOT NULL CHECK (length(csrf_hash) = 43),
  created_at INTEGER NOT NULL,
  rotated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS client_sessions_client
  ON client_sessions(client_id, expires_at);

CREATE TABLE IF NOT EXISTS client_security_audit_events (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'auth.flow.consumed',
    'auth.flow.created',
    'auth.identity.created',
    'auth.session.issued',
    'auth.session.revoked',
    'auth.session.rotated',
    'auth.sessions.revoked'
  )),
  identity_id TEXT,
  occurred_at INTEGER NOT NULL
);
