import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function reportsDirectory(): string {
  return process.env.GADS_REPORTS_DIR || path.join(path.dirname(process.env.GADS_LEADS_FILE || path.join(process.cwd(), "data", "gads-leads.json")), "gads-reports");
}

function resolveStoredSnapshot(snapshotPath: string): string {
  const directory = path.resolve(reportsDirectory());
  const target = path.resolve(snapshotPath);
  if (path.dirname(target) !== directory || path.extname(target) !== ".snapshot") throw new Error("Invalid snapshot path");
  return target;
}

export async function saveStoredReportSnapshot(reportId: string, signedSnapshot: string): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(reportId)) throw new Error("Invalid report id");
  const directory = reportsDirectory();
  await mkdir(directory, { recursive: true });
  const snapshotPath = path.join(directory, `${reportId}.snapshot`);
  await writeFile(snapshotPath, signedSnapshot, "utf8");
  return snapshotPath;
}

export async function readStoredReportSnapshot(snapshotPath: string): Promise<string> {
  return readFile(resolveStoredSnapshot(snapshotPath), "utf8");
}
