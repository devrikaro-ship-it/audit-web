// Knowledge base stage 3: learning with a safety gate (operator, 2026-09-23).
// 1. Bounded parameter: each platform's concurrency follows its recent refusals, never below 1 or above 8.
// 2. Candidate reading rules: a URL prefix confirmed as product (or category) pages is promoted on its own only when
//    seen on at least MIN_DOMAINS distinct domains of that platform with no contradiction; otherwise it waits for
//    the operator's approval in the dashboard. Blocked domains teach nothing.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Observation } from "./observations";
import type { PlatformProfile } from "./platform-knowledge";

export const MIN_DOMAINS = 5;
const RECENT = 10;
const REFUSED_LIMIT = 0.2;
const MIN_CONC = 1, MAX_CONC = 8;

export type Candidate = {
  platform: string; kind: "product" | "category"; signal: string;
  domains: number; contradicted: boolean; status: "promoted" | "approved" | "pending" | "rejected";
};
export type Learning = { concurrency: Record<string, number>; candidates: Candidate[] };

export function learnedConcurrency(obs: Observation[], base: number): number {
  const recent = obs.filter((o) => !o.blocked).slice(-RECENT);
  const fetched = recent.reduce((s, o) => s + o.fetched, 0);
  if (!fetched) return base;
  const ratio = recent.reduce((s, o) => s + o.refused, 0) / fetched;
  const next = ratio > REFUSED_LIMIT ? Math.floor(base / 2) : recent.length >= 5 && ratio === 0 ? base + 1 : base;
  return Math.min(MAX_CONC, Math.max(MIN_CONC, next));
}

export function computeLearning(obs: Observation[], profiles: PlatformProfile[], approved: string[] = []): Learning {
  const concurrency: Record<string, number> = {};
  const candidates: Candidate[] = [];
  for (const profile of profiles) {
    const list = obs.filter((o) => o.platform === profile.platform);
    if (!list.length) continue;
    concurrency[profile.platform] = learnedConcurrency(list, profile.concurrency);
    const readable = list.filter((o) => !o.blocked);
    for (const kind of ["product", "category"] as const) {
      const other = kind === "product" ? "category" : "product";
      const domains = new Map<string, Set<string>>();
      for (const o of readable) for (const p of (kind === "product" ? o.productPrefixes : o.categoryPrefixes) ?? []) {
        domains.set(p, (domains.get(p) ?? new Set()).add(o.domain));
      }
      for (const [signal, ds] of domains) {
        if (profile.urlSignals[kind].includes(signal)) continue; // already known
        const contradicted = readable.some((o) => ((other === "product" ? o.productPrefixes : o.categoryPrefixes) ?? []).includes(signal))
          || profile.urlSignals.skip.includes(signal);
        const key = candidateKey(profile.platform, kind, signal);
        const status: Candidate["status"] = contradicted ? "rejected"
          : ds.size >= MIN_DOMAINS ? "promoted" : approved.includes(key) ? "approved" : "pending";
        candidates.push({ platform: profile.platform, kind, signal, domains: ds.size, contradicted, status });
      }
    }
  }
  return { concurrency, candidates: candidates.sort((a, b) => b.domains - a.domains) };
}

export function candidateKey(platform: string, kind: string, signal: string): string {
  return `${platform}|${kind}|${signal}`;
}

// The profile the engine reads with: curated layer + learned concurrency + promoted or approved URL signals.
export function effectiveProfile(profile: PlatformProfile, learning: Learning): PlatformProfile {
  const active = learning.candidates.filter((c) => c.platform === profile.platform && (c.status === "promoted" || c.status === "approved"));
  const add = (kind: "product" | "category") => [...profile.urlSignals[kind], ...active.filter((c) => c.kind === kind).map((c) => c.signal)];
  return {
    ...profile,
    concurrency: learning.concurrency[profile.platform] ?? profile.concurrency,
    urlSignals: { ...profile.urlSignals, product: add("product"), category: add("category") },
  };
}

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
