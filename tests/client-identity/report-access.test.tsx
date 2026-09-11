import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it } from "vitest";
import ReportingDashboard from "@/app/google-ads/raport/ReportingDashboard";
import {
  listOwnedReports,
  provisionReportOwnerForTest,
  readOwnedReport,
  type ClientReportEntitlement,
} from "@/lib/client-report-access";
import { openClientReportDatabase } from "@/lib/client-report-access/database";
import { clientReportView } from "@/lib/client-report-access/report-view";
import {
  loadClientAuthConfig,
  loadClientAuthenticationConfig,
} from "@/lib/client-auth/config";
import { resolveVerifiedGoogleIdentity } from "@/lib/client-identity";
import { openClientAuthenticationDatabase } from "@/lib/client-identity/database";
import { beforeAfterSourceFromSnapshot } from "@/lib/gads-product-simulation";
import {
  sealReportSnapshot,
  trackingObservationFromSnapshot,
  type GadsReportSnapshot,
} from "@/lib/gads-report-delivery";
import {
  issueSession,
  revokeSession,
  SESSION_LIFETIME_MS,
  type IssuedSession,
} from "@/lib/client-session";

const MANAGED_ENVIRONMENT_KEYS = [
  "NODE_ENV",
  "CLIENT_AUTH_TEST_GOOGLE_ADAPTER",
  "CLIENT_AUTH_TEST_EMAIL_ADAPTER",
  "CLIENT_AUTH_TEST_OTP_CODE",
  "CLIENT_GOOGLE_CLIENT_ID",
  "CLIENT_IDENTITY_DB_PATH",
  "CLIENT_APP_ORIGIN",
  "CLIENT_OTP_SECRET",
  "CLIENT_SESSION_SECRET",
  "CLIENT_REPORT_ACCESS_TEST_PROVISIONING",
  "GADS_REPORTS_DIR",
  "GADS_REPORT_SIGNING_SECRET",
] as const;
const originalEnvironment = new Map(
  MANAGED_ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]),
);
const mutableProcessEnvironment = process.env as Record<string, string | undefined>;
const ACTIVE_ENTITLEMENT: ClientReportEntitlement = Object.freeze({
  canReadGoogleAdsReports: () => true,
});
const INACTIVE_ENTITLEMENT: ClientReportEntitlement = Object.freeze({
  canReadGoogleAdsReports: () => false,
});
const THROWING_ENTITLEMENT: ClientReportEntitlement = Object.freeze({
  canReadGoogleAdsReports: () => {
    throw new Error("Entitlement service unavailable");
  },
});

let temporaryRoot: string;
let environment: NodeJS.ProcessEnv;

const snapshot: GadsReportSnapshot = {
  generatedAt: "2026-09-10T12:00:00.000Z",
  evidenceMonths: 1,
  website: "https://client.example",
  accountName: "Owner Google Ads account",
  averageOrderValue: 200,
  goodsCost: 80,
  breakEvenCpa: 40,
  breakEvenRoas: 5,
  current: { spend: 321, revenue: 642, orders: 2, cpa: 160.5, roas: 2 },
  optimized: { spend: 321, revenue: 1_926, orders: 8, cpa: 40.125, roas: 6 },
  losses: [{
    productId: "known-field",
    title: "KNOWN-POSITIVE-GOOGLE-ADS-FIELD",
    cost: 321,
    revenue: 642,
    orders: 2,
    cpa: 160.5,
    roas: 2,
    amount: 192.6,
  }],
  opportunities: [],
  reportProducts: [{
    productId: "known-field",
    title: "KNOWN-POSITIVE-GOOGLE-ADS-FIELD",
    cost: 321,
    conversionValue: 642,
    conversions: 2,
    clicks: 20,
    impressions: 500,
    catalogEligible: true,
  }],
  tracking: {
    status: "OBSERVED",
    observedAt: "2026-09-10T11:00:00.000Z",
    actions: [{ name: "Purchase", category: "PURCHASE", primary: true }],
    issues: [],
  },
};

