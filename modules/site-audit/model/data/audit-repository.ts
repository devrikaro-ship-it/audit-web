import path from "node:path";
import { jsonStore } from "@/shared/storage/json-file";
import type { AuditData } from "@/modules/site-audit/model/types";

/* Durable store (a JSON file on the persistent volume) of finished audits and their contact details. It survives a
   redeploy, so report links stay valid and the dashboard keeps its history. */

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
   
  var __leadsCache: StoredAudit[] | undefined;
}

// Reads and writes through the shared storage (spec 2026-10-05 §6): a write lands whole, concurrent saves are
// serialized and locked, and a corrupt file is refused instead of being read as empty and overwritten with one audit.
const store = jsonStore<StoredAudit[]>(FILE, () => []);

async function load(): Promise<StoredAudit[]> {
  if (!global.__leadsCache) global.__leadsCache = await store.read();
  return global.__leadsCache;
}

export async function saveAudit(rec: StoredAudit): Promise<void> {
  global.__leadsCache = await store.update((list) => {
    const i = list.findIndex(a => a.id === rec.id);
    if (i >= 0) list[i] = rec; else list.unshift(rec);
    return { next: list, result: list };
  });
}

export async function getAudit(id: string): Promise<StoredAudit | undefined> {
  return (await load()).find(a => a.id === id);
}

export async function listAudits(): Promise<StoredAudit[]> {
  return [...(await load())].sort((a, b) => b.createdAt - a.createdAt);
}
