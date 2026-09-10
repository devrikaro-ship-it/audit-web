ALTER TABLE client_security_audit_events
  RENAME TO client_security_audit_events_v1;

CREATE TABLE client_security_audit_events (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'auth.flow.consumed',
    'auth.flow.created',
    'auth.google.succeeded',
    'auth.identity.created',
    'auth.otp.delivery_failed',
    'auth.otp.requested',
    'auth.otp.succeeded',
    'auth.password.changed',
    'auth.password.succeeded',
    'auth.session.issued',
    'auth.session.revoked',
    'auth.session.rotated',
    'auth.sessions.revoked'
  )),
  identity_id TEXT,
  occurred_at INTEGER NOT NULL
);

INSERT INTO client_security_audit_events(id, category, identity_id, occurred_at)
SELECT id, category, identity_id, occurred_at
FROM client_security_audit_events_v1;

DROP TABLE client_security_audit_events_v1;

CREATE TABLE client_identity_verifications (
  client_id TEXT PRIMARY KEY
    REFERENCES client_identities(id) ON DELETE RESTRICT,
  verified_at INTEGER NOT NULL
);

CREATE TABLE client_external_identities (
  provider TEXT NOT NULL CHECK (provider = 'google'),
  provider_subject TEXT NOT NULL CHECK (
    length(provider_subject) BETWEEN 1 AND 255
  ),
  client_id TEXT NOT NULL
    REFERENCES client_identities(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (provider, client_id)
);

CREATE TRIGGER client_external_identity_is_immutable_on_update
BEFORE UPDATE ON client_external_identities
BEGIN
  SELECT RAISE(ABORT, 'external identity is immutable');
END;

CREATE TRIGGER client_external_identity_is_immutable_on_delete
BEFORE DELETE ON client_external_identities
BEGIN
  SELECT RAISE(ABORT, 'external identity is immutable');
END;

CREATE TABLE client_password_credentials (
  client_id TEXT PRIMARY KEY
    REFERENCES client_identities(id) ON DELETE RESTRICT,
  password_hash TEXT NOT NULL CHECK (
    password_hash GLOB '$argon2id$*'
    AND length(password_hash) BETWEEN 32 AND 512
  ),
  changed_at INTEGER NOT NULL
);

CREATE TABLE client_otp_challenges (
  id TEXT PRIMARY KEY,
  canonical_email_hash TEXT NOT NULL CHECK (
    length(canonical_email_hash) = 43
  ),
  source_ip_hash TEXT NOT NULL CHECK (length(source_ip_hash) = 43),
  code_hash TEXT NOT NULL CHECK (length(code_hash) = 43),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  attempts_remaining INTEGER NOT NULL CHECK (
    attempts_remaining BETWEEN 0 AND 5
  ),
  consumed_at INTEGER
);

CREATE INDEX client_otp_challenges_email
  ON client_otp_challenges(canonical_email_hash, created_at DESC);

CREATE TABLE client_otp_send_events (
  id TEXT PRIMARY KEY,
  canonical_email_hash TEXT NOT NULL CHECK (
    length(canonical_email_hash) = 43
  ),
  source_ip_hash TEXT NOT NULL CHECK (length(source_ip_hash) = 43),
  sent_at INTEGER NOT NULL
);

CREATE INDEX client_otp_send_events_email
  ON client_otp_send_events(canonical_email_hash, sent_at DESC);

CREATE INDEX client_otp_send_events_source_ip
  ON client_otp_send_events(source_ip_hash, sent_at DESC);