beforeEach(() => {
  temporaryRoot = mkdtempSync(path.join(tmpdir(), "client-report-access-"));
  const reportsDirectory = path.join(temporaryRoot, "reports");
  mkdirSync(reportsDirectory);
  environment = {
    ...process.env,
    NODE_ENV: "test",
    CLIENT_AUTH_TEST_GOOGLE_ADAPTER: "1",
    CLIENT_AUTH_TEST_EMAIL_ADAPTER: "1",
    CLIENT_AUTH_TEST_OTP_CODE: "617204",
    CLIENT_GOOGLE_CLIENT_ID: "client-report-access.apps.googleusercontent.com",
    CLIENT_IDENTITY_DB_PATH: path.join(temporaryRoot, "identity.sqlite"),
    CLIENT_APP_ORIGIN: "https://client.test",
    CLIENT_OTP_SECRET: "otp-secret-with-at-least-thirty-two-bytes",
    CLIENT_SESSION_SECRET: "session-secret-with-at-least-thirty-two-bytes",
    CLIENT_REPORT_ACCESS_TEST_PROVISIONING: "1",
    GADS_REPORTS_DIR: reportsDirectory,
    GADS_REPORT_SIGNING_SECRET: "report-signing-secret-for-client-tests",
  };
  for (const key of MANAGED_ENVIRONMENT_KEYS) {
    const value = environment[key];
    if (value === undefined) delete mutableProcessEnvironment[key];
    else mutableProcessEnvironment[key] = value;
  }
});

afterEach(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
  for (const key of MANAGED_ENVIRONMENT_KEYS) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete mutableProcessEnvironment[key];
    else mutableProcessEnvironment[key] = value;
  }
});

function createVerifiedClient(email: string, subject: string, now: number): string {
  const database = openClientAuthenticationDatabase(
    loadClientAuthenticationConfig(environment),
  );
  try {
    return resolveVerifiedGoogleIdentity(database, { email, subject }, now).id;
  } finally {
    database.close();
  }
}

function createSession(clientId: string, now: number): IssuedSession {
  const config = loadClientAuthConfig(environment);
  const database = openClientReportDatabase(config);
  try {
    return issueSession(database, config, clientId, now);
  } finally {
    database.close();
  }
}

function writeSignedSnapshot(snapshotPath: string): void {
  writeFileSync(snapshotPath, sealReportSnapshot(snapshot), {
    encoding: "utf8",
    mode: 0o600,
  });
}

function plantReport(
  reportId: string,
  clientId: string,
  createdAt: number,
): string {
  const snapshotPath = path.join(environment.GADS_REPORTS_DIR!, `${reportId}.snapshot`);
  writeSignedSnapshot(snapshotPath);
  provisionReportOwnerForTest(
    { reportId, clientId, snapshotPath, createdAt },
    environment,
  );
  return snapshotPath;
}

function provisionPath(
  reportId: string,
  clientId: string,
  snapshotPath: string,
  createdAt = 1_000,
): void {
  provisionReportOwnerForTest(
    { reportId, clientId, snapshotPath, createdAt },
    environment,
  );
}

function databaseState(): Record<string, unknown[]> {
  const database = openClientReportDatabase(loadClientAuthConfig(environment));
  const tables = [
    "client_schema_migrations",
    "client_identities",
    "client_identity_verifications",
    "client_sessions",
    "client_security_audit_events",
    "client_report_owners",
  ] as const;
  try {
    return Object.fromEntries(tables.map((table) => [
      table,
      database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as unknown[],
    ]));
  } finally {
    database.close();
  }
}

function filesystemState(): unknown[] {
  const state: unknown[] = [];
  const visit = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      if (name.startsWith("identity.sqlite")) continue;
      const absolute = path.join(current, name);
      const relative = path.relative(temporaryRoot, absolute);
      const metadata = lstatSync(absolute);
      if (metadata.isSymbolicLink()) {
        state.push({ type: "symlink", path: relative, target: readlinkSync(absolute) });
      } else if (metadata.isDirectory()) {
        state.push({ type: "directory", path: relative });
        visit(absolute);
      } else {
        state.push({
          type: "file",
          path: relative,
          bytes: metadata.size,
          sha256: createHash("sha256").update(readFileSync(absolute)).digest("hex"),
        });
      }
    }
  };
  visit(temporaryRoot);
  return state;
}

