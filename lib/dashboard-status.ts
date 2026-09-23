// Sales status per dashboard row, kept apart from the audit records so a status change never rewrites an audit.
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLeadStatus, type LeadStatus } from "./dashboard-rows";

const FILE = process.env.DASHBOARD_STATUS_FILE
  || path.join(path.dirname(process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "dashboard-status.json");

type Entry = { status: LeadStatus; updatedAt: number };
let chain: Promise<void> = Promise.resolve();

async function load(file = FILE): Promise<Record<string, Entry>> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as Record<string, Entry>; } catch { return {}; }
}

export async function listStatuses(file = FILE): Promise<Record<string, string>> {
  const all = await load(file);
  return Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.status]));
}

export async function setStatus(key: string, status: unknown, file = FILE): Promise<boolean> {
  if (!/^(site|gads):[\w:.-]{1,120}$/.test(key) || !isLeadStatus(status)) return false;
  const write = async () => {
    const all = await load(file);
    all[key] = { status, updatedAt: Date.now() };
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(all, null, 2), "utf8");
    await fs.rename(tmp, file);
  };
  chain = chain.then(write, write);
  await chain;
  return true;
}
