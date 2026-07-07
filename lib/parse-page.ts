// Layer de parsare HTML — toate regexurile de structura (title/meta/canonical/h1/
// jsonld/imagini/linkuri/cuvinte/breadcrumb/faq) intr-un singur loc, pur si testabil.
// Inainte traiau in mijlocul audit-engine, amestecate cu scoring-ul. Aici: string -> valoare.

export function parseTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
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

export function countInternalLinks(html: string, domain: string): number {
  const re = /href=["']([^"']+)["']/gi;
  let count = 0, m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.includes(domain) || href.startsWith("/")) count++;
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
