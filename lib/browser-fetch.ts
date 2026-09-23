// Reading a shop through the real browser (BrightData, residential EU IP) when it blocks or rate-limits the
// server's datacenter IP. Measured 2026-09-23 from the Hetzner server: spishop.ro and vegis.ro answer 403,
// invictusmedical.ro accepts about 2 requests per 7 s; from a residential IP the same stores read 58-60 pages.
// The homepage is opened once (it clears the anti-bot challenge), then every other URL is fetched from inside
// that page, with the same IP and cookies.

import type { PageData } from "./net";
import { withCountry } from "./css-detect";

export type PageFetcher = {
  fetchText: (url: string) => Promise<string>;
  fetchPage: (url: string) => Promise<PageData>;
  homeHtml: string;
  close: () => Promise<void>;
};

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
