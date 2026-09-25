import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDeck } from "@/components/report-deck";
import { computeAiChecks, computeContinutChecks, computeKeywordsChecks, computeSeoChecks, computeStructuraChecks, computeUxAudit } from "./audit-engine";
import { computeSeoComponents } from "./seo-components";
import { buildDeck, PAGE_COPY } from "./report-deck";
import * as REGISTRY from "./copy-registry";
import type { AuditData } from "./types";
import type { PageData } from "./net";

// A shop where every check fails: pages with no title, no headings, no links, two of them identical.
const bare = (url: string): PageData => ({ url, status: 200, ok: true, headers: {}, html: `<html><body><p>${"Un text scurt despre produs, repetat pe doua pagini ale magazinului. ".repeat(4)}</p></body></html>` });
const pages = ["https://s.ro/", "https://s.ro/categorie/a/", "https://s.ro/produs/b/", "https://s.ro/produs/c/?id=3"].map(bare);
const pageChecks = {
  seoChecks: computeSeoChecks(pages),
  continutChecks: computeContinutChecks(pages),
  keywordsChecks: computeKeywordsChecks(pages),
  structuraChecks: computeStructuraChecks(pages, "", "", "https://s.ro/sitemap.xml", { categories: [pages[1].url], products: [pages[2].url, pages[3].url] }),
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
// The same shop with the ten SEO components: every one of them failing, some rows unmeasured or unconfirmed.
const tenData: AuditData = {
  ...data,
  seo: computeSeoComponents({
    origin: "https://s.ro", requested: [...pages, { ...pages[0], url: "https://s.ro/x", status: 500, ok: false }], pages,
    categories: [pages[1].url], products: [pages[2].url, pages[3].url],
    robotsTxt: "User-agent: *\nDisallow: /categorie/\nUser-agent: OAI-SearchBot\nDisallow: /", sitemapXml: "", listed: { categories: 0, products: 0, other: 0 },
    refusedServer: true, readWithBrowser: false,
    probes: { sitemapLastmod: null, httpToHttps: false, maxRedirectHops: 4, variantsSameHost: false, sitemapSample: { ok: 0, total: 0 }, sortParamHandled: false },
  }),
};

// Words a shop owner does not use. File names the owner hands to a developer (robots.txt, llms.txt) are allowed.
const JARGON = /\b(keywords?|kw|h[1-6]|url|url-uri|slug|301|canonical|meta|snippets?|serp|schema|json-ld|breadcrumbs?|breadcrumblist|llms?(?!\.txt)|llm-urile|crawl\w*|noindex|headere?|hsts|og:\w+|favicon|apple-touch-icon|webp|avif|rich result|featured|targetat|rankeaza|canibalizare|on-page|title tag|alt text|organization|product|hero|lastmod|x-frame-options)\b/gi;
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

  it("shows no technical term on a report built from the ten SEO components", () => {
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: tenData })));
    expect(text).toContain("Paginile raspund corect");
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
  });

  it("reads a report saved before the client wording without technical terms", () => {
    const home = { id: "home", label: "Analiza homepage", status: "partial" as const, scor: 50, gasit: ["mesaj / hero clar (H1)"], lipsa: ["fara breadcrumbs"], problema: "", fix: "" };
    const old = { ...data, ux: { ...data.ux!, fields: [home, { ...home, id: "categorie", gasit: ["breadcrumbs (stii unde esti)"], lipsa: ["fara titlu-hero clar (H1)"] }] } };
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: old })));
    expect(text).toContain("mesaj clar la inceputul paginii");
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
  });

  it("every open checklist row says how to fix it", () => {
    for (const d of [buildDeck(data), buildDeck(tenData)]) {
    const pageNames = ["Homepage", "Pagina de categorie", "Pagina de produs", "Filtre si sortare"];
    const std = (d.seo.standard ?? []).flatMap((g) => g.rows).filter((r) => r.state !== "ok").map((r) => ({ ...r, done: false }));
    const open = [...d.seo.checklist, ...std, ...d.ux.checklist].filter((r) => !r.done);
    expect(open.length).toBeGreaterThan(20);
    expect(open.filter((r) => !r.note || pageNames.includes(r.note)).map((r) => r.title)).toEqual([]);
    }
  });
});

// THE REGISTER (operator, 2026-09-25): every sentence the report shows comes from lib/copy-registry.ts, and one thing
// has one wording. Its texts are templates whose {placeholders} carry measured numbers, names or other entries.
const registryTexts = (): string[] => {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  Object.values(REGISTRY).forEach((v) => { if (typeof v !== "function") walk(v); });
  return out;
};
const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templates = () => registryTexts().filter((t) => /[a-z]{2}/i.test(t)).map((t) =>
  new RegExp(`^${escape(t.trim()).replace(/\\\{\w+\\\}/g, "(.+?)")}$`, "is"));
// What is not wording: numbers with their units, scores, page counts, the slide counter, the audited domain.
const DATA = /^([\d\s.,/%—·:+()×✓✗?<>-]|ms\b|s\b|px\b)*$/;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const segments = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").split(/<[^>]+>/)
  .map((t) => t.replace(/&nbsp;/g, "\u00a0").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim())
  .filter(Boolean);
// A text is known when it is data, an entry, or a template whose every placeholder is filled with something known
// (a template made only of placeholders, "{n} {what}", therefore accepts nothing on its own).
// Entries are matched whatever the case of their first letter (a sentence starts with a capital).
const outsideRegistry = (html: string) => {
  const ts = templates();
  const known = (raw: string, depth = 2): boolean => {
    const t = raw.trim();
    if (!t || DATA.test(t) || DOMAIN.test(t)) return true;
    for (const v of [t, t.charAt(0).toLowerCase() + t.slice(1), t.charAt(0).toUpperCase() + t.slice(1)]) {
      for (const re of ts) {
        const m = re.exec(v);
        if (m && (m.length === 1 || (depth > 0 && m.slice(1).every((g) => known(g, depth - 1))))) return true;
      }
    }
    // Two known texts side by side: "<a> · <b>", or a title followed by its page counter "(1/4)".
    if (depth > 0 && t.includes(" · ") && t.split(" · ").every((p) => known(p, depth - 1))) return true;
    const paren = t.lastIndexOf(" (");
    if (depth > 0 && paren > 0 && known(t.slice(0, paren), depth - 1) && known(t.slice(paren), depth - 1)) return true;
    return false;
  };
  return [...new Set(segments(html).filter((t) => !known(t)))];
};

describe("the report speaks only from its register", () => {
  it("every visible text of a report, old or with the ten components, desktop or phone, comes from the register", () => {
    for (const d of [data, tenData]) for (const phone of [false, true]) {
      expect(outsideRegistry(renderToStaticMarkup(createElement(ReportDeck, { data: d, createdAt: Date.UTC(2026, 8, 24), phone })))).toEqual([]);
    }
  });

  it("one thing, one wording: no sentence is written twice in the register", () => {
    // A second entry for the same thing points at the first (ROWS.x.fix), so a sentence appears as text only once.
    // Codes are not wording: the stage letter and the kind of result.
    const src = readFileSync(path.join(process.cwd(), "lib/copy-registry.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");
    const literals = [...src.matchAll(/(\w+:\s*)?"((?:[^"\\]|\\.)*)"/g)].filter((m) => !/^(stage|kind):/.test(m[1] ?? "") && m[2]).map((m) => m[2].toLowerCase());
    const seen = new Map<string, number>();
    for (const t of literals) seen.set(t, (seen.get(t) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([t]) => t)).toEqual([]);
  });
});

