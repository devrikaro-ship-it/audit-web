// Seam-ul de retea al auditului: singurul loc care atinge fetch() direct.
// Toate primitivele HTTP (timeout+abort, UA, inghitirea erorilor, TTFB, PSI,
// probe de feed) traiesc aici. Inainte erau imprastiate in mijlocul audit-engine,
// amestecate cu scoring-ul. Concentrarea lor da: (a) un punct unic de mock in teste
// si (b) chokepoint-ul unde s-ar adauga o garda SSRF (validare IP) daca e nevoie.

import { gadsApiUrl } from "./gads-api";

export const FETCH_TIMEOUT = 12000;

export type GoogleAdsAuth = {
  accessToken: string;
  developerToken: string;
  /** MCC-ul din care se face cererea, cand contul e sub un manager. Fara cratime. */
  loginCustomerId?: string;
};

/**
 * Un search GAQL pe Google Ads API (REST), cu paginare. Versiunea vine din lib/gads-api.
 * NB: endpointul `search` nu accepta `pageSize` (PAGE_SIZE_NOT_SUPPORTED) — doar pageToken.
 * Aici, nu in intake, pentru ca acesta e singurul fisier care are voie sa atinga fetch().
 * READ-ONLY prin natura endpoint-ului: `search` doar citeste.
 */
/**
 * Cate interogari Google Ads lasam sa mearga deodata.
 *
 * Auditul completat trimite ~11 interogari in paralel. Masurat pe DeHome: fiecare interogare
 * dureaza sub o secunda luata separat (4s toate, una dupa alta), dar trimise toate odata
 * raportul ajungea la 20 de secunde — Google le temporizeaza, iar reincercarile noastre pun
 * peste inca 1,5 si 3 secunde de asteptare. Cu o coada scurta, paralelismul ramane util fara
 * sa se transforme in asteptare.
 */
const MAX_PARALEL = 4;
let inZbor = 0;
const coada: (() => void)[] = [];

async function ocupaLoc(): Promise<void> {
  if (inZbor < MAX_PARALEL) {
    inZbor++;
    return;
  }
  await new Promise<void>((elibereaza) => coada.push(elibereaza));
  inZbor++;
}

function elibereazaLoc(): void {
  inZbor--;
  coada.shift()?.();
}

export async function googleAdsSearch(
  customerId: string,
  query: string,
  auth: GoogleAdsAuth
): Promise<Record<string, unknown>[]> {
  await ocupaLoc();
  try {
    return await interogheaza(customerId, query, auth);
  } finally {
    elibereazaLoc();
  }
}

async function interogheaza(
  customerId: string,
  query: string,
  auth: GoogleAdsAuth
): Promise<Record<string, unknown>[]> {
  const cid = customerId.replace(/-/g, "");
  const url = gadsApiUrl(`customers/${cid}/googleAds:search`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "developer-token": auth.developerToken,
    "Content-Type": "application/json",
  };
  if (auth.loginCustomerId) headers["login-customer-id"] = auth.loginCustomerId.replace(/-/g, "");

  const rows: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  do {
    // Reincercare pe erori trecatoare. Motivul e concret: pe un catalog de ~15.000 de produse
    // (deci multe pagini) Google a intors o data 400 UNSUPPORTED_VERSION pe o versiune care
    // functiona inainte si dupa. Fara reincercare, o singura eroare de moment rupe tot auditul
    // prospectului si el vede o pagina de eroare in loc de raport.
    let res: Response | null = null;
    let ultimaEroare = "";
    for (let incercare = 0; incercare < 3; incercare++) {
      if (incercare > 0) await new Promise((r) => setTimeout(r, 1500 * incercare));
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000); // cataloagele mari sunt lente
      try {
        res = await fetch(url, {
          method: "POST",
          headers,
          signal: ctrl.signal,
          body: JSON.stringify({ query, pageToken }),
        });
      } catch (e) {
        ultimaEroare = e instanceof Error ? e.message : String(e);
        res = null;
        continue;
      } finally {
        clearTimeout(timer);
      }
      if (res.ok) break;
      ultimaEroare = `${res.status}: ${(await res.text().catch(() => "")).slice(0, 400)}`;
      // 4xx care nu e limita de rata inseamna cerere gresita — nu are rost sa insistam.
      if (res.status >= 400 && res.status < 500 && res.status !== 429 && !/UNSUPPORTED_VERSION|INTERNAL/i.test(ultimaEroare)) break;
      res = null;
    }
    if (!res || !res.ok) throw new Error(`Google Ads API ${ultimaEroare}`);

    const json = (await res.json()) as { results?: Record<string, unknown>[]; nextPageToken?: string };
    if (json.results) rows.push(...json.results);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return rows;
}

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

export const UNAVAILABLE = "Date indisponibile";

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
