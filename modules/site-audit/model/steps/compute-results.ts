// Steps "verificari", "ai" and "scor": every check computed from what was read, the two parts and the score; the
// observation of this audit goes to the knowledge base.
import { NOUN, PROGRESS, WORD, countOf, fill } from "@/modules/site-audit/model/copy-registry";
import { computeSeoComponents, seoScore } from "@/modules/site-audit/model/seo-components";
import { looksBlocked } from "@/modules/site-audit/model/read-strategy";
import { pathPrefixes } from "@/modules/site-audit/model/observations";
import { detectBlocker } from "@/modules/site-audit/model/checks/urls";
import { computeVitezaChecks } from "@/modules/site-audit/model/checks/speed";
import { computeSeoChecks } from "@/modules/site-audit/model/checks/seo";
import { computeContinutChecks, computeKeywordsChecks } from "@/modules/site-audit/model/checks/content";
import { computeStructuraChecks } from "@/modules/site-audit/model/checks/structure";
import { computeAiChecks } from "@/modules/site-audit/model/checks/ai";
import { computeSchemaChecks } from "@/modules/site-audit/model/checks/schema";
import { computeSecurityChecks, computeSocialChecks } from "@/modules/site-audit/model/checks/site";
import { computeProductSignal } from "@/modules/site-audit/model/checks/product-signal";
import { computeUxStandard } from "@/modules/site-audit/model/checks/ux-standard";
import { computeUxAudit } from "@/modules/site-audit/model/checks/ux-audit";
import type { AuditData } from "@/modules/site-audit/model/types";
import { siteKey, type Chosen } from "./choose-pages";
import type { Home } from "./read-home";
import type { Sitemaps } from "./read-sitemaps";
import type { Read } from "./read-pages";
import type { Measured } from "./measure";
import type { AuditIO, StepReport } from "./io";

