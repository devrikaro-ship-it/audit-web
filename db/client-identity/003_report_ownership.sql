CREATE TABLE IF NOT EXISTS client_report_owners (
  report_id TEXT PRIMARY KEY CHECK (
    length(report_id) BETWEEN 1 AND 128
    AND report_id NOT GLOB '*[^A-Za-z0-9-]*'
  ),
  client_id TEXT NOT NULL
    REFERENCES client_identities(id) ON DELETE RESTRICT,
  snapshot_path TEXT NOT NULL CHECK (
    length(snapshot_path) BETWEEN 1 AND 4096
  ),
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
);

CREATE INDEX IF NOT EXISTS client_report_owners_client_created
  ON client_report_owners(client_id, created_at DESC, report_id ASC);

CREATE TRIGGER IF NOT EXISTS client_report_owner_cannot_be_replaced
BEFORE INSERT ON client_report_owners
WHEN EXISTS (
  SELECT 1 FROM client_report_owners WHERE report_id = NEW.report_id
)
BEGIN
  SELECT RAISE(ABORT, 'report owner is immutable');
END;

CREATE TRIGGER IF NOT EXISTS client_report_owner_is_immutable_on_update
BEFORE UPDATE ON client_report_owners
BEGIN
  SELECT RAISE(ABORT, 'report owner is immutable');
END;

CREATE TRIGGER IF NOT EXISTS client_report_owner_is_immutable_on_delete
BEFORE DELETE ON client_report_owners
BEGIN
  SELECT RAISE(ABORT, 'report owner is immutable');
END;
