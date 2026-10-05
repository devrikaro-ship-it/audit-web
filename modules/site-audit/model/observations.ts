// Knowledge base stage 2: the observation one finished audit leaves, and the summaries read from them.

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
  productPrefixes?: string[];  // first path segment of confirmed product pages that have a deeper path ("/cumpara/")
  categoryPrefixes?: string[]; // same for confirmed category pages
  durationMs: number;
};

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

// "/cumpara/9218-maner" -> "/cumpara/"; one-segment URLs carry no prefix to learn from.
export function pathPrefixes(urls: string[], max = 5): string[] {
  const seen = new Map<string, number>();
  for (const u of urls) {
    try {
      const segs = new URL(u).pathname.split("/").filter(Boolean);
      if (segs.length < 2) continue;
      const p = `/${segs[0].toLowerCase()}/`;
      seen.set(p, (seen.get(p) ?? 0) + 1);
    } catch { /* not a URL */ }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([p]) => p);
}
