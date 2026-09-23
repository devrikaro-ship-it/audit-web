// Reading a shop through the real browser (BrightData, residential EU IP) when it blocks or rate-limits the
// server's datacenter IP. Measured 2026-09-23 from the Hetzner server: spishop.ro and vegis.ro answer 403,
// invictusmedical.ro accepts about 2 requests per 7 s; from a residential IP the same stores read 58-60 pages.
// The homepage is opened once (it clears the anti-bot challenge), then every other URL is fetched from inside
// that page, with the same IP and cookies.

import type { PageData } from "./net";

export type PageFetcher = {
  fetchText: (url: string) => Promise<string>;
  fetchPage: (url: string) => Promise<PageData>;
  homeHtml: string;
  close: () => Promise<void>;
};

// BrightData zone credentials take the exit country as a zone suffix (zone-name-country-ro).
function withCountry(cdp: string, country: string): string {
  if (!country || cdp.includes("-country-")) return cdp;
  return cdp.replace(/(zone-[a-z0-9_]+)(:)/i, `$1-country-${country}$2`);
}

type InPageResult = { status: number; ok: boolean; html: string; headers: Record<string, string> };

export async function openBrowserFetcher(origin: string, cdpRaw = process.env.BRIGHTDATA_CDP): Promise<PageFetcher | null> {
  if (!cdpRaw) return null;
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(withCountry(cdpRaw, "ro"), { timeout: 60000 });
  try {
    const page = await browser.newPage();
    await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
    const homeHtml = await page.content();
    const inPage = (url: string) => page.evaluate(async (u: string): Promise<InPageResult> => {
      try {
        const r = await fetch(u, { credentials: "include", redirect: "follow" });
        const headers: Record<string, string> = {};
        r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
        return { status: r.status, ok: r.ok, html: r.ok ? await r.text() : "", headers };
      } catch {
        return { status: 0, ok: false, html: "", headers: {} };
      }
    }, url).catch((): InPageResult => ({ status: 0, ok: false, html: "", headers: {} }));
    return {
      homeHtml,
      fetchPage: async (url) => ({ url, ...(await inPage(url)) }),
      fetchText: async (url) => { const r = await inPage(url); return r.ok ? r.html : ""; },
      close: () => browser.close().catch(() => {}),
    };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

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
