import "server-only";

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
// The locked Node 20 declaration package predates node:sqlite; the local runtime provides it.
// @ts-expect-error -- node:sqlite is verified as available during the delivery preflight.
import { DatabaseSync } from "node:sqlite";
import {
  assertClientAuthConfig,
  type ClientAuthConfig,
} from "../client-auth/config";

const MIGRATION_VERSION = 1;
const BUSY_TIMEOUT_MS = 5_000;
const MIGRATION_PATH = path.join(process.cwd(), "db", "client-identity", "001_initial.sql");

export type ClientDatabase = DatabaseSync;

function migrationSql(): string {
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  if (!sql.trim()) throw new Error("Client identity migration is unavailable");
  return sql;
}

function assertStorageParent(databasePath: string): void {
  try {
    if (!statSync(path.dirname(databasePath)).isDirectory()) throw new Error();
  } catch {
    throw new Error("Client identity storage is unavailable");
  }
}

export function openClientDatabase(config: ClientAuthConfig): ClientDatabase {
  assertClientAuthConfig(config);
  const sql = migrationSql();
  assertStorageParent(config.databasePath);

  const database = new DatabaseSync(config.databasePath);
  try {
    database.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
    const migrationsExist = database.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'client_schema_migrations'",
    ).get() as { present: number } | undefined;
    const applied = migrationsExist
      ? database.prepare("SELECT version FROM client_schema_migrations WHERE version = ?").get(MIGRATION_VERSION)
      : undefined;
    if (!applied) {
      inImmediateTransaction(database, () => {
        database.exec(sql);
        database.prepare("INSERT INTO client_schema_migrations(version, applied_at) VALUES (?, ?)")
          .run(MIGRATION_VERSION, Date.now());
      });
    }
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function inImmediateTransaction<T>(database: ClientDatabase, operation: () => T): T {
  if (database.isTransaction) return operation();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
