// Which pages the cold audit analyses. The audit is about the pages that sell, so products and categories get
// fixed quotas and every other page (blog, info) only takes the space left. Sitemap order is never trusted:
// many stores list their blog first (magazinfitness.ro: 63 posts before 201 products).

import { GENERIC_PROFILE, type PlatformProfile, type SitemapKind } from "./platform-knowledge";

export type PageType = "product" | "category" | "other";
export type TypedUrls = Record<PageType, string[]>;

export const PAGE_BUDGET = 60; // including the homepage
export const PAGE_QUOTAS: Record<PageType, number> = { category: 15, product: 35, other: 5 };
const OVERFLOW_ORDER: PageType[] = ["product", "category", "other"];
const MAX_SELLING_SITEMAPS = 10; // per type
const MAX_OTHER_SITEMAPS = 5;

const pathOf = (url: string) => url.toLowerCase().replace(/^https?:\/\/[^/]+/, "");
const hasAny = (text: string, signals: string[]) => signals.some((s) => text.includes(s));

// Order matters: a skipped or category signal must win over the broader `product` substring (product_cat, product_tag).
export function classifySitemap(url: string, profile: PlatformProfile = GENERIC_PROFILE): SitemapKind {
  const name = pathOf(url);
  for (const kind of ["skip", "category", "mixed", "other", "product"] as SitemapKind[]) {
    if (hasAny(name, profile.sitemapSignals[kind])) return kind;
  }
  return "other";
}

// A URL from a mixed or untyped sitemap is typed by its own path; a typed sitemap is trusted.
export function classifyUrl(url: string, sitemapKind: SitemapKind, profile: PlatformProfile = GENERIC_PROFILE): PageType | null {
  const path = pathOf(url);
  if (hasAny(path, profile.urlSignals.skip)) return null;
  if (sitemapKind === "product" || sitemapKind === "category") return sitemapKind;
  if (hasAny(path, profile.urlSignals.product)) return "product";
  if (hasAny(path, profile.urlSignals.category)) return "category";
  return "other";
}

// PrestaShop publishes one sitemap set per language (product-ro-, product-en-): read only the site language.
function languageOf(url: string): string | null {
  return pathOf(url).match(/[-_/]([a-z]{2})[-_.]/)?.[1] ?? null;
}
function keepSiteLanguage(children: string[], language: string | null): string[] {
  const langs = [...new Set(children.map(languageOf).filter((l): l is string => !!l))];
  if (langs.length < 2) return children;
  const keep = language && langs.includes(language) ? language : langs[0];
  return children.filter((u) => languageOf(u) === keep);
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

// Sitemap <loc> values are XML-escaped: Shopify writes `?from=1&amp;to=9`, which must be fetched as `&`.
function decodeXml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function extractLocs(xml: string, tag: "sitemap" | "url"): string[] {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<loc>([\\s\\S]*?)<\\/loc>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(decodeXml(m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "")));
  return out;
}

export type ReadOptions = { profile?: PlatformProfile; language?: string | null };

export async function collectTypedUrls(
  xml: string,
  fetchText: (u: string) => Promise<string>,
  sitemapUrl = "",
  { profile = GENERIC_PROFILE, language = null }: ReadOptions = {},
): Promise<TypedUrls> {
  const out: TypedUrls = { product: [], category: [], other: [] };
  const add = (urls: string[], kind: SitemapKind) => {
    for (const u of urls) { const t = classifyUrl(u, kind, profile); if (t) out[t].push(u); }
  };
  let children = extractLocs(xml, "sitemap");
  if (children.length === 0) {
    const kind = classifySitemap(sitemapUrl, profile);
    add(extractLocs(xml, "url"), kind === "skip" ? "other" : kind);
    return out;
  }
  if (profile.languageSitemaps) children = keepSiteLanguage(children, language);
  const typed = children.map((u) => ({ u, t: classifySitemap(u, profile) })).filter((c) => c.t !== "skip");
  const picked = [
    ...typed.filter((c) => c.t === "product").slice(0, MAX_SELLING_SITEMAPS),
    ...typed.filter((c) => c.t === "category" || c.t === "mixed").slice(0, MAX_SELLING_SITEMAPS),
    ...typed.filter((c) => c.t === "other").slice(0, MAX_OTHER_SITEMAPS),
  ];
  const xmls = await mapWithConcurrency(picked, profile.concurrency, (c) => fetchText(c.u));
  picked.forEach((c, i) => add(extractLocs(xmls[i] ?? "", "url"), c.t));
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

// Pages that failed (404, 5xx) are replaced by untried URLs of the same planned type, so a sitemap full of dead
// entries does not shrink the audit below its target (spishop.ro, 2026-09-23: 15 dead categories in the sitemap).
export function replacementsFor(failed: PageType[], typed: TypedUrls, tried: Set<string>): { urls: string[]; planned: Map<string, PageType> } {
  const urls: string[] = [];
  const planned = new Map<string, PageType>();
  const need: Record<PageType, number> = { product: 0, category: 0, other: 0 };
  for (const t of failed) need[t]++;
  for (const t of OVERFLOW_ORDER) {
    const fresh = typed[t].map(norm).filter((u) => !tried.has(u) && !planned.has(u));
    for (const u of sampleEvenly(fresh, need[t])) { urls.push(u); planned.set(u, t); }
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
