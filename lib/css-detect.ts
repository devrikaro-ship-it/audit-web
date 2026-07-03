// CSS (Google Comparison Shopping Service) detection for a prospect domain.
// Method: search the prospect's products on Google, read the "By X" label under
// each sponsored product tile ("By Google" = Google CSS = overpaying; "By <name>"
// = third-party CSS). The label only renders in a real browser on a residential
// IP (Google suppresses Shopping ads for datacenter / plain fetch), so the browser
// transport connects over CDP to a residential scraping browser (BrightData).

export type CssTile = {
  css: string; // raw label, e.g. "By Google", "By smec"
  cssProvider: string; // "Google", "smec", ...
  seller: string | null; // store display name from the tile
  price: number | null; // advertised price (numeric)
  currency: string | null;
  merchantHost: string | null; // host from the ad landing url when decodable
  tileLines: string[]; // visible text lines of the tile (title, price, seller, ...)
};

export type CssStatus =
  | "google_css"
  | "third_party_css"
  | "not_in_shopping"
  | "unknown";

export type CssVerdict = {
  status: CssStatus;
  provider: string | null;
  matchedSeller: string | null;
  message: string;
  tilesSeen: number;
};

// Injected into the page. Returns one entry per sponsored product tile.
export const SPONSORED_EXTRACT_JS = `
(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while (n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (/^By\\s+[A-Za-z0-9 ._-]{2,30}$/.test(t) && !/RON|lei|\\d{2,}/.test(t)) nodes.push(n);
  }
  const parsePrice = (s) => {
    const m = s.match(/(\\d[\\d.]*,\\d{2})/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(/\\./g, '').replace(',', '.'));
    return isNaN(num) ? null : num;
  };
  const hostFromAclk = (href) => {
    try { const u = new URL(href, location.origin); const a = u.searchParams.get('adurl') || u.searchParams.get('url'); if (a) return new URL(a).hostname.replace(/^www\\./, ''); } catch {}
    return null;
  };
  return nodes.map((node) => {
    let box = node.parentElement;
    while (box && box.parentElement) {
      const it = box.innerText || '';
      const byCount = (it.match(/\\bBy [A-Z]/g) || []).length;
      if (byCount === 1 && /\\d[\\d.]*,\\d{2}/.test(it) && it.length < 340) break;
      box = box.parentElement;
    }
    let anchor = null, c = node.parentElement;
    for (let i = 0; i < 14 && c; i++) { if (!anchor && c.tagName === 'A' && c.getAttribute('href')) anchor = c; c = c.parentElement; }
    const lines = box ? box.innerText.split('\\n').map((s) => s.trim()).filter(Boolean) : [];
    const css = node.textContent.trim();
    const priceLine = lines.find((l) => /\\d[\\d.]*,\\d{2}/.test(l) && /RON|lei/i.test(l)) || lines.find((l) => /\\d[\\d.]*,\\d{2}/.test(l));
    // seller sits between the price and the shipping/CSS lines; skip price/unit/rating junk
    const isJunk = (l) => /RON|lei|\\/1|^\\+|^\\(|^SALE$|^Free|shipping|^Energy|^By /i.test(l) || /^[\\d.,]+$/.test(l);
    const firstPrice = lines.findIndex((l) => /\\d[\\d.]*,\\d{2}/.test(l));
    let endIdx = lines.findIndex((l, i) => i > firstPrice && (/^Free|shipping/i.test(l) || /^By /.test(l)));
    if (endIdx < 0) endIdx = lines.length;
    let seller = null;
    for (let i = firstPrice + 1; i < endIdx; i++) { if (!isJunk(lines[i])) { seller = lines[i]; break; } }
    return {
      css,
      cssProvider: css.replace(/^By\\s+/, '').trim(),
      seller,
      price: priceLine ? parsePrice(priceLine) : null,
      currency: priceLine && /RON|lei/i.test(priceLine) ? 'RON' : null,
      merchantHost: anchor ? hostFromAclk(anchor.getAttribute('href')) : null,
      tileLines: lines.slice(0, 8),
    };
  });
})()
`;

