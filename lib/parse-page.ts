// Layer de parsare HTML — toate regexurile de structura (title/meta/canonical/h1/
// jsonld/imagini/linkuri/cuvinte/breadcrumb/faq) intr-un singur loc, pur si testabil.
// Inainte traiau in mijlocul audit-engine, amestecate cu scoring-ul. Aici: string -> valoare.

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»" };
// Text as the visitor reads it: HTML character references decoded; an unknown named one becomes a space.
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : NAMED[e.toLowerCase()] ?? " ");
}

export function parseTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim() : "";
}

export function parseMeta(html: string, name: string): string {
  const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*?)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']${name}["']`, "i");
  return (html.match(re1) ?? html.match(re2))?.[1]?.trim() ?? "";
}

export function parseMetaOG(html: string, prop: string): string {
  const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*?)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']${prop}["']`, "i");
  return (html.match(re1) ?? html.match(re2))?.[1]?.trim() ?? "";
}

export function parseCanonical(html: string): string {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*?)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']*?)["'][^>]+rel=["']canonical["']/i);
  return m?.[1]?.trim() ?? "";
}

export function countH1(html: string): number {
  return (html.match(/<h1[\s>]/gi) ?? []).length;
}

export function hasH2(html: string): boolean {
  return /<h2[\s>]/i.test(html);
}

export function parseJsonLD(html: string): object[] {
  const results: object[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try { results.push(JSON.parse(m[1])); } catch { /* skip invalid */ }
  }
  return results;
}

// Every schema.org @type in a page's JSON-LD, wherever it sits: top level, arrays, @graph (Rank Math/Yoast/Shopify
// put all entities there), array-valued @type and nested entities (Product.aggregateRating).
export function schemaTypes(html: string): Set<string> {
  const types = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "@type") (Array.isArray(v) ? v : [v]).forEach((t) => typeof t === "string" && types.add(t));
      else walk(v);
    }
  };
  parseJsonLD(html).forEach(walk);
  return types;
}

export function parseImages(html: string): { src: string; alt: string }[] {
  const results: { src: string; alt: string }[] = [];
  const re = /<img([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const src = (attrs.match(/src=["']([^"']+)["']/) ?? [])[1] ?? "";
    const alt = (attrs.match(/alt=["']([^"']*?)["']/) ?? [])[1] ?? "__MISSING__";
    if (src && !src.startsWith("data:")) results.push({ src, alt });
  }
  return results;
}

// Links to the same shop: the link's host equals the shop's, "www." ignored on both sides (a shop entered as
// www.x.ro often links as x.ro). Relative links count; anchors, mail, phone and script links do not.
export function countInternalLinks(html: string, domain: string): number {
  const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");
  const own = bare(domain);
  const re = /href=["']([^"']+)["']/gi;
  let count = 0, m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      if (bare(new URL(href, `https://${own}/`).hostname) === own) count++;
    } catch { /* not a URL */ }
  }
  return count;
}

export function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").filter(w => w.length > 2).length : 0;
}

export function hasBreadcrumbs(html: string): boolean {
  return /breadcrumb/i.test(html) || /BreadcrumbList/i.test(html);
}

export function hasFAQ(html: string): boolean {
  return /faq|intrebari\s+frecvente|frequently\s+asked/i.test(html) || /FAQPage/i.test(html);
}
