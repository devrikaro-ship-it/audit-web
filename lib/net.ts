// Seam-ul de retea al auditului: singurul loc care atinge fetch() direct.
// Toate primitivele HTTP (timeout+abort, UA, inghitirea erorilor, TTFB, PSI,
// probe de feed) traiesc aici. Inainte erau imprastiate in mijlocul audit-engine,
// amestecate cu scoring-ul. Concentrarea lor da: (a) un punct unic de mock in teste
// si (b) chokepoint-ul unde s-ar adauga o garda SSRF (validare IP) daca e nevoie.

export const FETCH_TIMEOUT = 12000;

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

// ── Vitals pentru raportul de migrare (docs/MIGRARE-SPEC.md) ──
// fetchPSI de mai jos da doar cifrele de LAB (simulare pe mobil 4G) pentru rubrica
// UX/UI a raportului RECE. Cazul de migrare are nevoie de altceva: date de CAMP
// (CrUX = utilizatori reali, ultimele 28 zile) — singura dovada pe care un client
// nu o poate contesta cu "la mine merge repede" — plus greutatea reala a paginii.
// Functie separata, ca sa nu ating contractul lui fetchPSI (zero regresie pe RECE).

export type FieldVitals = {
  lcpMs: number | null;      // Largest Contentful Paint, percentila 75 useri reali
  ttfbMs: number | null;     // raspunsul serverului — levierul principal la migrare
  fcpMs: number | null;
  inpMs: number | null;      // interactivitate
  cls: number | null;        // 0-1 (API-ul da x100)
  overall: string | null;    // FAST | AVERAGE | SLOW
  hasData: boolean;          // false = trafic sub pragul CrUX -> nu inventam cifre
};

export type LabVitals = {
  perfScore: number | null;  // 0-100, mobil
  lcpMs: number | null;
  ttiMs: number | null;
  tbtMs: number | null;
  weightKb: number | null;   // greutatea totala a paginii
  unusedJsKb: number | null; // JS livrat si nefolosit (semnatura de plugin bloat)
};

export type PlatformVitals = { field: FieldVitals; lab: LabVitals };

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

// Extrage numarul de bytes dintr-un audit Lighthouse (numericValue in bytes).
const kbOf = (v: unknown): number | null => {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n / 1024);
};

// Cat asteptam PageSpeed. MASURAT pe robinetulmeu.ro (WooCommerce, 14,5 MB): 40,4 s
// cu cache rece. Google ruleaza un Lighthouse real, iar magazinele lente — exact cele
// pentru care are sens raportul asta — sunt cele mai lente de analizat. Un timeout de
// 30 s le taie tocmai pe ele si raportul iese fara dovada principala.
const PSI_TIMEOUT = 90000;

export async function fetchPlatformVitals(url: string): Promise<PlatformVitals | null> {
  try {
    const key = process.env.PAGESPEED_API_KEY ? `&key=${process.env.PAGESPEED_API_KEY}` : "";
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}` +
      `&strategy=mobile&category=performance${key}`;
    // O reincercare: prima cerere incalzeste cache-ul Google, a doua vine rapid.
    let r = await fetchWithTimeout(endpoint, PSI_TIMEOUT);
    if (!r.ok && (r.status === 429 || r.status >= 500)) {
      r = await fetchWithTimeout(endpoint, PSI_TIMEOUT);
    }
    if (!r.ok) return null;
    const json = await r.json();

    // CrUX: loadingExperience = pagina; originLoadingExperience = tot domeniul.
    // Cadem pe origin cand pagina n-are trafic destul (sunt magazine mici).
    const pageExp = json?.loadingExperience;
    const originExp = json?.originLoadingExperience;
    const exp = pageExp?.metrics ? pageExp : originExp;
    const m = exp?.metrics ?? {};
    const p = (k: string): number | null => numOrNull(m?.[k]?.percentile);
    const clsRaw = p("CUMULATIVE_LAYOUT_SHIFT_SCORE");

    const field: FieldVitals = {
      lcpMs: p("LARGEST_CONTENTFUL_PAINT_MS"),
      ttfbMs: p("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
      fcpMs: p("FIRST_CONTENTFUL_PAINT_MS"),
      inpMs: p("INTERACTION_TO_NEXT_PAINT"),
      cls: clsRaw == null ? null : clsRaw / 100,
      overall: exp?.overall_category ?? null,
      hasData: Boolean(exp?.metrics),
    };

    const a = json?.lighthouseResult?.audits ?? {};
    const lab: LabVitals = {
      perfScore: numOrNull(json?.lighthouseResult?.categories?.performance?.score) != null
        ? Math.round(json.lighthouseResult.categories.performance.score * 100)
        : null,
      lcpMs: Math.round(numOrNull(a["largest-contentful-paint"]?.numericValue) ?? 0) || null,
      ttiMs: Math.round(numOrNull(a["interactive"]?.numericValue) ?? 0) || null,
      tbtMs: Math.round(numOrNull(a["total-blocking-time"]?.numericValue) ?? 0) || null,
      weightKb: kbOf(a["total-byte-weight"]?.numericValue),
      unusedJsKb: kbOf(a["unused-javascript"]?.details?.overallSavingsBytes),
    };

    return { field, lab };
  } catch { return null; }
}

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
