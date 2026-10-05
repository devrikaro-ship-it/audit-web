// Knowledge base stage 3: the operator's approvals of learned reading rules, kept on the data volume.
import { promises as fs } from "node:fs";
import path from "node:path";

const APPROVALS = process.env.LEARNING_APPROVALS_FILE
  || path.join(path.dirname(process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "platform-knowledge", "approved.json");

export async function readApprovals(file = APPROVALS): Promise<string[]> {
  try { const v = JSON.parse(await fs.readFile(file, "utf8")); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

export async function approveCandidate(key: string, file = APPROVALS): Promise<boolean> {
  if (!/^[\w.-]{1,40}\|(product|category)\|\/[\w.-]{1,60}\/$/.test(key)) return false;
  const all = await readApprovals(file);
  if (!all.includes(key)) all.push(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(`${file}.tmp`, JSON.stringify(all, null, 2), "utf8");
  await fs.rename(`${file}.tmp`, file);
  return true;
}
