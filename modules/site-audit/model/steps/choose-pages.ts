// Step "alegere": the pages to read, by type (never sitemap order), then the small SEO probes before the page burst.
import { PROGRESS, fill } from "@/modules/site-audit/model/copy-registry";
import { completeLeadTypes, PAGE_BUDGET, selectLeadPages, selectPages, type LeadTypedUrls } from "@/modules/site-audit/model/page-selection";
import { extractInternalLinks, filterUrls } from "@/modules/site-audit/model/checks/urls";
import type { SeoProbes } from "@/modules/site-audit/model/seo-components";
import type { Home } from "./read-home";
import type { Sitemaps } from "./read-sitemaps";
import type { AuditIO, StepReport } from "./io";

const MIN_PAGES = 50;        // tinta minima de pagini analizate

export const siteKey = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();

export type Chosen = { toAnalyze: string[]; planned: Map<string, string>; leadTyped: LeadTypedUrls; listedInSitemap: Set<string>; probes: SeoProbes };

// typed.other gains the home page links here, as the engine always did; the sitemap step's lists are the input.
export async function choosePages(home: Home, maps: Sitemaps, io: AuditIO, step: StepReport): Promise<Chosen> {
  const { origin, homepage, homeHtmlEarly, leads, reader: { readText } } = home;
  const { typed, foundSitemapXml } = maps;
  let { leadTyped } = maps;
  step("alegere", "running");

  // Every page the sitemap lists, before home page links are added: a lead site's "listed in the sitemap" row.
  const listedInSitemap = new Set([...typed.product, ...typed.category, ...typed.other, ...leadTyped.service, ...leadTyped.location, ...leadTyped.other].map(siteKey));

  // No typed sitemap: the homepage links (menu, featured products) come before untyped sitemap order.
  if (typed.product.length === 0 && typed.category.length === 0) {
    const homeLinks = filterUrls(extractInternalLinks(homeHtmlEarly, origin), origin);
    typed.other = [...homeLinks, ...typed.other];
  }
  const select = () => {
    if (!leads) return selectPages(homepage, typed);
    const known = new Set([...leadTyped.service, ...leadTyped.location, ...leadTyped.other]);
    leadTyped = completeLeadTypes({ ...leadTyped, other: [...leadTyped.other, ...typed.other.filter((u) => !known.has(u))] });
    return selectLeadPages(homepage, leadTyped);
  };
  let { urls: toAnalyze, planned } = select() as { urls: string[]; planned: Map<string, string> };

  // Fallback link-crawl: sitemap absent/blocat -> link-uri interne din primele pagini descoperite.
  if (toAnalyze.length < MIN_PAGES) {
    let discovered = filterUrls(extractInternalLinks(homeHtmlEarly, origin), origin);
    for (const seed of discovered.slice(0, 5)) {
      if (toAnalyze.length + discovered.length >= PAGE_BUDGET) break;
      discovered = discovered.concat(filterUrls(extractInternalLinks(await readText(seed), origin), origin));
    }
    typed.other = [...typed.other, ...discovered];
    ({ urls: toAnalyze, planned } = select() as { urls: string[]; planned: Map<string, string> });
  }

  // The split by type is shown once the pages are read: a lead page's type is known only from its content.
  step("alegere", "done", fill(PROGRESS.pagesChosen, { n: toAnalyze.length - 1 }));

  // The small SEO checks (redirects, www, sitemap sample, sort parameter) before the page burst, like llms.txt.
  const listedSample = leads ? [...leadTyped.service, ...leadTyped.location, ...leadTyped.other].slice(0, 20) : [...typed.category.slice(0, 10), ...typed.product.slice(0, 10)];
  const probes = await io.runSeoProbes(origin, listedSample, leads ? null : typed.category[0] ?? null, foundSitemapXml)
    .catch(() => ({ sitemapLastmod: null, httpToHttps: null, maxRedirectHops: null, variantsSameHost: null, sitemapSample: { ok: 0, total: 0 }, sortParamHandled: null }));
  return { toAnalyze, planned, leadTyped, listedInSitemap, probes };
}
