// Which pages the cold audit analyses. The audit is about the pages that sell, so products and categories get
// fixed quotas and every other page (blog, info) only takes the space left. Sitemap order is never trusted:
// many stores list their blog first (magazinfitness.ro: 63 posts before 201 products).

import { GENERIC_PROFILE, type PlatformProfile, type SitemapKind } from "./platform-knowledge";

export type PageType = "product" | "category" | "other";
export type TypedUrls = Record<PageType, string[]>;
// A lead site (spec 2026-09-25 §2.4) is read on the pages that bring contacts: services and locations.
export type LeadPageType = "service" | "location" | "other";
export type LeadTypedUrls = Record<LeadPageType, string[]>;

export const PAGE_BUDGET = 60; // including the homepage
export const PAGE_QUOTAS: Record<PageType, number> = { category: 15, product: 35, other: 5 };
export const LEAD_QUOTAS: Record<LeadPageType, number> = { service: 30, location: 20, other: 9 };
const OVERFLOW_ORDER: PageType[] = ["product", "category", "other"];
const LEAD_ORDER: LeadPageType[] = ["service", "location", "other"];
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

// Items not started before `deadline` (epoch ms) are skipped and come back undefined: a site that rate-limits
// must not make the prospect wait minutes (invictusmedical.ro from the server: about 2 requests per 7 s accepted).
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>, deadline = Infinity): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length).fill(undefined);
  let next = 0;
  const worker = async () => { while (next < items.length && Date.now() < deadline) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

export const PAGE_FETCH_BUDGET_MS = 30000;

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

// Quotas first, then the spare budget in overflow order. "other" keeps its given order (callers put what matters
// first); the typed pools are sampled evenly, never in sitemap order.
// One page is one page with or without www and on http or https (piontaniservices.ro lists every page twice and
// under www, while the audit starts from the address typed without it).
const pageKey = (u: string) => norm(u).replace(/^https?:\/\/(www\.)?/i, "").toLowerCase();

function selectByQuota<K extends string>(homepage: string, typed: Record<K, string[]>, quotas: Record<K, number>, overflow: K[], output: K[]): { urls: string[]; planned: Map<string, K> } {
  const home = norm(homepage);
  const seen = new Set([pageKey(home)]);
  const pools = {} as Record<K, string[]>;
  for (const t of overflow) {
    pools[t] = typed[t].map(norm).filter((u) => (seen.has(pageKey(u)) ? false : (seen.add(pageKey(u)), true)));
  }
  const take = {} as Record<K, number>;
  for (const t of overflow) take[t] = Math.min(quotas[t], pools[t].length);
  let spare = PAGE_BUDGET - 1 - overflow.reduce((s, t) => s + take[t], 0);
  for (const t of overflow) {
    const extra = Math.min(spare, pools[t].length - take[t]);
    take[t] += extra;
    spare -= extra;
  }
  const urls = [home];
  const planned = new Map<string, K>();
  for (const t of output) {
    const chosen = t === "other" ? pools[t].slice(0, take[t]) : sampleEvenly(pools[t], take[t]);
    for (const u of chosen) { urls.push(u); planned.set(u, t); }
  }
  return { urls, planned };
}

export function selectPages(homepage: string, typed: TypedUrls): { urls: string[]; planned: Map<string, PageType> } {
  return selectByQuota(homepage, typed, PAGE_QUOTAS, OVERFLOW_ORDER, ["category", "product", "other"]);
}

export function selectLeadPages(homepage: string, typed: LeadTypedUrls): { urls: string[]; planned: Map<string, LeadPageType> } {
  return selectByQuota(homepage, typed, LEAD_QUOTAS, LEAD_ORDER, LEAD_ORDER);
}

// Pages that failed (404, 5xx) are replaced by untried URLs of the same planned type, so a sitemap full of dead
// entries does not shrink the audit below its target (spishop.ro, 2026-09-23: 15 dead categories in the sitemap).
export function replacementsFor<K extends string>(failed: K[], typed: Record<K, string[]>, tried: Set<string>): { urls: string[]; planned: Map<string, K> } {
  const urls: string[] = [];
  const planned = new Map<string, K>();
  const need = {} as Record<K, number>;
  for (const t of Object.keys(typed) as K[]) need[t] = 0;
  for (const t of failed) need[t]++;
  for (const t of Object.keys(typed) as K[]) {
    const fresh = typed[t].map(norm).filter((u) => !tried.has(u) && !planned.has(u));
    for (const u of sampleEvenly(fresh, need[t])) { urls.push(u); planned.set(u, t); }
  }
  return { urls, planned };
}

// Prices as the visitor reads them: tags removed first, since themes often put the currency in its own element
// ("29 <small>lei</small>").
export function priceCount(html: string): number {
  return (html.replace(/<[^>]+>/g, " ").match(/\d[\d.\s]*[.,]?\d*\s*(lei|ron|€|eur)\b/gi) ?? []).length;
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

// ── Lead sites (spec 2026-09-25 §2.4) ──
// Articles are left out: a sitemap named for posts, news or their archives, or a path under a blog or article section.
const ARTICLE_SITEMAP = /post|blog|articol|article|news|stiri|noutati|tag|categor|author|archive/;
const ARTICLE_PATH = /\/(blog|articole?|articles?|news|stiri|noutati)(\/|$)/;
// Sitemaps of pages, services or locations are read first; the others only when a site has none of these.
// The file's own name decides, from its start: slide-page-sitemap.xml is a slider, not the site's pages.
const PAGE_SITEMAP = /\/(page|pagin|servic|locati|location|clinic|sedi|tratament|treatment)[^/]*$/;
// A sitemap or a path section named for services or locations types its pages (service-sitemap.xml, /servicii/x/).
const SERVICE_NAME = /servic|tratament|treatment|procedur/;
const LOCATION_NAME = /locati|location|clinic|sedi/;
const SERVICE_PATH = /^\/(servicii|services|tratamente|treatments|proceduri|procedures)\/[^/]+/;
const LOCATION_PATH = /^\/(locatii|locations|clinici|clinics|sedii)\/[^/]+/;
// Among the pages that cannot be typed, contact, prices and quote requests come first; the company's own information
// pages last.
const CONTACT_OR_PRICES = /^\/[^/]*(contact|pret|tarif|price|cost|ofert|quote)/;
const INFO_PAGE = /^\/(despre|about|cariera|careers?|jobs?|echipa|team|politic|protectia|confidential|privacy|termeni|terms|cookie|gdpr|anpc|confirmare|multumim|thank)/;

const firstSegment = (url: string) => pathOf(url).split("/").filter(Boolean)[0] ?? "";

export async function collectLeadUrls(
  xml: string,
  fetchText: (u: string) => Promise<string>,
  sitemapUrl = "",
  { profile = GENERIC_PROFILE }: ReadOptions = {},
): Promise<LeadTypedUrls> {
  const out: LeadTypedUrls = { service: [], location: [], other: [] };
  const typeOf = (sm: string): LeadPageType => (SERVICE_NAME.test(pathOf(sm)) ? "service" : LOCATION_NAME.test(pathOf(sm)) ? "location" : "other");
  const add = (urls: string[], t: LeadPageType) => { for (const u of urls) if (!hasAny(pathOf(u), profile.urlSignals.skip)) out[t].push(u); };
  const children = extractLocs(xml, "sitemap");
  if (children.length === 0) { add(extractLocs(xml, "url"), typeOf(sitemapUrl)); return completeLeadTypes(out); }
  const readable = children.filter((u) => !ARTICLE_SITEMAP.test(pathOf(u)) && !hasAny(pathOf(u), profile.sitemapSignals.skip));
  const pagesFirst = readable.filter((u) => PAGE_SITEMAP.test(pathOf(u)));
  const picked = (pagesFirst.length > 0 ? pagesFirst : readable).slice(0, MAX_SELLING_SITEMAPS);
  const xmls = await mapWithConcurrency(picked, profile.concurrency, (u) => fetchText(u));
  picked.forEach((u, i) => add(extractLocs(xmls[i] ?? "", "url"), typeOf(u)));
  return completeLeadTypes(out);
}

// Every list of lead pages passes here, whatever found it (sitemap, home page links): articles leave, pages under a
// services or locations section or under the path family of typed pages take that type (/servicii/a and /servicii/b
// are services, so /servicii/c is one too), and the rest are ordered contact and prices first, information last.
export function completeLeadTypes(typed: LeadTypedUrls): LeadTypedUrls {
  const keep = (urls: string[]) => urls.filter((u) => !ARTICLE_PATH.test(pathOf(u)));
  const families = (urls: string[]) => {
    const n = new Map<string, number>();
    for (const u of urls) { const f = firstSegment(u); if (f && pathOf(u).split("/").filter(Boolean).length > 1) n.set(f, (n.get(f) ?? 0) + 1); }
    return new Set([...n].filter(([, c]) => c >= 2).map(([f]) => f));
  };
  const out: LeadTypedUrls = { service: keep(typed.service), location: keep(typed.location), other: [] };
  const service = families(out.service), location = families(out.location);
  for (const u of keep(typed.other)) {
    const f = firstSegment(u), path = pathOf(u);
    if (service.has(f) || SERVICE_PATH.test(path)) out.service.push(u);
    else if (location.has(f) || LOCATION_PATH.test(path)) out.location.push(u);
    else out.other.push(u);
  }
  const rank = (u: string) => (CONTACT_OR_PRICES.test(pathOf(u)) ? 0 : INFO_PAGE.test(pathOf(u)) ? 2 : 1);
  out.other.sort((a, b) => rank(a) - rank(b));
  return out;
}

// What a lead page shows beyond the site's own template: a map, opening hours, a request to book or for a quote.
// Headers and footers repeat some of them on every page, so a page counts a signal only above the site's template,
// the value most pages read carry (measured 2026-09-25 on 52 dentalview.ro and 23 piontaniservices.ro pages: hours
// twice and "programare" six times on every dentalview page; a map only on 17 of its 18 location pages; service pages
// ask to book 7 to 16 times, information pages 6).
export type LeadPageSignals = { map: number; hours: number; ask: number };
const readable = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
export function leadPageSignals(html: string): LeadPageSignals {
  const text = readable(html);
  return {
    map: (html.match(/google\.[a-z.]+\/maps|maps\.google\.|<iframe[^>]*maps/gi) ?? []).length,
    hours: (text.match(/luni\s*[-–]\s*(vineri|sambata|sâmbătă)|\bL\s*[-–]\s*V\b|opening hours|program(ul)?\s*(de lucru)?\s*:/gi) ?? []).length,
    ask: (text.match(/programare|programeaz|solicit[ăa]\s+(o\s+)?ofert|cere(ti)?\s+(o\s+)?ofert|consulta[țt]ie\s+gratuit|book\s+(a\s+)?(consultation|appointment)|request\s+a\s+quote|get\s+a\s+quote/gi) ?? []).length,
  };
}

// The site's template: for each signal, the value most pages carry (ties go to the lower one).
export function leadTemplate(pages: LeadPageSignals[]): LeadPageSignals {
  const mode = (xs: number[]) => {
    const n = new Map<number, number>();
    for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
  };
  return { map: mode(pages.map((p) => p.map)), hours: mode(pages.map((p) => p.hours)), ask: mode(pages.map((p) => p.ask)) };
}

// A typed page keeps its type. An untyped one: contact, prices and information pages stay "other"; a map or opening
// hours above the template make a location; a request to book or for a quote above the template, or a service
// declared for Google, make a service; a page with none of these stays "other" (it fills the budget, is judged on
// nothing that belongs to services).
export function classifyFetchedLeadPage(url: string, html: string, planned: LeadPageType, template: LeadPageSignals): LeadPageType {
  if (planned !== "other") return planned;
  const path = pathOf(url);
  if (CONTACT_OR_PRICES.test(path) || INFO_PAGE.test(path)) return "other";
  const own = leadPageSignals(html);
  if (own.map > template.map || own.hours > template.hours) return "location";
  if (own.ask > template.ask || /"@type"\s*:\s*"(Service|MedicalProcedure)"/i.test(html)) return "service";
  return "other";
}