const STOPWORDS = new Set([
  "romania", "ro", "shop", "store", "official", "smart", "discounter",
  "home", "appliances", "express", "online", "magazin", "the",
]);

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(s: string): string {
  return stripDiacritics((s || "").toLowerCase())
    .replace(/\.(ro|com|net|eu|shop|store)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .join("");
}

function domainRoot(domain: string): string {
  const host = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const parts = host.split(".");
  return normalize(parts.length > 1 ? parts[parts.length - 2] : parts[0]);
}

// Seller = the tile line right before the first "Free..." shipping line, else the
// non-rating/non-price line before the CSS label.
export function parseSeller(lines: string[]): string | null {
  const freeIdx = lines.findIndex((l) => /^Free\b/i.test(l));
  if (freeIdx > 0) return lines[freeIdx - 1];
  const candidates = lines.filter(
    (l) => !/^By\s/i.test(l) && !/RON|lei/.test(l) && !/^\(/.test(l) && !/^Energy/i.test(l) && !/^\d/.test(l) && !/^SALE$/i.test(l),
  );
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function sellerOf(tile: CssTile): string | null {
  const junk = (s: string | null) => !s || /RON|lei|\/1/i.test(s) || /^[\d.,+\s]+$/.test(s);
  if (tile.seller && !junk(tile.seller)) return tile.seller;
  return parseSeller(tile.tileLines);
}

function tileMatchesDomain(domain: string, tile: CssTile): boolean {
  const root = domainRoot(domain);
  if (!root) return false;
  if (tile.merchantHost) {
    const mh = domainRoot(tile.merchantHost);
    if (mh && (mh === root || mh.includes(root) || root.includes(mh))) return true;
  }
  const seller = sellerOf(tile);
  if (seller) {
    const ns = normalize(seller);
    if (ns && (ns === root || ns.includes(root) || root.includes(ns))) return true;
  }
  return false;
}

export function classifyCss(prospectDomain: string, tiles: CssTile[]): CssVerdict {
  const matched = tiles.find((t) => tileMatchesDomain(prospectDomain, t));
  if (!matched) {
    return {
      status: tiles.length ? "not_in_shopping" : "unknown",
      provider: null,
      matchedSeller: null,
      tilesSeen: tiles.length,
      message: tiles.length
        ? "Nu am gasit produsele tale in reclamele Google Shopping - fie nu rulezi Shopping (oportunitate mare de vanzari), fie campania e limitata."
        : "Nu am putut determina statusul CSS - reclamele Shopping nu s-au afisat la verificare. Reincercam.",
    };
  }
  const seller = sellerOf(matched);
  const isGoogle = /^google$/i.test(matched.cssProvider.trim());
  return {
    status: isGoogle ? "google_css" : "third_party_css",
    provider: matched.cssProvider,
    matchedSeller: seller,
    tilesSeen: tiles.length,
    message: isGoogle
      ? 'Rulezi Google Shopping prin CSS-ul Google ("By Google") - platesti CPC pana la ~20% mai mult decat concurentii care folosesc un CSS partener. Bugetul pierdut se duce pe click-uri scumpe si produse care nu convertesc.'
      : `Rulezi Shopping printr-un CSS partener ("${matched.css}") - deja eviti suprataxa CSS-ului Google.`,
  };
}

// Build a few Google queries from crawled product data. A merchant running
// Shopping should appear on at least one of its own product searches.
// Deriva interogari de produs curate din titluri, pentru cautarea Shopping.
// Titlurile de produs vin des cu sufix de site/brand ("Produs - Magazin", "Produs | Categorie")
// si boilerplate ("cumpara online") care strica interogarea si duc la carusel gol -> "nedeterminat".
// Curatam sufixul + boilerplate + brandul, pastram 2-6 cuvinte de nume-produs.
const QUERY_STOPWORDS = /\b(cumpara|cumpără|comanda|comandă|online|magazin|pret|preț|oferta|ofertă|promotie|promoție|reducere|reduceri|nou|noua|nouă|shop|store|ieftin|livrare|gratuita|gratuită|set|buc)\b/gi;
function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function deriveProductQueries(brand: string | null, productTitles: string[], limit = 4): string[] {
  const brandLc = (brand || "").toLowerCase().trim();
  const brandRe = brandLc ? new RegExp(`\\b${escapeRegex(brandLc)}\\b`, "ig") : null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of productTitles) {
    let t = (raw || "").replace(/\s+/g, " ").trim();
    // taie tot dupa primul separator de tip site/brand
    t = t.split(/\s[-–—|•·]\s|\s:\s/)[0].trim();
    t = t.replace(QUERY_STOPWORDS, " ");
    if (brandRe) t = t.replace(brandRe, " ");
    const words = t.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim().split(" ").filter(w => w.length > 1);
    const q = words.slice(0, 6).join(" ");
    const key = q.toLowerCase();
    if (words.length >= 2 && q.length >= 6 && !seen.has(key)) { seen.add(key); out.push(q); }
    if (out.length >= limit) break;
  }
  // ultima resursa: daca n-am scos nicio interogare buna, incearca macar brandul
  if (out.length === 0 && brand) out.push(brand);
  return out.slice(0, limit);
}

// ── Shopping competitive landscape (from the same sponsored carousel) ──
export type ShoppingCompetitor = { seller: string; css: string; price: number | null };
export type ShoppingIntel = {
  present: boolean; // prospect appears in Shopping ads
  prospectPrice: number | null;
  currency: string | null;
  totalAdvertisers: number;
  competitors: ShoppingCompetitor[];
  message: string;
};

export function analyzeShopping(prospectDomain: string, tiles: CssTile[]): ShoppingIntel {
  const prospectTile = tiles.find((t) => tileMatchesDomain(prospectDomain, t));
  const seen = new Set<string>();
  const competitors: ShoppingCompetitor[] = [];
  for (const t of tiles) {
    if (tileMatchesDomain(prospectDomain, t)) continue;
    const s = sellerOf(t);
    if (!s) continue;
    const key = normalize(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    competitors.push({ seller: s, css: t.cssProvider, price: t.price });
  }
  const present = !!prospectTile;
  const names = competitors.slice(0, 5).map((c) => c.seller).join(", ");
  const message = !tiles.length
    ? "Nu am putut verifica prezenta in Google Shopping (reclamele nu s-au afisat la verificare)."
    : present
      ? `Apari in Google Shopping alaturi de ${competitors.length} concurenti pe produsele tale${names ? " (" + names + ")" : ""}.`
      : `Nu apari in reclamele Google Shopping pe aceste produse, dar ${competitors.length} concurenti da${names ? " (" + names + ")" : ""} — oportunitate directa de vanzari.`;
  return {
    present,
    prospectPrice: prospectTile?.price ?? null,
    currency: prospectTile?.currency ?? null,
    totalAdvertisers: competitors.length + (present ? 1 : 0),
    competitors,
    message,
  };
}

type DetectOpts = {
  cdpEndpoint?: string; // BrightData scraping-browser CDP url; falls back to env
  gl?: string;
  hl?: string;
  country?: string; // exit-IP country; the CSS "By X" label is EEA-only, so default RO
  maxQueries?: number;
};

// The "By X" CSS label only renders for an EEA visitor, so the residential exit
// IP must be in the EEA. Inject BrightData's -country-<cc> into the zone username.
function withCountry(cdp: string, country: string): string {
  if (!country || cdp.includes("-country-")) return cdp;
  return cdp.replace(/(zone-[a-z0-9_]+)(:)/i, `$1-country-${country}$2`);
}

// Loads each query on an already-open browser and returns the sponsored tiles
// from the query where the prospect appears (richest signal), else the last
// non-empty set.
async function collectTilesOn(browser: any, prospectDomain: string, queries: string[], opts: DetectOpts): Promise<CssTile[]> {
  const gl = opts.gl || "RO";
  const hl = opts.hl || "en";
  const page = await browser.newPage();
  try {
    let best: CssTile[] = [];
    for (const q of queries.slice(0, opts.maxQueries || 4)) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      await page.mouse.wheel(0, 3000).catch(() => {});
      await page.waitForTimeout(2000);
      await page.mouse.wheel(0, 3000).catch(() => {});
      await page.waitForTimeout(1500);
      const tiles = (await page.evaluate(SPONSORED_EXTRACT_JS)) as CssTile[];
      if (tiles.length) best = tiles;
      if (tiles.some((t) => tileMatchesDomain(prospectDomain, t))) return tiles;
    }
    return best;
  } finally {
    await page.close().catch(() => {});
  }
}

// Requires playwright-core; connects over CDP to the scraping browser.
async function collectTiles(prospectDomain: string, queries: string[], opts: DetectOpts): Promise<CssTile[]> {
  const raw = opts.cdpEndpoint || process.env.BRIGHTDATA_CDP;
  if (!raw) return [];
  const cdp = withCountry(raw, opts.country || "ro");
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(cdp, { timeout: 60000 });
  try {
    return await collectTilesOn(browser, prospectDomain, queries, opts);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function detectCss(prospectDomain: string, queries: string[], opts: DetectOpts = {}): Promise<CssVerdict> {
  const raw = opts.cdpEndpoint || process.env.BRIGHTDATA_CDP;
  if (!raw) return { status: "unknown", provider: null, matchedSeller: null, tilesSeen: 0, message: "BROWSER_NOT_CONFIGURED" };
  return classifyCss(prospectDomain, await collectTiles(prospectDomain, queries, opts));
}

export type GoogleShoppingIntel = { css: CssVerdict; shopping: ShoppingIntel };

// One browser session → both CSS verdict and the Shopping competitive landscape.
export async function analyzeGoogleShopping(prospectDomain: string, queries: string[], opts: DetectOpts = {}): Promise<GoogleShoppingIntel> {
  const raw = opts.cdpEndpoint || process.env.BRIGHTDATA_CDP;
  if (!raw) {
    return {
      css: { status: "unknown", provider: null, matchedSeller: null, tilesSeen: 0, message: "BROWSER_NOT_CONFIGURED" },
      shopping: analyzeShopping(prospectDomain, []),
    };
  }
  const tiles = await collectTiles(prospectDomain, queries, opts);
  return { css: classifyCss(prospectDomain, tiles), shopping: analyzeShopping(prospectDomain, tiles) };
}

// ── Live tracking detection (runtime, like Tag Assistant / Pixel Helpers) ──
// A server-side HTML fetch misses every tag routed through GTM (GA4, Ads, Meta,
// TikTok are injected client-side). We render the homepage in the real browser
// and read what actually fires: network requests + runtime globals.
export type LiveTracking = {
  ok: boolean;
  gtm: string | null;
  ga4: boolean;
  googleAds: boolean;
  metaPixel: boolean;
  tiktok: boolean;
  consent: boolean; // CMP present / consent signals seen
  cmp: string | null;
};

const TRACKING_GLOBALS_JS = `
(() => {
  const out = { gtmKeys: [], gtag: false, fbq: false, ttq: false, cmp: null };
  try { if (window.google_tag_manager) out.gtmKeys = Object.keys(window.google_tag_manager); } catch (e) {}
  try { out.gtag = typeof window.gtag === 'function'; } catch (e) {}
  try { out.fbq = typeof window.fbq === 'function' || typeof window._fbq !== 'undefined'; } catch (e) {}
  try { out.ttq = typeof window.ttq !== 'undefined'; } catch (e) {}
  var cmps = [['Cookiebot','Cookiebot'],['OneTrust','OneTrust'],['Optanon','OneTrust'],['CookieHub','CookieHub'],['cookieyes','CookieYes'],['Complianz','Complianz'],['Enzuzo','Enzuzo'],['iubenda','iubenda'],['__tcfapi','IAB TCF'],['Didomi','Didomi'],['usercentrics','Usercentrics']];
  for (var i = 0; i < cmps.length; i++) { try { if (window[cmps[i][0]]) { out.cmp = cmps[i][1]; break; } } catch (e) {} }
  return out;
})()
`;

function parseTracking(hits: string[], globals: any): LiveTracking {
  const H = hits.join("\n");
  const keys: string[] = (globals?.gtmKeys || []) as string[];
  const gtmFromNet = (H.match(/gtm\.js\?id=(GTM-[A-Z0-9]+)/gi) || []).map((s) => s.replace(/.*id=/i, ""));
  const gtm = [...new Set([...keys.filter((k) => /^GTM-/i.test(k)), ...gtmFromNet].map((s) => s.toUpperCase()))][0] || null;
  const ga4 = keys.some((k) => /^G-/i.test(k)) || globals?.gtag === true ||
    /[?&]tid=G-[A-Z0-9]{6,}/i.test(H) || /gtag\/js\?id=g-/i.test(H) || /google-analytics\.com\/g\/collect/i.test(H);
  const googleAds = keys.some((k) => /^AW-/i.test(k)) ||
    /gtag\/js\?id=aw-/i.test(H) || /googleadservices\.com\/pagead\/conversion/i.test(H) ||
    /googleads\.g\.doubleclick\.net\/pagead/i.test(H) || /google\.com\/pagead\/1p-conversion/i.test(H);
  const metaPixel = globals?.fbq === true || /connect\.facebook\.net\/[^/]+\/fbevents\.js/i.test(H) || /facebook\.com\/tr\/?\?/i.test(H);
  const tiktok = globals?.ttq === true || /analytics\.tiktok\.com/i.test(H);
  const cmpHostRe = /(cookiebot\.com|onetrust\.com|cookielaw\.org|enzuzo\.com|cookieyes\.com|cookie-script\.com|cookiehub\.|iubenda\.com|complianz|termly\.io|usercentrics|didomi\.io|quantcast)/i;
  const cmpHost = H.match(cmpHostRe);
  const cmp = globals?.cmp || (cmpHost ? cmpHost[0] : null);
  const consent = !!cmp || /google\.com\/ccm\/collect/i.test(H) || (globals?.gtag === true && /[?&]gcs=/i.test(H));
  return { ok: true, gtm, ga4, googleAds, metaPixel, tiktok, consent, cmp: cmp || null };
}

async function detectTrackingOnPage(browser: any, url: string): Promise<LiveTracking> {
  const page = await browser.newPage();
  const hits: string[] = [];
  page.on("request", (req: any) => { try { const u = req.url(); if (u) hits.push(u); } catch {} });
  // block heavy resources — tags fire from JS, so this is safe and cuts bandwidth
  try {
    await page.route("**/*", (route: any) => {
      const t = route.request().resourceType();
      if (t === "image" || t === "media" || t === "font") return route.abort().catch(() => {});
      return route.continue().catch(() => {});
    });
  } catch {}
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch {}
  await page.waitForTimeout(4500).catch(() => {});
  const globals = await page.evaluate(TRACKING_GLOBALS_JS).catch(() => null);
  await page.close().catch(() => {});
  return parseTracking(hits, globals);
}

function withTimeout<T>(p: Promise<T>, ms: number, fb: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
}

export type ProspectLiveIntel = { css: CssVerdict; shopping: ShoppingIntel; tracking: LiveTracking | null };

// One browser session → live tracking (homepage) + CSS verdict + Shopping
// landscape (Google searches). Each phase self-limits so a slow phase never
// discards the other's result.
export async function analyzeProspectLive(prospectDomain: string, prospectUrl: string, queries: string[], opts: DetectOpts = {}): Promise<ProspectLiveIntel> {
  const raw = opts.cdpEndpoint || process.env.BRIGHTDATA_CDP;
  const unknown: CssVerdict = { status: "unknown", provider: null, matchedSeller: null, tilesSeen: 0, message: "BROWSER_NOT_CONFIGURED" };
  if (!raw) return { css: unknown, shopping: analyzeShopping(prospectDomain, []), tracking: null };
  const cdp = withCountry(raw, opts.country || "ro");
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(cdp, { timeout: 60000 });
  let tracking: LiveTracking | null = null;
  let tiles: CssTile[] = [];
  try {
    tracking = await withTimeout(detectTrackingOnPage(browser, prospectUrl).catch(() => null), 22000, null);
    tiles = await withTimeout(collectTilesOn(browser, prospectDomain, queries, opts).catch(() => []), 38000, []);
  } finally {
    await browser.close().catch(() => {});
  }
  return { css: classifyCss(prospectDomain, tiles), shopping: analyzeShopping(prospectDomain, tiles), tracking };
}
