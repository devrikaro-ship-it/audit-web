import { promises as fs } from "node:fs";
import path from "node:path";
import type { AuditData } from "./types";

/* Store durabil (fisier JSON pe volum persistent) pentru audituri finalizate + contact.
   Supravietuieste redeploy-ului => link-urile de raport raman valide si dashboard-ul are istoricul. */

export type StoredAudit = {
  id: string;
  url: string;
  domain: string;
  scor: number;
  createdAt: number;
  nume?: string;
  email?: string;
  telefon?: string;
  tipBusiness?: string;
  platforma?: string;
  probleme?: string[];
  data: AuditData;
};

const FILE = process.env.LEADS_FILE || path.join(process.cwd(), "data", "audits.json");

declare global {
  // eslint-disable-next-line no-var
  var __leadsCache: StoredAudit[] | undefined;
  // eslint-disable-next-line no-var
  var __leadsWrite: Promise<void> | undefined;
}

async function load(): Promise<StoredAudit[]> {
  if (global.__leadsCache) return global.__leadsCache;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    global.__leadsCache = JSON.parse(raw) as StoredAudit[];
  } catch {
    global.__leadsCache = [];
  }
  return global.__leadsCache;
}

// scriere serializata (un singur container => lant de promisiuni evita coruperea)
async function persist(): Promise<void> {
  const data = global.__leadsCache ?? [];
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export async function saveAudit(rec: StoredAudit): Promise<void> {
  const list = await load();
  const i = list.findIndex(a => a.id === rec.id);
  if (i >= 0) list[i] = rec; else list.unshift(rec);
  global.__leadsWrite = (global.__leadsWrite ?? Promise.resolve()).then(persist, persist);
  await global.__leadsWrite;
}

export async function getAudit(id: string): Promise<StoredAudit | undefined> {
  return (await load()).find(a => a.id === id);
}

export async function listAudits(): Promise<StoredAudit[]> {
  return [...(await load())].sort((a, b) => b.createdAt - a.createdAt);
}