export async function computeResults(home: Home, maps: Sitemaps, chosen: Chosen, read: Read, m: Measured, startedAt: number, io: AuditIO, step: StepReport): Promise<AuditData> {
  const { origin, domain, homepage, homeDirect, profile, siteKind, reader } = home;
  const { robotsTxt, llmsTxt, sitemapUrl, sitemapXml, foundSitemapXml, typed } = maps;
  const { listedInSitemap, probes } = chosen;
  const { pages, analyzedPages, usedBrowser, leadPages, products, categories } = read;
  const { homepageData, isEcom, mobile, desktop, ttfbMs, hasProductFeed, designEval } = m;
  step("verificari", "running");


  const avertisment = detectBlocker(homepageData.html) ?? undefined;

  // Phase 4: Compute section results
  const viteza = computeVitezaChecks(mobile, desktop, ttfbMs);
  const seoChecks = computeSeoChecks(analyzedPages);
  const continutChecks = computeContinutChecks(analyzedPages);
  const keywordsChecks = computeKeywordsChecks(analyzedPages);
  const structuraChecks = computeStructuraChecks(analyzedPages, robotsTxt, sitemapXml, sitemapUrl, { categories, products });
  const aiChecks = computeAiChecks(robotsTxt, llmsTxt, analyzedPages);
  const schema = computeSchemaChecks(analyzedPages, { categories, products });
  const readThroughBrowser = usedBrowser || !!reader.browser();
  const seo = computeSeoComponents({
    origin, requested: pages, pages: analyzedPages, categories, products, robotsTxt, sitemapXml: foundSitemapXml,
    listed: { categories: typed.category.length, products: typed.product.length, other: typed.other.length },
    refusedServer: looksBlocked(homeDirect.ok, homeDirect.html) || readThroughBrowser, readWithBrowser: readThroughBrowser, probes,
    ...(leadPages ? { kind: "leads" as const, services: leadPages.service, locations: leadPages.location, inSitemap: (u: string) => listedInSitemap.has(siteKey(u)) } : {}),
  });
  const seoRow = (id: string) => seo.flatMap((c) => c.rows).find((r) => r.id === id);
  const described = seoRow("descriere_exista");
  if (described && described.total > 0) step("verificari", "done", described.ok < described.total ? fill(PROGRESS.noDescription, { n: countOf(described.total - described.ok, NOUN.page) }) : PROGRESS.allDescribed);
  else step("verificari", "unmeasured", WORD.verify);
  const aiRow = seoRow("ai_roboti");
  step("ai", "running");
  if (aiRow && aiRow.total > 0) step("ai", "done", fill(PROGRESS.aiAccess, { ok: aiRow.ok, t: aiRow.total }));
  else step("ai", "unmeasured", WORD.verify);
  step("scor", "running");
  const social = computeSocialChecks(homepageData);
  const securitate = computeSecurityChecks(homepageData);

  const productSignal = isEcom ? computeProductSignal(analyzedPages, products, hasProductFeed) : undefined;
  // Part 2 as ✓/✗ rows for both kinds (spec 2026-09-25 §4); its score is the share of ✓. A shop keeps its page
  // fields for the page-type slide.
  const uxKind = isEcom ? "ecom" : leadPages ? "leads" : null;
  const uxRules = uxKind ? computeUxStandard(uxKind, analyzedPages, { categories, products, services: leadPages?.service ?? [], locations: leadPages?.location ?? [] }, mobile, domain) : undefined;
  // The evaluated rows join the page type they judge.
  const judged = await designEval;
  const uxStd = uxRules && judged ? [...uxRules.map((g) => ({ ...g, rows: [...g.rows, ...(judged.get(g.id as never) ?? [])] })),
    ...[...judged].filter(([page]) => !uxRules.some((g) => g.id === page)).map(([page, rows]) => ({ id: page, rows }))] : uxRules;
  const uxFields = isEcom ? computeUxAudit(analyzedPages, { homepage, categories, products }, mobile, domain) : undefined;
  const ux = uxStd ? { scor: seoScore(uxStd), fields: uxFields?.fields ?? [] } : undefined;
  // The overall score is the mean of the two parts the cover shows (docs/superpowers/specs/2026-09-24-seo-ten-...).
  const scor = ux ? Math.round((seoScore(seo) + ux.scor) / 2) : seoScore(seo);
  step("scor", "done", fill(PROGRESS.score, { score: scor }));

  const checksRezultate = { ...viteza, ...schema, ...social, ...securitate };
  const failedPageChecks = [...seoChecks, ...continutChecks, ...keywordsChecks, ...structuraChecks, ...aiChecks]
    .filter((c) => c.correctCount < c.total * 0.7).map((c) => c.id);
  await io.appendObservation({
    at: io.now(), domain, platform: profile.platform,
    sitemap: typed.product.length + typed.category.length + typed.other.length > 0 ? sitemapUrl : "",
    urls: { product: typed.product.length, category: typed.category.length, other: typed.other.length },
    fetched: pages.length, ok: analyzedPages.length,
    refused: pages.filter((p) => p.status === 403 || p.status === 429).length,
    usedBrowser: usedBrowser || !!reader.browser(), blocked: analyzedPages.length === 0,
    products: products.length, categories: categories.length,
    productPrefixes: pathPrefixes(products), categoryPrefixes: pathPrefixes(categories),
    failedChecks: [...Object.entries(checksRezultate).filter(([, r]) => r.status !== "ok").map(([k]) => k), ...failedPageChecks],
    durationMs: io.now() - startedAt,
  }).catch(() => { /* the audit result never depends on the log */ });

  return {
    url: origin,
    domain,
    pagesAnalyzed: analyzedPages.length,
    scor,
    avertisment,
    checksRezultate,
    seoChecks,
    continutChecks,
    keywordsChecks,
    structuraChecks,
    aiChecks,
    isEcom,
    ...(siteKind ? { siteKind } : {}),
    ...(leadPages ? { leadPages } : {}),
    ...(uxStd ? { uxStd } : {}),
    productSignal,
    ux,
    seo,
  };
}
