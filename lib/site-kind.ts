import { COMMERCE_PLATFORM_PATTERNS } from "./site-signals";

// Is the site a shop (ecom) or a site that collects contacts (leads)? Darwin's rule, taken over unchanged
// (~/Projects/darwin/backend/services/typeScan.js, classifyFromScan) so both products decide the same way; spec
// docs/superpowers/specs/2026-09-25-site-audit-ecom-leads-design.md §1. It was corrected on dentalview.ro, a dental
// clinic first read as a shop from an installed WooCommerce and the text "40 lei": an installed engine only
// corroborates; a place to put things and a place to pay decide.
//
// structural  markup or a route that only exists where there is something to buy: decides alone
// platform    a shop engine in the page source: corroborates only
// weak        shop vocabulary a services site can carry too (a price, stock words, a shop route)

export type SiteKind = "ecom" | "leads";
export type Signal = { id: string; strength: string; sample: string };
export type SiteKindVerdict = { type: SiteKind; confidence: "high" | "medium" | "low"; evidence: { url: string | null; readChars: number; ecom: Signal[]; leads: Signal[] } };

const ECOM_MARKERS: [string, RegExp, "structural" | "platform" | "weak"][] = [
  ...COMMERCE_PLATFORM_PATTERNS.map((p): [string, RegExp, "platform"] => [`platform_${p.id.toLowerCase()}`, p.re, "platform"]),
  ["schema_product", /"@type"\s*:\s*"Product"/i, "structural"],
  ["schema_offer", /"@type"\s*:\s*"(Offer|AggregateOffer)"/i, "structural"],
  ["og_product", /property=["']og:type["'][^>]*content=["']product["']|content=["']product["'][^>]*property=["']og:type["']/i, "structural"],
  ["og_price", /property=["']product:price:amount["']/i, "structural"],
  ["microdata_price", /itemprop=["'](price|priceCurrency)["']/i, "structural"],
  ["cart_route", /href=["'][^"']*\/(cart|cos|cosul-meu|shopping-cart|basket|warenkorb|panier)(\/|["'?#])/i, "structural"],
  ["checkout_route", /href=["'][^"']*\/(checkout|comanda|finalizare-comanda|finalizeaza-comanda|kassa)(\/|["'?#])/i, "structural"],
  ["add_to_cart", /add[-_ ]to[-_ ]cart|adauga\s+in\s+cos|adaug[ăa]\s+[îi]n\s+co[sș]|add_to_cart/i, "structural"],
  ["shop_route", /href=["'][^"']*\/(shop|magazin|produse|products|catalog)(\/|["'?#])/i, "weak"],
  ["price_currency", /\b\d+([.,]\d{2})?\s*(lei|ron|aed|eur|€|usd|\$)\b/i, "weak"],
  ["stock_words", /\b(in stoc|[îi]n stoc|in stock|out of stock|stoc epuizat)\b/i, "weak"],
];

// Evidence the site asks for a contact rather than a purchase. Never outvotes a structural shop marker.
const LEAD_MARKERS: [string, RegExp][] = [
  ["quote_request", /cere(ti)?\s+(o\s+)?ofert|solicit[ăa]\s+(o\s+)?ofert|request\s+a\s+quote|get\s+a\s+quote|ask\s+for\s+a\s+quote/i],
  ["appointment", /programare|programeaz[ăa]|book\s+(a\s+)?(consultation|appointment|demo)|schedule\s+a\s+call|fa-ti\s+o\s+programare/i],
  ["consultation", /consulta[țt]ie\s+gratuit|free\s+consultation|evaluare\s+gratuit/i],
  ["contact_form", /<form[^>]*>[\s\S]{0,4000}?(type=["']email["']|name=["'](email|telefon|phone)["'])/i],
  ["contact_route", /href=["'][^"']*\/(contact|contacta[țt]i-ne|contact-us)(\/|["'?#])/i],
  ["call_cta", /href=["']tel:/i],
];

// Below this much readable text the page told us nothing (a script shell, a redirect stub, a firewall page): a
// verdict drawn from it would be a verdict about our own fetch.
export const MIN_READABLE_CHARS = 200;

// A defect of the reading, never a kind of site.
export class SiteKindUnreadable extends Error {
  constructor(detail: string) {
    super(`the page could not be read to decide the kind of site: ${detail}`);
    this.name = "SiteKindUnreadable";
  }
}

const readableText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const matches = (markers: [string, RegExp, string?][], html: string): Signal[] => markers.flatMap(([id, re, strength]) => {
  const m = re.exec(html);
  return m ? [{ id, strength: strength ?? "lead", sample: m[0].slice(0, 120).replace(/\s+/g, " ").trim() }] : [];
});

export function classifySiteKind(html: string, url: string | null = null): SiteKindVerdict {
  const text = readableText(html ?? "");
  if (text.length < MIN_READABLE_CHARS) throw new SiteKindUnreadable(`${text.length} readable characters at ${url ?? "unknown url"}`);
  const ecom = matches(ECOM_MARKERS, html);
  const leads = matches(LEAD_MARKERS, html);
  const count = (s: string) => ecom.filter((h) => h.strength === s).length;
  const structural = count("structural"), platform = count("platform"), weak = count("weak");
  const verdict = (type: SiteKind, confidence: SiteKindVerdict["confidence"]): SiteKindVerdict =>
    ({ type, confidence, evidence: { url, readChars: text.length, ecom, leads } });
  if (structural > 0) return verdict("ecom", structural >= 2 ? "high" : "medium");
  // An engine plus money talk in more than one form: a shop whose cart links are built by scripts. An engine plus a
  // single price is a WordPress site with a plugin, the case that produced the rule.
  if (platform >= 1 && weak >= 2) return verdict("ecom", "low");
  if (weak >= 2 && leads.length === 0) return verdict("ecom", "low");
  return verdict("leads", leads.length > 0 ? "high" : "medium");
}
