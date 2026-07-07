// Amprenta site-ului din HTML brut — sursa UNICA pentru "ce e site-ul asta".
// Consumata si de scanul rapid (app/api/scan) si de motorul de audit (audit-engine),
// ca sa nu se poata contrazice (scanul spunea o platforma, auditul alta).
// Pur: doar regex pe string, fara retea. Regexurile sunt superset-ul celor doua
// variante vechi, deci nu pierd semnal fata de niciuna.

export type Platform =
  | "Shopify" | "WooCommerce" | "PrestaShop" | "Magento" | "OpenCart"
  | "BigCommerce" | "GoMag" | "MerchantPro" | "Wix" | "Squarespace" | "WordPress";

export type HtmlTracking = { gtm: boolean; ga4: boolean; metaPixel: boolean; tiktok: boolean };

// Ordinea conteaza: platformele ecom specifice inaintea celor generice
// (WooCommerce inaintea WordPress; Shopify are markere proprii).
const PLATFORM_PATTERNS: { id: Platform; re: RegExp }[] = [
  { id: "Shopify", re: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|shopify-section|\/cart\.js/i },
  { id: "WooCommerce", re: /woocommerce|wp-content\/plugins\/woocommerce|wc-block|add[_-]to[_-]cart/i },
  { id: "PrestaShop", re: /prestashop/i },
  { id: "Magento", re: /Magento|mage\/|mage-cache|static\/version\d/i },
  { id: "OpenCart", re: /route=common\/home|catalog\/view\/theme|opencart/i },
  { id: "BigCommerce", re: /bigcommerce|stencil-utils/i },
  { id: "GoMag", re: /gomag/i },
  { id: "MerchantPro", re: /merchantpro/i },
  { id: "Wix", re: /wix\.com|_wixCssImports|wixstatic/i },
  { id: "Squarespace", re: /squarespace/i },
  { id: "WordPress", re: /wp-content|wp-json|wp-includes/i },
];

const ECOM_PLATFORMS = new Set<Platform>([
  "Shopify", "WooCommerce", "PrestaShop", "Magento", "OpenCart", "BigCommerce", "GoMag", "MerchantPro",
]);

// Semnale de "magazin" independente de platforma (cos / checkout / pret).
const CART_SIGNALS = /add[_-]?to[_-]?cart|adaug[aă]\s+[iî]n\s+co[sș]|adauga in cos|adaug[aă] [iî]n co[sș]|\/cart\b|\/cos\b|\/checkout|\/comanda|product-price|woocommerce-price/i;

export function detectPlatform(html: string): Platform | null {
  for (const p of PLATFORM_PATTERNS) if (p.re.test(html)) return p.id;
  return null;
}

export function detectEcom(html: string, platform?: Platform | null): boolean {
  const plat = platform ?? detectPlatform(html);
  if (plat && ECOM_PLATFORMS.has(plat)) return true;
  return CART_SIGNALS.test(html);
}

// Moneda magazinului, best-effort din HTML brut. Prioritate: cod ISO explicit din
// schema/config (cel mai fiabil) -> simbol/cod in text -> TLD-ul domeniului. Intoarce
// codul ISO (RON/EUR/USD/GBP...) sau null daca nu se poate deduce (atunci funnel-ul
// pune userul sa aleaga). NU folosim "$" ca simbol — apare des in cod JS (fals USD).
// Simboluri/coduri neconforme intalnite in cod (mai ales WooCommerce RO care pune
// "lei" drept "currency") -> cod ISO real. Fara asta, un magazin RON e citit ca "LEI".
const CURRENCY_ALIAS: Record<string, string> = { LEI: "RON" };

export function detectCurrency(html: string, url?: string): string | null {
  // (?<![A-Za-z]) impiedica potrivirea "currency" in interiorul altui cuvant (ex "concurrency":"low" -> fals "LOW").
  const iso = html.match(/["']?(?<![A-Za-z])(?:priceCurrency|currency|currency_code|active_currency|shop_currency)["']?\s*[:=]\s*["']([A-Za-z]{3})["']/);
  if (iso) { const c = iso[1].toUpperCase(); return CURRENCY_ALIAS[c] ?? c; }
  if (/(^|[\s>(])lei([\s<).,]|$)|\bRON\b/i.test(html)) return "RON";
  if (/€|\bEUR\b/.test(html)) return "EUR";
  if (/£|\bGBP\b/.test(html)) return "GBP";
  if (/\bUSD\b/.test(html)) return "USD";
  if (url) {
    try {
      const host = new URL(url.startsWith("http") ? url : "https://" + url).hostname;
      if (/\.ro$/i.test(host)) return "RON";
      if (/\.(de|fr|it|es|nl|at|be|fi|ie|pt|gr|sk|lv|lt|ee|si)$/i.test(host)) return "EUR";
      if (/\.uk$|\.co\.uk$/i.test(host)) return "GBP";
    } catch { /* url invalid */ }
  }
  return null;
}

// Tracking din HTML brut (fallback / scan rapid). NU e detectia runtime — tag-urile
// injectate prin GTM nu apar in sursa, deci un "false" aici inseamna "de verificat",
// nu "lipsa". Superset al vechilor regexuri din scan + audit-engine.
export function detectHtmlTracking(html: string): HtmlTracking {
  return {
    gtm: /googletagmanager\.com\/gtm|GTM-[A-Z0-9]{4,}|datalayer\.push|window\.datalayer/i.test(html),
    ga4: /gtag\/js\?id=G-|["']G-[A-Z0-9]{6,}["']|googletagmanager\.com\/gtag/i.test(html),
    metaPixel: /connect\.facebook\.net|fbq\s*\(|facebook\.com\/tr/i.test(html),
    tiktok: /analytics\.tiktok\.com|ttq\.(load|page|track)/i.test(html),
  };
}
