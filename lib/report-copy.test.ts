import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDeck } from "@/components/report-deck";
import { computeAiChecks, computeContinutChecks, computeKeywordsChecks, computeSeoChecks, computeStructuraChecks, computeUxAudit } from "./audit-engine";
import { PAGE_COPY } from "./report-deck";
import type { AuditData } from "./types";
import type { PageData } from "./net";

// A shop where every check fails: pages with no title, no headings, no links, two of them identical.
const bare = (url: string): PageData => ({ url, status: 200, ok: true, headers: {}, html: `<html><body><p>${"Un text scurt despre produs, repetat pe doua pagini ale magazinului. ".repeat(4)}</p></body></html>` });
const pages = ["https://s.ro/", "https://s.ro/categorie/a/", "https://s.ro/produs/b/", "https://s.ro/produs/c/?id=3"].map(bare);
const pageChecks = {
  seoChecks: computeSeoChecks(pages),
  continutChecks: computeContinutChecks(pages),
  keywordsChecks: computeKeywordsChecks(pages),
  structuraChecks: computeStructuraChecks(pages, "", "", "https://s.ro/sitemap.xml"),
  aiChecks: computeAiChecks("User-agent: GPTBot\nDisallow: /", "", pages),
};
const fail = (value: string) => ({ status: "critic" as const, value });
const data: AuditData = {
  url: "https://s.ro", domain: "s.ro", pagesAnalyzed: 4, scor: 20, isEcom: true,
  ...pageChecks,
  checksRezultate: {
    schema_tipuri: fail("Lipseste schema Organization"), schema_produs: fail("Product cu pret pe 0 din 2 pagini de produs verificate"),
    schema_breadcrumbs: fail("BreadcrumbList pe 0 din 3 pagini de categorie si produs verificate"), schema_rating: fail("Rating pe 0 din 2 pagini de produs verificate"),
    og_tags: fail("OG title sau description lipsa"), og_image: fail("og:image lipseste"), https: fail("Site-ul nu are HTTPS"),
    hsts: fail("Header HSTS absent"), security_headers: fail("Headere de securitate lipsa"), imagini_alt: fail("7 imagini fara alt text"),
    pagespeed_mobile: fail("31 / 100"), lcp: fail("6.1 s"), cls: fail("0.4"), inp: fail("900 ms"), ttfb: fail("1900 ms"),
    imagini_optimizate: fail("14 imagini neoptimizate (nu WebP)"), favicon: fail("Favicon lipsa"), apple_icon: fail("apple-touch-icon lipsa"),
  },
  productSignal: { checked: 2, weakTitles: 2, missingMeta: 2, hasFeed: false, headline: "meta description lipsa", message: "title tag prea scurt" },
  ux: computeUxAudit(pages, { homepage: pages[0].url, categories: [pages[1].url], products: [pages[2].url, pages[3].url] }, null, "s.ro"),
} as AuditData;

// Words a shop owner does not use. File names the owner hands to a developer (robots.txt, llms.txt) are allowed.
const JARGON = /\b(keywords?|kw|h[1-6]|url|url-uri|slug|301|canonical|meta|snippets?|serp|schema|json-ld|breadcrumbs?|breadcrumblist|llms?(?!\.txt)|llm-urile|crawler\w*|sitemap|noindex|headere?|hsts|og:\w+|favicon|apple-touch-icon|webp|avif|rich result|featured|targetat|rankeaza|canibalizare|on-page|title tag|alt text|organization|product|hero|lastmod|x-frame-options)\b/gi;
const visibleText = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");

describe("the report speaks the shop owner's language", () => {
  it("has client wording for every page check the engine produces", () => {
    const ids = Object.values(pageChecks).flat().map((c) => c.id);
    expect(ids.filter((id) => !PAGE_COPY[id])).toEqual([]);
  });

  it("shows no technical term anywhere on a report where every check fails", () => {
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data })));
    expect(text).toContain("Pagini fara un titlu principal clar");
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
  });

  it("reads a report saved before the client wording without technical terms", () => {
    const home = { id: "home", label: "Analiza homepage", status: "partial" as const, scor: 50, gasit: ["mesaj / hero clar (H1)"], lipsa: ["fara breadcrumbs"], problema: "", fix: "" };
    const old = { ...data, ux: { ...data.ux!, fields: [home, { ...home, id: "categorie", gasit: ["breadcrumbs (stii unde esti)"], lipsa: ["fara titlu-hero clar (H1)"] }] } };
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: old })));
    expect(text).toContain("mesaj clar la inceputul paginii");
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
  });
});
