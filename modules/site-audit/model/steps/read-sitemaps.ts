// Step "robots": robots.txt, llms.txt and the sitemap that lists the pages that sell, typed by the platform profile.
import { PROGRESS } from "@/modules/site-audit/model/copy-registry";
import { collectLeadUrls, collectTypedUrls, type LeadTypedUrls, type TypedUrls } from "@/modules/site-audit/model/page-selection";
import { hasRobotsRules } from "@/modules/site-audit/model/robots-rules";
import { extractSitemapFromRobots, filterUrls } from "@/modules/site-audit/model/checks/urls";
import type { Home } from "./read-home";
import type { StepReport } from "./io";

export type Sitemaps = {
  robotsTxt: string; llmsTxt: string; sitemapUrl: string; sitemapXml: string; foundSitemapXml: string;
  typed: TypedUrls; leadTyped: LeadTypedUrls;
};

export async function readSitemaps(home: Home, step: StepReport): Promise<Sitemaps> {
  const { origin, profile, language, leads, reader: { readText } } = home;
  step("robots", "running");
  const robotsTxt = await readText(`${origin}/robots.txt`);
  // Read before the page burst: rate-limiting shops (Shopify) refuse small files requested right after it.
  const llmsTxt = await readText(`${origin}/llms.txt`);
  const sitemapUrl = extractSitemapFromRobots(robotsTxt, origin);
  const sitemapXml = await readText(sitemapUrl);
  const sitemapCandidates = [sitemapUrl, ...profile.sitemapEntryPoints.map((p) => origin + p)];
  let typed: TypedUrls = { product: [], category: [], other: [] };
  let leadTyped: LeadTypedUrls = { service: [], location: [], other: [] };
  // The sitemap the pages were actually read from: robots.txt may not declare it (piontaniservices.ro) while the
  // platform's usual address has it.
  let foundSitemapXml = sitemapXml;
  for (const sm of [...new Set(sitemapCandidates)]) {
    const xml = sm === sitemapUrl ? sitemapXml : await readText(sm);
    if (!xml) continue;
    if (leads) {
      const found = await collectLeadUrls(xml, readText, sm, { profile });
      const own: LeadTypedUrls = { service: filterUrls(found.service, origin, true), location: filterUrls(found.location, origin, true), other: filterUrls(found.other, origin, true) };
      if (own.service.length + own.location.length + own.other.length > 0) { foundSitemapXml = xml; leadTyped = own; typed = { product: [], category: [], other: [...own.service, ...own.location, ...own.other] }; break; }
      continue;
    }
    const found = await collectTypedUrls(xml, readText, sm, { profile, language });
    const own: TypedUrls = { product: filterUrls(found.product, origin), category: filterUrls(found.category, origin), other: filterUrls(found.other, origin) };
    if (own.product.length + own.category.length + own.other.length > 0) { foundSitemapXml = xml; typed = own; break; }
  }

  // Only the sitemaps that list selling pages are read (articles and extra sitemaps are skipped), so no total is shown.
  step("robots", "done", [hasRobotsRules(robotsTxt) ? PROGRESS.robotsFound : PROGRESS.robotsMissing, foundSitemapXml ? PROGRESS.sitemapFound : PROGRESS.sitemapMissing].join(" · "));
  return { robotsTxt, llmsTxt, sitemapUrl, sitemapXml, foundSitemapXml, typed, leadTyped };
}
