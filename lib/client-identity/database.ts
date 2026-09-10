import "server-only";

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
// The locked Node 20 declaration package predates node:sqlite; the local runtime provides it.
// @ts-expect-error -- node:sqlite is verified as available during the delivery preflight.
import { DatabaseSync } from "node:sqlite";
import {
  assertClientAuthConfig,
  assertClientAuthenticationConfig,
  type ClientAuthConfig,
  type ClientAuthenticationConfig,
} from "../client-auth/config";

const BUSY_TIMEOUT_MS = 5_000;
const CORE_MIGRATIONS = [
  { version: 1, filename: "001_initial.sql" },
] as const;
const AUTHENTICATION_MIGRATIONS = [
  ...CORE_MIGRATIONS,
  { version: 2, filename: "002_auth_methods.sql" },
] as const;

export type ClientDatabase = DatabaseSync;

type Migration = Readonly<{ version: number; filename: string }>;

function migrationSql(migration: Migration): string {
  const migrationPath = path.join(
    process.cwd(),
    "db",
    "client-identity",
    migration.filename,
  );
  const sql = readFileSync(migrationPath, "utf8");
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

function applyMigrations(database: ClientDatabase, migrations: readonly Migration[]): void {
  for (const migration of migrations) {
    const migrationsExist = database.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'client_schema_migrations'",
    ).get() as { present: number } | undefined;
    const applied = migrationsExist
      ? database.prepare("SELECT version FROM client_schema_migrations WHERE version = ?")
        .get(migration.version)
      : undefined;
    if (applied) continue;

    const sql = migrationSql(migration);
    inImmediateTransaction(database, () => {
      database.exec(sql);
      database.prepare("INSERT INTO client_schema_migrations(version, applied_at) VALUES (?, ?)")
        .run(migration.version, Date.now());
    });
  }
}

function openDatabase(
  config: ClientAuthConfig,
  migrations: readonly Migration[],
): ClientDatabase {
  assertStorageParent(config.databasePath);

  const database = new DatabaseSync(config.databasePath);
  try {
    database.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
    applyMigrations(database, migrations);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function openClientDatabase(config: ClientAuthConfig): ClientDatabase {
  assertClientAuthConfig(config);
  return openDatabase(config, CORE_MIGRATIONS);
}

export function openClientAuthenticationDatabase(
  config: ClientAuthenticationConfig,
): ClientDatabase {
  assertClientAuthenticationConfig(config);
  return openDatabase(config, AUTHENTICATION_MIGRATIONS);
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
