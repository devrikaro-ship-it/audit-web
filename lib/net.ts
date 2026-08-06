// Seam-ul de retea al auditului: singurul loc care atinge fetch() direct.
// Toate primitivele HTTP (timeout+abort, UA, inghitirea erorilor, TTFB, PSI,
// probe de feed) traiesc aici. Inainte erau imprastiate in mijlocul audit-engine,
// amestecate cu scoring-ul. Concentrarea lor da: (a) un punct unic de mock in teste
// si (b) chokepoint-ul unde s-ar adauga o garda SSRF (validare IP) daca e nevoie.

export const FETCH_TIMEOUT = 12000;

export type GoogleAdsAuth = {
  accessToken: string;
  developerToken: string;
  /** MCC-ul din care se face cererea, cand contul e sub un manager. Fara cratime. */
  loginCustomerId?: string;
};

/**
 * Un search GAQL pe Google Ads API (REST, v21), cu paginare.
 * NB: endpointul `search` nu accepta `pageSize` (PAGE_SIZE_NOT_SUPPORTED) — doar pageToken.
 * Aici, nu in intake, pentru ca acesta e singurul fisier care are voie sa atinga fetch().
 * READ-ONLY prin natura endpoint-ului: `search` doar citeste.
 */
export async function googleAdsSearch(
  customerId: string,
  query: string,
  auth: GoogleAdsAuth
): Promise<Record<string, unknown>[]> {
  const cid = customerId.replace(/-/g, "");
  const url = `https://googleads.googleapis.com/v21/customers/${cid}/googleAds:search`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "developer-token": auth.developerToken,
    "Content-Type": "application/json",
  };
  if (auth.loginCustomerId) headers["login-customer-id"] = auth.loginCustomerId.replace(/-/g, "");

  const rows: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  do {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000); // cataloagele mari sunt lente
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({ query, pageToken }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Mesajul Google e mult mai util decat statusul — il pastram, taiat.
      throw new Error(`Google Ads API ${res.status}: ${body.slice(0, 400)}`);
    }
    const json = (await res.json()) as { results?: Record<string, unknown>[]; nextPageToken?: string };
    if (json.results) rows.push(...json.results);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return rows;
}

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AuditBot/1.0)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetchWithTimeout(url);
    return r.ok ? r.text() : "";
  } catch { return ""; }
}

export type PageData = {
  url: string;
  html: string;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
};

export async function fetchPage(url: string): Promise<PageData> {
  try {
    const r = await fetchWithTimeout(url, 10000);
    const html = r.ok ? await r.text() : "";
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { url, html, status: r.status, headers, ok: r.ok };
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
    const score = Math.round((json?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
    return {
      score,
      lcp: audits["largest-contentful-paint"]?.displayValue ?? "—",
      cls: audits["cumulative-layout-shift"]?.displayValue ?? "—",
      tbt: audits["total-blocking-time"]?.displayValue ?? "—",
    };
  } catch { return null; }
}