it("applies migration 003 idempotently and makes every report owner immutable", () => {
  const ownerId = createVerifiedClient("owner@example.com", "google-owner", 100);
  const otherId = createVerifiedClient("other@example.com", "google-other", 101);
  const snapshotPath = plantReport("owner-report", ownerId, 200);
  const config = loadClientAuthConfig(environment);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const database = openClientReportDatabase(config);
    expect(database.prepare(
      "SELECT version FROM client_schema_migrations ORDER BY version",
    ).all()).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
    expect(database.prepare(
      "SELECT COUNT(*) AS count FROM client_schema_migrations WHERE version = 3",
    ).get()).toEqual({ count: 1 });
    database.close();
  }

  expect(() => provisionReportOwnerForTest(
    { reportId: "owner-report", clientId: otherId, snapshotPath, createdAt: 300 },
    environment,
  )).toThrow(/immutable|UNIQUE/);

  const database = openClientReportDatabase(config);
  try {
    expect(() => database.prepare(
      "UPDATE client_report_owners SET client_id = ? WHERE report_id = ?",
    ).run(otherId, "owner-report")).toThrow(/immutable/);
    expect(() => database.prepare(
      "DELETE FROM client_report_owners WHERE report_id = ?",
    ).run("owner-report")).toThrow(/immutable/);
    expect(() => database.prepare(
      `INSERT OR REPLACE INTO client_report_owners
        (report_id, client_id, snapshot_path, created_at) VALUES (?, ?, ?, ?)`,
    ).run("owner-report", otherId, snapshotPath, 400)).toThrow(/immutable/);
    expect(database.prepare(
      `SELECT report_id, client_id, snapshot_path, created_at
       FROM client_report_owners WHERE report_id = ?`,
    ).get("owner-report")).toEqual({
      report_id: "owner-report",
      client_id: ownerId,
      snapshot_path: snapshotPath,
      created_at: 200,
    });
    expect(() => database.prepare(
      `INSERT INTO client_report_owners
        (report_id, client_id, snapshot_path, created_at) VALUES (?, ?, ?, ?)`,
    ).run("unsafe/report", ownerId, snapshotPath, 500)).toThrow();
  } finally {
    database.close();
  }

  for (const invalidReportId of ["", "unsafe/report", "under_score", "x".repeat(129)]) {
    expect(() => provisionReportOwnerForTest(
      { reportId: invalidReportId, clientId: ownerId, snapshotPath },
      environment,
    )).toThrow("Report owner provisioning rejected");
  }
  expect(() => provisionReportOwnerForTest(
    { reportId: "test-gate", clientId: ownerId, snapshotPath },
    { ...environment, NODE_ENV: "production" },
  )).toThrow("Report owner provisioning is unavailable");
  const disabledProvisioning = { ...environment };
  delete disabledProvisioning.CLIENT_REPORT_ACCESS_TEST_PROVISIONING;
  expect(() => provisionReportOwnerForTest(
    { reportId: "test-gate", clientId: ownerId, snapshotPath },
    disabledProvisioning,
  )).toThrow("Report owner provisioning is unavailable");
  const testNodeEnvironment = process.env.NODE_ENV;
  mutableProcessEnvironment.NODE_ENV = "production";
  try {
    expect(() => provisionReportOwnerForTest(
      { reportId: "test-gate", clientId: ownerId, snapshotPath },
      environment,
    )).toThrow("Report owner provisioning is unavailable");
  } finally {
    mutableProcessEnvironment.NODE_ENV = testNodeEnvironment;
  }
});

