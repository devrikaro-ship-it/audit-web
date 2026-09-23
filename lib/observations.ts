// Knowledge base stage 2: one observation per finished audit, appended on the production data volume
// (docs/superpowers/specs/2026-09-23-platform-knowledge-base-design.md). Learning (stage 3) reads these.
import { promises as fs } from "node:fs";
import path from "node:path";

export type Observation = {
  at: number;
  domain: string;
  platform: string;          // profile used ("generic" when unknown)
  sitemap: string;           // sitemap URL the typed URLs came from ("" = none)
  urls: { product: number; category: number; other: number };
  fetched: number;
  ok: number;
  refused: number;           // 403 + 429
  usedBrowser: boolean;
  blocked: boolean;          // homepage not readable at all: contributes nothing to rules or parameters
  products: number;
  categories: number;
  failedChecks: string[];    // check ids not ok
  durationMs: number;
};

const FILE = process.env.OBSERVATIONS_FILE
  || path.join(path.dirname(process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "platform-knowledge", "observations.jsonl");

let chain: Promise<void> = Promise.resolve();

export async function appendObservation(o: Observation, file = FILE): Promise<void> {
  const write = async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(o) + "\n", "utf8");
  };
  chain = chain.then(write, write);
  await chain;
}

export async function readObservations(file = FILE): Promise<Observation[]> {
  try {
    return (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).flatMap((l) => {
      try { return [JSON.parse(l) as Observation]; } catch { return []; }
    });
  } catch { return []; }
}

export type PlatformSummary = { platform: string; audits: number; avgPages: number; avgProducts: number; browserPct: number; blockedPct: number; topFailed: string[] };

export function summarizeByPlatform(obs: Observation[]): PlatformSummary[] {
  const by = new Map<string, Observation[]>();
  for (const o of obs) by.set(o.platform, [...(by.get(o.platform) ?? []), o]);
  return [...by.entries()].map(([platform, list]) => {
    const readable = list.filter((o) => !o.blocked);
    const avg = (f: (o: Observation) => number) => (readable.length ? Math.round(readable.reduce((s, o) => s + f(o), 0) / readable.length) : 0);
    const counts = new Map<string, number>();
    for (const o of readable) for (const c of o.failedChecks) counts.set(c, (counts.get(c) ?? 0) + 1);
    return {
      platform,
      audits: list.length,
      avgPages: avg((o) => o.ok),
      avgProducts: avg((o) => o.products),
      browserPct: Math.round((100 * list.filter((o) => o.usedBrowser).length) / list.length),
      blockedPct: Math.round((100 * list.filter((o) => o.blocked).length) / list.length),
      topFailed: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
    };
  }).sort((a, b) => b.audits - a.audits);
}
