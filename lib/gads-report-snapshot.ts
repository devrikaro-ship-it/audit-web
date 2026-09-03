import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { PendingReportClaim } from "./gads-pending-report";

export function reportStorageDirectory(): string {
  return process.env.GADS_REPORTS_DIR || path.join(path.dirname(process.env.GADS_LEADS_FILE || path.join(process.cwd(), "data", "gads-leads.json")), "gads-reports");
}

function resolveStoredSnapshot(snapshotPath: string): string {
  const directory = path.resolve(reportStorageDirectory());
  const target = path.resolve(snapshotPath);
  if (path.dirname(target) !== directory || path.extname(target) !== ".snapshot") throw new Error("Invalid snapshot path");
  return target;
}

async function writeExactFile(target: string, contents: string): Promise<void> {
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(target, "utf8");
    if (existing !== contents) throw new Error("Refusing to overwrite immutable report snapshot");
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

export async function saveStoredReportSnapshot(reportId: string, signedSnapshot: string): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(reportId)) throw new Error("Invalid report id");
  const directory = reportStorageDirectory();
  await mkdir(directory, { recursive: true });
  const snapshotPath = path.join(directory, `${reportId}.snapshot`);
  await writeExactFile(snapshotPath, signedSnapshot);
  return snapshotPath;
}

export async function promotePendingReportSnapshot(claim: PendingReportClaim, reportId: string): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(reportId)) throw new Error("Invalid report id");
  if (!claim.signedSnapshot || !claim.pendingSnapshotPath) throw new Error("Pending report snapshot is unavailable");
  const expectedDigest = createHash("sha256").update(claim.signedSnapshot).digest("hex");
  if (expectedDigest !== claim.snapshotDigest) throw new Error("Pending report snapshot digest changed");
  const pendingBytes = await readFile(claim.pendingSnapshotPath, "utf8");
  if (pendingBytes !== claim.signedSnapshot) throw new Error("Pending report snapshot changed after claim");
  const directory = reportStorageDirectory();
  await mkdir(directory, { recursive: true });
  const snapshotPath = path.join(directory, `${reportId}.snapshot`);
  await writeExactFile(snapshotPath, claim.signedSnapshot);
  return snapshotPath;
}

export async function readStoredReportSnapshot(snapshotPath: string): Promise<string> {
  return readFile(resolveStoredSnapshot(snapshotPath), "utf8");
}
