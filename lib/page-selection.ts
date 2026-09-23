// Which pages the cold audit analyses. The audit is about the pages that sell, so products and categories get
// fixed quotas and every other page (blog, info) only takes the space left. Sitemap order is never trusted:
// many stores list their blog first (magazinfitness.ro: 63 posts before 201 products).

export type PageType = "product" | "category" | "other";
export type TypedUrls = Record<PageType, string[]>;

export const PAGE_BUDGET = 60; // including the homepage
export const PAGE_QUOTAS: Record<PageType, number> = { category: 15, product: 35, other: 5 };
const OVERFLOW_ORDER: PageType[] = ["product", "category", "other"];
const MAX_SELLING_SITEMAPS = 10; // per type
const MAX_OTHER_SITEMAPS = 5;

export function classifySitemap(url: string): PageType {
  const name = (url.toLowerCase().split("?")[0].split("/").pop() ?? "");
  if (/product[_-]?cat|collections?|categor/.test(name)) return "category";
  if (/tag|brand/.test(name)) return "other";
  if (/products?/.test(name)) return "product";
  return "other";
}

function extractLocs(xml: string, tag: "sitemap" | "url"): string[] {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<loc>([\\s\\S]*?)<\\/loc>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, ""));
  return out;
}

export async function collectTypedUrls(
  xml: string,
  fetchText: (u: string) => Promise<string>,
  sitemapUrl = "",
): Promise<TypedUrls> {
  const out: TypedUrls = { product: [], category: [], other: [] };
  const children = extractLocs(xml, "sitemap");
  if (children.length === 0) {
    out[classifySitemap(sitemapUrl)].push(...extractLocs(xml, "url"));
    return out;
  }
  const typed = children.map((u) => ({ u, t: classifySitemap(u) }));
  const picked = [
    ...typed.filter((c) => c.t === "product").slice(0, MAX_SELLING_SITEMAPS),
    ...typed.filter((c) => c.t === "category").slice(0, MAX_SELLING_SITEMAPS),
    ...typed.filter((c) => c.t === "other").slice(0, MAX_OTHER_SITEMAPS),
  ];
  const xmls = await Promise.all(picked.map((c) => fetchText(c.u)));
  picked.forEach((c, i) => out[c.t].push(...extractLocs(xmls[i] ?? "", "url")));
  return out;
}

export function sampleEvenly<T>(items: T[], n: number): T[] {
  if (n <= 0) return [];
  if (items.length <= n) return [...items];
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]);
}

const norm = (u: string) => u.replace(/\/$/, "");

export function selectPages(homepage: string, typed: TypedUrls): { urls: string[]; planned: Map<string, PageType> } {
  const home = norm(homepage);
  const seen = new Set([home]);
  const pools = {} as TypedUrls;
  for (const t of OVERFLOW_ORDER) {
    pools[t] = typed[t].map(norm).filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  }
  const take = {} as Record<PageType, number>;
  for (const t of OVERFLOW_ORDER) take[t] = Math.min(PAGE_QUOTAS[t], pools[t].length);
  let spare = PAGE_BUDGET - 1 - OVERFLOW_ORDER.reduce((s, t) => s + take[t], 0);
  for (const t of OVERFLOW_ORDER) {
    const extra = Math.min(spare, pools[t].length - take[t]);
    take[t] += extra;
    spare -= extra;
  }
  const urls = [home];
  const planned = new Map<string, PageType>();
  for (const t of ["category", "product", "other"] as PageType[]) {
    const chosen = t === "other" ? pools[t].slice(0, take[t]) : sampleEvenly(pools[t], take[t]);
    for (const u of chosen) { urls.push(u); planned.set(u, t); }
  }
  return { urls, planned };
}

export function priceCount(html: string): number {
  return (html.match(/\d[\d.\s]*[.,]?\d*\s*(lei|ron|€|eur)\b/gi) ?? []).length;
}
export function hasAddToCart(html: string): boolean {
  return /add[-_ ]?to[-_ ]?cart|adaug[aă]\s+[iî]n\s+co[sș]|single_add_to_cart|comanda\s+rapida|cumpar[aă]\s+acum|buy\s+now/i.test(html);
}
function hasProductMarkup(html: string): boolean {
  return /"@type"\s*:\s*"Product"/i.test(html)
    || /"@type"\s*:\s*\[[^\]]*"Product"/i.test(html)
    || /schema\.org\/Product\b/i.test(html)
    || /property=["']og:type["'][^>]*content=["']product/i.test(html);
}
function hasPriceSignal(html: string): boolean {
  return /itemprop=["']price["']|"price"\s*:/i.test(html) || priceCount(html) > 0;
}

// A category URL stays a category: WooCommerce category grids carry add-to-cart buttons and prices.
export function classifyFetchedPage(html: string, planned: PageType): PageType {
  if (planned === "category") return "category";
  if (hasProductMarkup(html)) return "product";
  if (planned === "product" && hasPriceSignal(html) && hasAddToCart(html)) return "product";
  if (priceCount(html) >= 6) return "category";
  return "other";
}