it("reads and renders an active owner's signed report and lists owned metadata in stable order", async () => {
  const ownerId = createVerifiedClient("owner@example.com", "google-owner", 100);
  const otherId = createVerifiedClient("other@example.com", "google-other", 101);
  plantReport("owner-a", ownerId, 300);
  plantReport("owner-b", ownerId, 300);
  plantReport("owner-old", ownerId, 200);
  plantReport("other-new", otherId, 400);
  const ownerSession = createSession(ownerId, 1_000);
  const otherSession = createSession(otherId, 1_000);

  const owned = await readOwnedReport({
    sessionToken: ownerSession.token,
    reportId: "owner-a",
    entitlement: ACTIVE_ENTITLEMENT,
    now: 1_001,
  }, environment);
  expect(owned?.snapshot.current.spend).toBe(321);
  expect(owned?.report).toEqual({ reportId: "owner-a", createdAt: 300 });
  expect(beforeAfterSourceFromSnapshot(owned!.snapshot)).toEqual(
    beforeAfterSourceFromSnapshot(snapshot),
  );
  expect(trackingObservationFromSnapshot(owned!.snapshot)).toEqual(
    trackingObservationFromSnapshot(snapshot),
  );

  const html = renderToStaticMarkup(
    <ReportingDashboard
      report={clientReportView(owned!.snapshot, owned!.report.createdAt)}
      presentation="sidebar"
      sourceSnapshot={beforeAfterSourceFromSnapshot(owned!.snapshot)}
      tracking={trackingObservationFromSnapshot(owned!.snapshot)}
    />,
  );
  expect(html).toContain("KNOWN-POSITIVE-GOOGLE-ADS-FIELD");

  const ownerList = await listOwnedReports({
    sessionToken: ownerSession.token,
    entitlement: ACTIVE_ENTITLEMENT,
    now: 1_001,
  }, environment);
  expect(ownerList?.reports).toEqual([
    { reportId: "owner-a", createdAt: 300 },
    { reportId: "owner-b", createdAt: 300 },
    { reportId: "owner-old", createdAt: 200 },
  ]);
  expect(JSON.stringify(ownerList)).not.toContain("snapshotPath");
  expect(JSON.stringify(ownerList)).not.toContain("KNOWN-POSITIVE-GOOGLE-ADS-FIELD");

  const otherList = await listOwnedReports({
    sessionToken: otherSession.token,
    entitlement: ACTIVE_ENTITLEMENT,
    now: 1_001,
  }, environment);
  expect(otherList?.reports).toEqual([{ reportId: "other-new", createdAt: 400 }]);
});

