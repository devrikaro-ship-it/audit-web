// Step "pagini": the chosen pages at the pace the platform accepts, through the browser when the server is refused,
// failed pages replaced by pages of the same type; then each page's type from its content.
import { NOUN, PROGRESS, countOf, fill } from "@/modules/site-audit/model/copy-registry";
import { classifyFetchedLeadPage, classifyFetchedPage, leadPageSignals, leadTemplate, mapWithConcurrency, PAGE_FETCH_BUDGET_MS, replacementsFor, type LeadPageType, type PageType } from "@/modules/site-audit/model/page-selection";
import { fetchPagesWithProbe } from "@/modules/site-audit/model/read-strategy";
import type { PageData } from "@/modules/site-audit/model/data/net";
import type { PageFetcher } from "@/modules/site-audit/model/data/browser-fetch";
import type { Home } from "./read-home";
import type { Sitemaps } from "./read-sitemaps";
import type { Chosen } from "./choose-pages";
import type { AuditIO, StepReport } from "./io";

export type Read = {
  pages: PageData[]; analyzedPages: PageData[]; usedBrowser: boolean;
  leadPages: { service: string[]; location: string[] } | undefined; products: string[]; categories: string[];
};

export async function readPages(home: Home, maps: Sitemaps, chosen: Chosen, io: AuditIO, step: StepReport): Promise<Read> {
  const { profile, leads, reader } = home;
  const { typed } = maps;
  const { toAnalyze, planned, leadTyped } = chosen;
  // Phase 2: Fetch pages at the pace the platform accepts (profile.concurrency); the screen counts them as they come.
  step("pagini", "running");
  let readCount = 0;
  const counted = (read: (u: string) => Promise<PageData>) => async (u: string) => {
    const p = await read(u);
    if (p.ok) step("pagini", "running", fill(PROGRESS.pagesRead, { n: ++readCount }));
    return p;
  };
  const fetchDeadline = io.now() + PAGE_FETCH_BUDGET_MS;
  const fetched = (list: (PageData | undefined)[]) => list.filter((p): p is PageData => !!p);
  const viaBrowser = (fetcher: PageFetcher) => async (urls: string[]) =>
    fetched(await mapWithConcurrency(urls, profile.concurrency, counted((u) => fetcher.fetchPage(u)), io.now() + PAGE_FETCH_BUDGET_MS));
  const { pages, usedBrowser } = await fetchPagesWithProbe<PageData>(
    toAnalyze,
    async (urls) => fetched(await mapWithConcurrency(urls, profile.concurrency, counted(reader.readPage), fetchDeadline)),
    async () => { const f = await reader.openFetcher(); return f ? viaBrowser(f) : null; },
  );
  const failedTypes = pages.slice(1).filter((p) => !p.ok).map((p) => planned.get(p.url) ?? "other");
  if (failedTypes.length > 0 && io.now() < fetchDeadline) {
    const refill = leads ? replacementsFor(failedTypes as LeadPageType[], leadTyped, new Set(toAnalyze)) : replacementsFor(failedTypes as PageType[], typed, new Set(toAnalyze));
    pages.push(...fetched(await mapWithConcurrency(refill.urls, profile.concurrency, counted(reader.readPage), fetchDeadline)));
    refill.planned.forEach((t, u) => planned.set(u, t));
  }
  await reader.browser()?.close();

  const analyzedPages = pages.filter(p => p.ok);
  const normUrl = (u: string) => u.replace(/\/$/, "");
  // A lead page is typed against the site's own template: what most pages read carry.
  const template = leadTemplate(analyzedPages.slice(1).map((p) => leadPageSignals(p.html)));
  const leadPageType = new Map(leads ? analyzedPages.slice(1).map((p) => [normUrl(p.url), classifyFetchedLeadPage(p.url, p.html, (planned.get(normUrl(p.url)) ?? "other") as LeadPageType, template)]) : []);
  const leadPages = leads ? { service: [...leadPageType].filter(([, t]) => t === "service").map(([u]) => u), location: [...leadPageType].filter(([, t]) => t === "location").map(([u]) => u) } : undefined;
  const pageType = new Map(leads ? [] : analyzedPages.slice(1).map((p) => [normUrl(p.url), classifyFetchedPage(p.html, (planned.get(normUrl(p.url)) ?? "other") as PageType)]));
  const products = [...pageType].filter(([, t]) => t === "product").map(([u]) => u);
  const categories = [...pageType].filter(([, t]) => t === "category").map(([u]) => u);
  step("pagini", "done", fill(PROGRESS.pagesTyped, { n: analyzedPages.length, split: leadPages
    ? fill(PROGRESS.pair, { a: countOf(leadPages.service.length, NOUN.service), b: countOf(leadPages.location.length, NOUN.location) })
    : fill(PROGRESS.pair, { a: countOf(categories.length, NOUN.category), b: countOf(products.length, NOUN.product) }) }));
  return { pages, analyzedPages, usedBrowser, leadPages, products, categories };
}
