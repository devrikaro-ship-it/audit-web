// How the audit reads a site that may refuse the server: when to switch to the real browser, and the retry of
// opening it. Pure: the reads themselves are passed in.

// The server is blocked when the homepage does not come back, comes back as an anti-bot challenge, or when a
// large share of the pages it asked for were refused (403/429).
export function looksBlocked(homeOk: boolean, homeHtml: string, statuses: number[] = []): boolean {
  if (!homeOk) return true;
  if (/Just a moment|cf-mitigated|challenge-platform|Attention Required|_cf_chl/i.test(homeHtml)) return true;
  const refused = statuses.filter((s) => s === 403 || s === 429).length;
  return statuses.length >= 5 && refused / statuses.length >= 0.3;
}

export const PROBE_PAGES = 8;

// Reads a small probe first: when it is already refused, every remaining page goes through the browser at once
// instead of spending the time budget on refused requests (invictusmedical.ro from the server: 2 requests per 7 s).
export async function fetchPagesWithProbe<T extends { url: string; status: number }>(
  urls: string[],
  direct: (urls: string[]) => Promise<T[]>,
  openBrowser: () => Promise<((urls: string[]) => Promise<T[]>) | null>,
): Promise<{ pages: T[]; usedBrowser: boolean }> {
  const probe = await direct(urls.slice(0, PROBE_PAGES));
  const blockedEarly = looksBlocked(true, "", probe.map((p) => p.status));
  const browser = blockedEarly ? await openBrowser() : null;
  const rest = urls.slice(PROBE_PAGES);
  const pages = [...probe, ...(browser ? await browser(rest) : await direct(rest))];
  const lateBlocked = !browser && looksBlocked(true, "", pages.map((p) => p.status));
  const retry = browser ?? (lateBlocked ? await openBrowser() : null);
  if (retry) {
    const refused = pages.filter((p) => p.status === 403 || p.status === 429);
    const again = new Map((await retry(refused.map((p) => p.url))).map((p) => [p.url, p]));
    pages.forEach((p, i) => { const r = again.get(p.url); if (r) pages[i] = r; });
  }
  return { pages, usedBrowser: !!retry };
}

// Opening the remote browser fails now and then (measured 2026-09-23: spishop.ro read 6 pages instead of 45 after one
// failed open). One retry before giving up.
export async function openWithRetry<T>(open: () => Promise<T | null>, attempts = 2): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    const r = await open().catch(() => null);
    if (r) return r;
  }
  return null;
}