it("returns one absence result for every refused read and list without database or filesystem mutation", async () => {
  const ownerId = createVerifiedClient("owner@example.com", "google-owner", 100);
  const otherId = createVerifiedClient("other@example.com", "google-other", 101);
  plantReport("owner-good", ownerId, 1_000);
  plantReport("other-good", otherId, 1_100);
  const ownerSession = createSession(ownerId, 2_000);
  const otherSession = createSession(otherId, 2_000);
  const revokedSession = createSession(ownerId, 2_000);
  const config = loadClientAuthConfig(environment);
  const database = openClientReportDatabase(config);
  try {
    expect(revokeSession(database, config, revokedSession.token, 2_001)).toBe(true);
  } finally {
    database.close();
  }

  const outsidePath = path.join(temporaryRoot, "outside.snapshot");
  writeSignedSnapshot(outsidePath);
  provisionPath("unsafe-path", ownerId, outsidePath);

  const symlinkPath = path.join(environment.GADS_REPORTS_DIR!, "symlink.snapshot");
  symlinkSync(path.join(environment.GADS_REPORTS_DIR!, "owner-good.snapshot"), symlinkPath);
  provisionPath("symlink", ownerId, symlinkPath);

  const missingPath = path.join(environment.GADS_REPORTS_DIR!, "missing.snapshot");
  provisionPath("missing", ownerId, missingPath);

  const corruptPath = path.join(environment.GADS_REPORTS_DIR!, "corrupt.snapshot");
  writeFileSync(corruptPath, "not-a-signed-snapshot", "utf8");
  provisionPath("corrupt", ownerId, corruptPath);

  const tamperedPath = path.join(environment.GADS_REPORTS_DIR!, "tampered.snapshot");
  const signedSnapshot = sealReportSnapshot(snapshot);
  const signatureSeparator = signedSnapshot.lastIndexOf(".");
  const firstSignatureCharacter = signedSnapshot[signatureSeparator + 1];
  const replacementCharacter = firstSignatureCharacter === "A" ? "B" : "A";
  const tamperedSignature = `${signedSnapshot.slice(0, signatureSeparator + 1)}${
    replacementCharacter
  }${
    signedSnapshot.slice(signatureSeparator + 2)
  }`;
  writeFileSync(tamperedPath, tamperedSignature, "utf8");
  provisionPath("tampered", ownerId, tamperedPath);

  const directoryPath = path.join(environment.GADS_REPORTS_DIR!, "directory.snapshot");
  mkdirSync(directoryPath);
  provisionPath("directory", ownerId, directoryPath);

  const symlinkRoot = path.join(temporaryRoot, "linked-reports");
  symlinkSync(environment.GADS_REPORTS_DIR!, symlinkRoot);
  const symlinkRootEnvironment = { ...environment, GADS_REPORTS_DIR: symlinkRoot };
  const missingConfiguration = { ...environment };
  delete missingConfiguration.CLIENT_SESSION_SECRET;

  const databaseBefore = databaseState();
  const filesystemBefore = filesystemState();
  const deniedReads = await Promise.all([
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "other-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: otherSession.token,
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: "A".repeat(43),
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: "current-portal-token",
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_000 + SESSION_LIFETIME_MS,
    }, environment),
    readOwnedReport({
      sessionToken: revokedSession.token,
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "owner-good",
      entitlement: INACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "owner-good",
      entitlement: THROWING_ENTITLEMENT,
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "owner-good",
      now: 2_002,
    }, environment),
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, missingConfiguration),
    ...["", "unsafe/report", "under_score", "x".repeat(129)].map((reportId) =>
      readOwnedReport({
        sessionToken: ownerSession.token,
        reportId,
        entitlement: ACTIVE_ENTITLEMENT,
        now: 2_002,
      }, environment)
    ),
    ...["unsafe-path", "symlink", "missing", "corrupt", "tampered", "directory"].map(
      (reportId) => readOwnedReport({
        sessionToken: ownerSession.token,
        reportId,
        entitlement: ACTIVE_ENTITLEMENT,
        now: 2_002,
      }, environment),
    ),
    readOwnedReport({
      sessionToken: ownerSession.token,
      reportId: "owner-good",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, symlinkRootEnvironment),
  ]);
  expect(deniedReads).toEqual(deniedReads.map(() => null));

  const safeList = await listOwnedReports({
    sessionToken: ownerSession.token,
    entitlement: ACTIVE_ENTITLEMENT,
    now: 2_002,
  }, environment);
  expect(safeList?.reports).toEqual([{ reportId: "owner-good", createdAt: 1_000 }]);
  const deniedLists = await Promise.all([
    listOwnedReports({
      sessionToken: "A".repeat(43),
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    listOwnedReports({
      sessionToken: "current-portal-token",
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    listOwnedReports({
      sessionToken: ownerSession.token,
      entitlement: INACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    listOwnedReports({
      sessionToken: ownerSession.token,
      entitlement: THROWING_ENTITLEMENT,
      now: 2_002,
    }, environment),
    listOwnedReports({ sessionToken: ownerSession.token, now: 2_002 }, environment),
    listOwnedReports({
      sessionToken: revokedSession.token,
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_002,
    }, environment),
    listOwnedReports({
      sessionToken: ownerSession.token,
      entitlement: ACTIVE_ENTITLEMENT,
      now: 2_000 + SESSION_LIFETIME_MS,
    }, environment),
  ]);
  expect(deniedLists).toEqual(deniedLists.map(() => null));
  expect(JSON.stringify({ deniedReads, deniedLists, safeList })).not.toContain(
    "KNOWN-POSITIVE-GOOGLE-ADS-FIELD",
  );
  expect(databaseState()).toEqual(databaseBefore);
  expect(filesystemState()).toEqual(filesystemBefore);
});

it("keeps the authenticated report route cookie-only and maps absence to not found", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app", "client", "reports", "[reportId]", "page.tsx"),
    "utf8",
  );
  expect(source).toContain("const { reportId } = await params");
  expect(source).toContain("const cookieStore = await cookies()");
  expect(source).toContain("cookieStore.get(CLIENT_SESSION_COOKIE)?.value");
  expect(source).toContain("if (!owned) notFound()");
  expect(source).not.toMatch(/searchParams|current-portal-token|readStoredReportSnapshot/);
});
