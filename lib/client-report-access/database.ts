import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  loadClientAuthConfig,
  type ClientAuthConfig,
} from "@/lib/client-auth/config";
import {
  inImmediateTransaction,
  openClientDatabase,
  type ClientDatabase,
} from "@/lib/client-identity/database";

const REPORT_OWNERSHIP_MIGRATION = {
  version: 3,
  filename: "003_report_ownership.sql",
} as const;
const REPORT_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const MAXIMUM_SNAPSHOT_PATH_BYTES = 4_096;
const TEST_PROVISIONING_FLAG = "CLIENT_REPORT_ACCESS_TEST_PROVISIONING";

type OwnerRow = Readonly<{
  report_id: string;
  snapshot_path: string;
  created_at: number;
}>;

export type OwnedReportMetadata = Readonly<{
  reportId: string;
  createdAt: number;
}>;

export type OwnedReportRecord = OwnedReportMetadata & Readonly<{
  snapshotPath: string;
}>;

export function isValidReportId(reportId: string): boolean {
  return REPORT_ID_PATTERN.test(reportId);
}

function migrationSql(): string {
  const migrationPath = path.join(
    process.cwd(),
    "db",
    "client-identity",
    REPORT_OWNERSHIP_MIGRATION.filename,
  );
  const sql = readFileSync(migrationPath, "utf8");
  if (!sql.trim()) throw new Error("Client report storage is unavailable");
  return sql;
}

function applyReportOwnershipMigration(database: ClientDatabase): void {
  const applied = database.prepare(
    "SELECT version FROM client_schema_migrations WHERE version = ?",
  ).get(REPORT_OWNERSHIP_MIGRATION.version);
  if (applied) return;

  const sql = migrationSql();
  inImmediateTransaction(database, () => {
    const appliedAfterLock = database.prepare(
      "SELECT version FROM client_schema_migrations WHERE version = ?",
    ).get(REPORT_OWNERSHIP_MIGRATION.version);
    if (appliedAfterLock) return;
    database.exec(sql);
    database.prepare(
      "INSERT INTO client_schema_migrations(version, applied_at) VALUES (?, ?)",
    ).run(REPORT_OWNERSHIP_MIGRATION.version, Date.now());
  });
}

export function openClientReportDatabase(config: ClientAuthConfig): ClientDatabase {
  const database = openClientDatabase(config);
  try {
    applyReportOwnershipMigration(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

function ownedReport(row: OwnerRow): OwnedReportRecord {
  return {
    reportId: row.report_id,
    snapshotPath: row.snapshot_path,
    createdAt: row.created_at,
  };
}

export function findOwnedReport(
  database: ClientDatabase,
  clientId: string,
  reportId: string,
): OwnedReportRecord | null {
  if (!isValidReportId(reportId)) return null;
  const row = database.prepare(
    `SELECT report_id, snapshot_path, created_at
     FROM client_report_owners
     WHERE client_id = ? AND report_id = ?`,
  ).get(clientId, reportId) as OwnerRow | undefined;
  return row ? ownedReport(row) : null;
}

export function listOwnedReportRecords(
  database: ClientDatabase,
  clientId: string,
): OwnedReportRecord[] {
  const rows = database.prepare(
    `SELECT report_id, snapshot_path, created_at
     FROM client_report_owners
     WHERE client_id = ?
     ORDER BY created_at DESC, report_id ASC`,
  ).all(clientId) as OwnerRow[];
  return rows.map(ownedReport);
}

function assertProvisioningInput(
  input: Readonly<{
    reportId: string;
    clientId: string;
    snapshotPath: string;
    createdAt: number;
  }>,
): void {
  const snapshotPathBytes = Buffer.byteLength(input.snapshotPath, "utf8");
  if (
    !isValidReportId(input.reportId)
    || !input.clientId
    || input.clientId.length > 128
    || !path.isAbsolute(input.snapshotPath)
    || path.normalize(input.snapshotPath) !== input.snapshotPath
    || path.extname(input.snapshotPath) !== ".snapshot"
    || snapshotPathBytes < 1
    || snapshotPathBytes > MAXIMUM_SNAPSHOT_PATH_BYTES
    || !Number.isSafeInteger(input.createdAt)
    || input.createdAt < 0
  ) {
    throw new Error("Report owner provisioning rejected");
  }
}

export function provisionReportOwnerForTest(
  input: Readonly<{
    reportId: string;
    clientId: string;
    snapshotPath: string;
    createdAt?: number;
  }>,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  if (
    process.env.NODE_ENV !== "test"
    || process.env[TEST_PROVISIONING_FLAG] !== "1"
    || environment.NODE_ENV !== "test"
    || environment[TEST_PROVISIONING_FLAG] !== "1"
  ) {
    throw new Error("Report owner provisioning is unavailable");
  }
  const createdAt = input.createdAt ?? Date.now();
  assertProvisioningInput({ ...input, createdAt });

  const database = openClientReportDatabase(loadClientAuthConfig(environment));
  try {
    database.prepare(
      `INSERT INTO client_report_owners
        (report_id, client_id, snapshot_path, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(input.reportId, input.clientId, input.snapshotPath, createdAt);
  } finally {
    database.close();
  }
}
