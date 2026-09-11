import "server-only";

import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { loadClientAuthConfig } from "@/lib/client-auth/config";
import { openReportSnapshot, type GadsReportSnapshot } from "@/lib/gads-report-delivery";
import { authenticateSession, type ClientSession } from "@/lib/client-session";
import {
  findOwnedReport,
  isValidReportId,
  listOwnedReportRecords,
  openClientReportDatabase,
  provisionReportOwnerForTest,
  type OwnedReportMetadata,
  type OwnedReportRecord,
} from "./database";

const MAXIMUM_SNAPSHOT_BYTES = 16 * 1024 * 1024;

export interface ClientReportEntitlement {
  canReadGoogleAdsReports(clientId: string): boolean | Promise<boolean>;
}

const denyAllEntitlement: ClientReportEntitlement = Object.freeze({
  canReadGoogleAdsReports: () => false,
});

export const DENY_ALL_CLIENT_REPORT_ENTITLEMENT = denyAllEntitlement;

export type OwnedReport = OwnedReportMetadata;

type ReportAccessInput = Readonly<{
  sessionToken?: string;
  entitlement?: ClientReportEntitlement;
  now?: number;
}>;

function configuredReportRoot(environment: NodeJS.ProcessEnv): string | null {
  const configured = environment.GADS_REPORTS_DIR;
  if (
    !configured
    || configured !== configured.trim()
    || !path.isAbsolute(configured)
    || path.normalize(configured) !== configured
  ) {
    return null;
  }
  return configured;
}

function isBeneath(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative.length > 0
    && !path.isAbsolute(relative)
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`);
}

async function resolveSafeSnapshotPath(
  reportId: string,
  snapshotPath: string,
  environment: NodeJS.ProcessEnv,
): Promise<string | null> {
  const root = configuredReportRoot(environment);
  if (
    !root
    || !isValidReportId(reportId)
    || !path.isAbsolute(snapshotPath)
    || path.normalize(snapshotPath) !== snapshotPath
    || path.extname(snapshotPath) !== ".snapshot"
    || path.resolve(snapshotPath) !== path.resolve(root, `${reportId}.snapshot`)
    || !isBeneath(root, snapshotPath)
  ) {
    return null;
  }

  const rootMetadata = await lstat(root);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) return null;
  const canonicalRoot = await realpath(root);

  const relativeParts = path.relative(root, snapshotPath).split(path.sep);
  let current = root;
  for (const [index, part] of relativeParts.entries()) {
    current = path.join(current, part);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) return null;
    const isSnapshot = index === relativeParts.length - 1;
    if (isSnapshot ? !metadata.isFile() : !metadata.isDirectory()) return null;
  }

  const canonicalSnapshot = await realpath(snapshotPath);
  return isBeneath(canonicalRoot, canonicalSnapshot) ? canonicalSnapshot : null;
}

async function readSafeSnapshot(snapshotPath: string): Promise<string | null> {
  const handle = await open(snapshotPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > MAXIMUM_SNAPSHOT_BYTES) return null;
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}

async function openOwnedSnapshot(
  record: OwnedReportRecord,
  environment: NodeJS.ProcessEnv,
): Promise<GadsReportSnapshot | null> {
  try {
    const safePath = await resolveSafeSnapshotPath(
      record.reportId,
      record.snapshotPath,
      environment,
    );
    if (!safePath) return null;
    const rawSnapshot = await readSafeSnapshot(safePath);
    return rawSnapshot === null ? null : openReportSnapshot(rawSnapshot);
  } catch {
    return null;
  }
}

export async function readOwnedReport(
  input: ReportAccessInput & Readonly<{ reportId: string }>,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<{ session: ClientSession; report: OwnedReport; snapshot: GadsReportSnapshot } | null> {
  try {
    const config = loadClientAuthConfig(environment);
    const database = openClientReportDatabase(config);
    let session: ClientSession | null;
    let record: OwnedReportRecord | null;
    try {
      session = authenticateSession(database, config, input.sessionToken, input.now);
      if (!session) return null;
      record = findOwnedReport(database, session.clientId, input.reportId);
      if (!record) return null;
    } finally {
      database.close();
    }

    const entitlement = input.entitlement ?? denyAllEntitlement;
    if (!await entitlement.canReadGoogleAdsReports(session.clientId)) return null;
    const snapshot = await openOwnedSnapshot(record, environment);
    if (!snapshot) return null;
    return {
      session,
      report: { reportId: record.reportId, createdAt: record.createdAt },
      snapshot,
    };
  } catch {
    return null;
  }
}

export async function listOwnedReports(
  input: ReportAccessInput,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<{ session: ClientSession; reports: OwnedReport[] } | null> {
  try {
    const config = loadClientAuthConfig(environment);
    const database = openClientReportDatabase(config);
    let session: ClientSession | null;
    let records: OwnedReportRecord[];
    try {
      session = authenticateSession(database, config, input.sessionToken, input.now);
      if (!session) return null;
      records = listOwnedReportRecords(database, session.clientId);
    } finally {
      database.close();
    }

    const entitlement = input.entitlement ?? denyAllEntitlement;
    if (!await entitlement.canReadGoogleAdsReports(session.clientId)) return null;
    const reports: OwnedReport[] = [];
    for (const record of records) {
      if (await openOwnedSnapshot(record, environment)) {
        reports.push({ reportId: record.reportId, createdAt: record.createdAt });
      }
    }
    return { session, reports };
  } catch {
    return null;
  }
}

export { provisionReportOwnerForTest };
