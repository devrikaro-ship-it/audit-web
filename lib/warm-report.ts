import { promises as fs } from "node:fs";
import path from "node:path";

/* Raport CALD (audit intern, pe date reale din conturi).
   Structura oglindeste scripts/warm_report.py din skill-ul audit-devrika.
   Datele (findings/verdict) sunt asamblate de agent din pull-urile reale (meta/ga4/gads)
   — judecata, nu auto-generare. Web-ul doar le stocheaza si le randeaza. */

export type WarmState = "bun" | "mediu" | "slab";
export type WarmSev = "critic" | "major" | "minor";

export type WarmKpi = { v: string; l: string; color?: string };
export type WarmChannel = {
  name: string;
  verdict: string;           // text badge ("functioneaza", "neexploatat", ...)
  state: WarmState;
  kpis: WarmKpi[];
  score?: number;            // 0-100 sanatate cont (optional)
  note?: string;
};
export type WarmFinding = {
  title: string;
  problema: string;
  fix?: string;
  meta?: string;             // ex: "35 campanii · 4.000 lei/an"
  sev?: WarmSev;
};
export type WarmGun = {
  left_lab?: string; left: string; left_sub?: string;
  vs?: string;
  right_lab?: string; right: string; right_sub?: string;
  note?: string;             // poate contine HTML simplu
  strike?: boolean;          // taie valoarea stanga (default true)
};
export type WarmTargets = { cpa?: string; troas?: string; aov?: string; business?: string; business_l?: string };
export type WarmStep = { t: string; d?: string };
export type WarmOpportunity = { h?: string; v: string; b?: string };

export type WarmReport = {
  slug: string;
  client: string;
  domain?: string;
  date: string;
  vertical?: string;
  subtitle?: string;
  verdict: string;           // poate contine HTML simplu (<b>)
  targets?: WarmTargets;
  channels: WarmChannel[];
  gun?: WarmGun;
  opportunity?: WarmOpportunity;
  proof?: string[];          // chip-uri (pot contine <b>)
  proof_h?: string;
  quickwins?: WarmStep[];
  google?: WarmFinding[];
  google_sub?: string;
  meta?: WarmFinding[];
  meta_sub?: string;
  plan?: WarmStep[];
  createdAt: number;
};

const FILE = process.env.WARM_FILE || path.join(process.cwd(), "data", "warm-reports.json");

declare global {
  // eslint-disable-next-line no-var
  var __warmCache: WarmReport[] | undefined;
  // eslint-disable-next-line no-var
  var __warmWrite: Promise<void> | undefined;
}

async function load(): Promise<WarmReport[]> {
  if (global.__warmCache) return global.__warmCache;
  try {
    global.__warmCache = JSON.parse(await fs.readFile(FILE, "utf8")) as WarmReport[];
  } catch {
    global.__warmCache = [];
  }
  return global.__warmCache;
}

async function persist(): Promise<void> {
  const data = global.__warmCache ?? [];
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export async function saveWarmReport(rec: WarmReport): Promise<void> {
  const list = await load();
  const i = list.findIndex(r => r.slug === rec.slug);
  if (i >= 0) list[i] = rec; else list.unshift(rec);
  global.__warmWrite = (global.__warmWrite ?? Promise.resolve()).then(persist, persist);
  await global.__warmWrite;
}

export async function getWarmReport(slug: string): Promise<WarmReport | undefined> {
  return (await load()).find(r => r.slug === slug);
}

export async function listWarmReports(): Promise<WarmReport[]> {
  return [...(await load())].sort((a, b) => b.createdAt - a.createdAt);
}
