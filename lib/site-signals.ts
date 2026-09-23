// Amprenta site-ului din HTML brut — sursa UNICA pentru "ce e site-ul asta".
// Consumata si de scanul rapid (app/api/scan) si de motorul de audit (audit-engine),
// ca sa nu se poata contrazice (scanul spunea o platforma, auditul alta).
// Pur: doar regex pe string, fara retea. Regexurile sunt superset-ul celor doua
// variante vechi, deci nu pierd semnal fata de niciuna.

export type Platform =
  | "Shopify" | "WooCommerce" | "PrestaShop" | "Magento" | "OpenCart"
  | "BigCommerce" | "GoMag" | "MerchantPro" | "Wix" | "Squarespace" | "WordPress";


// Ordinea conteaza: platformele ecom specifice inaintea celor generice
// (WooCommerce inaintea WordPress; Shopify are markere proprii).
const PLATFORM_PATTERNS: { id: Platform; re: RegExp }[] = [
  // Each marker must be specific to its platform. Measured 2026-09-23: bare `mage/` matched every `image/` path
  // (pcgarage, dedeman and flanco came out "Magento") and `add-to-cart` matched every shop (MerchantPro stores came
  // out "WooCommerce"). Platforms with a hosted CDN come first because their CDN host is unambiguous.
  { id: "Shopify", re: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|shopify-section/i },
  { id: "MerchantPro", re: /cdnmp\.net|merchantpro/i },
  { id: "GoMag", re: /gomagcdn\.ro|Gomag\.bind|GomagListing/i },
  { id: "WooCommerce", re: /wp-content\/plugins\/woocommerce|woocommerce|wc-block/i },
  { id: "PrestaShop", re: /prestashop|\/modules\/ps_/i },
  { id: "OpenCart", re: /catalog\/view\/(theme|javascript)|index\.php\?route=(common|product)\/|opencart/i },
  { id: "Magento", re: /Magento_[A-Z][A-Za-z]+|mage\/cookies|mage-cache-storage|static\/version\d+\/frontend/ },
  { id: "BigCommerce", re: /bigcommerce|stencil-utils/i },
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
