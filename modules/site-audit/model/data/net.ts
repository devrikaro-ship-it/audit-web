// The network seam of the website audit: the only place that calls fetch() for an audited site. Every HTTP
// primitive (timeout and abort, user agent, swallowed errors, TTFB, PageSpeed, product feed probe) lives here, so
// tests mock one place and an address guard would go in one place.

export const FETCH_TIMEOUT = 12000;

// One real-browser identity for every request to an audited site (Darwin, siteFetch.js, 10-08: a shop answered 429
// to a request without a browser user agent and 200 to one with it, so two identities read two different sites).
export const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": BROWSER_UA },
    });
  } finally {
    clearTimeout(timer);
  }
}

// "Not now" is not "no": a rate limit (429), a server error (5xx) or a timeout is retried after a short pause, or
// what Retry-After asks, bounded; 403 and 404 are not, insisting does not make a page exist (Darwin, siteFetch.js).
// Without this the audit silently reads empty sitemaps and skips pages.
const RETRY_PAUSES_MS = [1000, 2500];
const RETRY_MAX_WAIT_MS = 4000;
const pause = (ms: number) => new Promise((done) => setTimeout(done, Math.min(Math.max(ms, 0), RETRY_MAX_WAIT_MS)));
async function fetchWithRetry(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= RETRY_PAUSES_MS.length;
    let r: Response;
    try {
      r = await fetchWithTimeout(url, timeout);
    } catch (e) {
      if (last) throw e;
      await pause(RETRY_PAUSES_MS[attempt]);
      continue;
    }
    if (last || (r.status !== 429 && r.status < 500)) return r;
    void r.body?.cancel();
    const retryAfter = Number(r.headers.get("retry-after"));
    await pause(r.headers.has("retry-after") && Number.isFinite(retryAfter) ? retryAfter * 1000 : RETRY_PAUSES_MS[attempt]);
  }
}

export async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetchWithRetry(url);
    return r.ok ? r.text() : "";
  } catch { return ""; }
}

export type PageData = {
  url: string;
  html: string;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
  finalUrl?: string; // the address after redirects, when it differs from the one asked for
};

export async function fetchPage(url: string): Promise<PageData> {
  try {
    const r = await fetchWithRetry(url, 10000);
    const html = r.ok ? await r.text() : "";
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { url, html, status: r.status, headers, ok: r.ok, ...(r.url && r.url !== url ? { finalUrl: r.url } : {}) };
  } catch {
    return { url, html: "", status: 0, headers: {}, ok: false };
  }
}

// Timpul pana cand serverul livreaza headerele raspunsului (~TTFB). fetch() se
// rezolva la sosirea headerelor, inainte de corpul paginii.
export async function measureTTFB(url: string): Promise<number | null> {
  try {
    const t0 = Date.now();
    const r = await fetchWithTimeout(url, 10000);
    const ms = Date.now() - t0;
    void r.body?.cancel();
    return ms;
  } catch { return null; }
}

const PRODUCT_FEED_PATHS = [
  "/feed", "/product-feed", "/feed.xml", "/wp-content/uploads/woo-feed",
  "/index.php?route=extension/feed/google_sitemap", "/googlebase.xml", "/feed/google",
  "/products.json", "/sitemap_products_1.xml", "/collections/all.atom",
];

// Verifica daca exista un feed de produse public (pentru Google Shopping / catalog Meta).
export async function probeProductFeed(origin: string): Promise<boolean> {
  const checks = await Promise.allSettled(
    PRODUCT_FEED_PATHS.map(async (p) => {
      try {
        const r = await fetchWithTimeout(origin + p, 6000);
        void r.body?.cancel();
        return r.status === 200;
      } catch { return false; }
    })
  );
  return checks.some((c) => c.status === "fulfilled" && c.value === true);
}

export type PSIResult = {
  score: number;
  lcp: string;
  cls: string;
  tbt: string;
};

export { UNAVAILABLE } from "@/modules/site-audit/model/copy-registry";
import { UNAVAILABLE } from "@/modules/site-audit/model/copy-registry";

export async function fetchPSI(url: string, strategy: "mobile" | "desktop"): Promise<PSIResult | null> {
  try {
    // Fara cheie, endpointul public da 429 pe volum (limita anonima). Cu cheia din
    // env, quota e per-proiect Google. PAGESPEED_API_KEY se seteaza in .env.local + Coolify.
    const key = process.env.PAGESPEED_API_KEY ? `&key=${process.env.PAGESPEED_API_KEY}` : "";
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${key}&fields=lighthouseResult.categories.performance.score,lighthouseResult.audits`;
    const r = await fetchWithTimeout(endpoint, 25000);
    if (!r.ok) return null;
    const json = await r.json();
    const audits = json?.lighthouseResult?.audits ?? {};
    // Lighthouse omits the score when it could not measure the page: that is no measurement, not a score of 0.
    const raw = json?.lighthouseResult?.categories?.performance?.score;
    if (typeof raw !== "number") return null;
    const timing = (id: string): string => audits[id]?.displayValue ?? UNAVAILABLE;
    return {
      score: Math.round(raw * 100),
      lcp: timing("largest-contentful-paint"),
      cls: timing("cumulative-layout-shift"),
      tbt: timing("total-blocking-time"),
    };
  } catch { return null; }
}
