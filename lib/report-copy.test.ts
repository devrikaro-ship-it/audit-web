import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDeck } from "@/components/report-deck";
import { computeAiChecks, computeContinutChecks, computeKeywordsChecks, computeSeoChecks, computeStructuraChecks, computeUxAudit, computeUxStandard } from "./audit-engine";
import { computeSeoComponents } from "./seo-components";
import { buildDeck, PAGE_COPY, UX_QUESTION_OF } from "./report-deck";
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
  uxStd: computeUxStandard("ecom", pages, { categories: [pages[1].url], products: [pages[2].url, pages[3].url], services: [], locations: [] }, null, "s.ro"),
  seo: computeSeoComponents({
    origin: "https://s.ro", requested: [...pages, { ...pages[0], url: "https://s.ro/x", status: 500, ok: false }], pages,
    categories: [pages[1].url], products: [pages[2].url, pages[3].url],
    robotsTxt: "User-agent: *\nDisallow: /categorie/\nUser-agent: OAI-SearchBot\nDisallow: /", sitemapXml: "", listed: { categories: 0, products: 0, other: 0 },
    refusedServer: true, readWithBrowser: false,
    probes: { sitemapLastmod: null, httpToHttps: false, maxRedirectHops: 4, variantsSameHost: false, sitemapSample: { ok: 0, total: 0 }, sortParamHandled: false },
  }),
};

// A lead site's report: every lead row failing, so each lead title and fix is rendered.
const leadData: AuditData = {
  ...data,
  siteKind: { type: "leads", by: "scan", confidence: "high", evidence: null },
  uxStd: computeUxStandard("leads", pages, { categories: [], products: [], services: [pages[1].url, pages[2].url], locations: [pages[3].url] }, { score: 40, lcp: "4,2 s" } as never, "s.ro"),
  seo: computeSeoComponents({
    origin: "https://s.ro", requested: pages, pages, categories: [], products: [],
    robotsTxt: "User-agent: *\nDisallow: /categorie/", sitemapXml: "<urlset></urlset>", listed: { categories: 0, products: 0, other: 3 },
    refusedServer: false, readWithBrowser: false,
    probes: { sitemapLastmod: false, httpToHttps: true, maxRedirectHops: 1, variantsSameHost: true, sitemapSample: { ok: 1, total: 2 }, sortParamHandled: null },
    kind: "leads", services: [pages[1].url, pages[2].url], locations: [pages[3].url, pages[1].url], inSitemap: () => false,
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
    const text = [tenData, leadData].map((d) => visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: d })))).join(" ");
    // The lead report is really rendered in its own words.
    expect(text).toContain("Google nu primeste adresa si telefonul afacerii");
    // Each component says why it has its verdict; a failing rule is named by its problem, with its count.
    expect(text).toMatch(/De ce e (bun|de reglat|rau): /);
    expect(text).toContain("De reparat: 1 din 5 pagini nu se deschid: dau eroare sau nu mai exista");
    // More failing rules than the line names: it says how many and where they are, never a bare "si inca 3".
    expect(text).toContain("plus inca 3 reguli, in checklist la componenta 9");
    // A row we could not measure says what is at stake and how to fix it, not only that we could not measure it.
    expect(text).toMatch(/Titlurile au 15-65 de caractere De verificat: nu am putut masura asta din afara site-ului\. Impact negativ daca nu e indeplinit: Un titlu prea scurt[^.]*\. Cum se repara: Tine titlurile intre 15 si 65 de caractere/);
    // A ✗ row states the problem with its count, then why that is bad, then how to fix it; a ✓ row says why it is good.
    expect(text).toMatch(/1 din 5 pagini nu se deschid: dau eroare sau nu mai exista Impact negativ: Un client sau Google care ajunge pe o pagina cu eroare pleaca[^.]*\. Cum se repara: /);
    expect(text).toMatch(/Site-ul are fisierul robots\.txt, cu regulile pentru Google Impact pozitiv: Google citeste site-ul dupa regulile tale si afla mai repede de paginile noi\./);
    // Part 2 as ✓/✗ rows, both kinds.
    // Part 2 in the same form: a failing rule named by its problem, then its impact and its fix.
    expect(text).toMatch(/Site-ul nu are un formular scurt de contact, de cel mult cinci campuri Impact negativ: Un formular lung[^.]*\. Cum se repara: /);
    expect(text).toContain("Lista de produse nu arata poza si pretul fiecarui produs");
    expect(text).toContain("Paginile se deschid corect");
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
    // Counts as Romanian writes them: "4 pagini", never "4 de pagini" (1-19 and 101-119 take no "de").
    expect(text).toContain("citit pe 4 pagini");
    expect(text.match(/\b(?:[1-9]|1\d|10[1-9]|11\d) de \w+/g) ?? []).toEqual([]);
  });

  it("reads a report saved before the client wording without technical terms", () => {
    const home = { id: "home", label: "Analiza homepage", status: "partial" as const, scor: 50, gasit: ["mesaj / hero clar (H1)"], lipsa: ["fara breadcrumbs"], problema: "", fix: "" };
    const old = { ...data, ux: { ...data.ux!, fields: [home, { ...home, id: "categorie", gasit: ["breadcrumbs (stii unde esti)"], lipsa: ["fara titlu-hero clar (H1)"] }] } };
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: old })));
    expect(text).toMatch(/un titlu mare sus spune ce vinzi/i);
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
  });

  it("reads a report saved with the short labels of 2026-09-24/25 in the labels that say what was measured", () => {
    const prod = { id: "produs", label: "Pagina de produs", status: "partial" as const, scor: 50, gasit: ["pret + stoc", "imagini multiple", "recenzii / rating"], lipsa: [], problema: "", fix: "" };
    const saved = { ...data, ux: { ...data.ux!, fields: [prod] } };
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: saved })));
    expect(text).toMatch(/pretul si stocul se vad pe pagina produsului/i);
    expect(text).toMatch(/cel putin 3 poze pe produs/i);
    expect(text).not.toMatch(/pret \+ stoc|imagini multiple|recenzii \/ rating/i);
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
// A count with its noun from the register ("4 pagini", "51 de pagini") is data too.
const COUNTED = new RegExp(`^\\d+ (?:de )?(?:${Object.values(REGISTRY.NOUN).flat().join("|")})$`);
const segments = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").split(/<[^>]+>/)
  .map((t) => t.replace(/&nbsp;/g, "\u00a0").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim())
  .filter(Boolean);
// A text is known when it is data, an entry, or a template whose every placeholder is filled with something known
// (a template made only of placeholders, "{n} {what}", therefore accepts nothing on its own).
// Entries are matched whatever the case of their first letter (a sentence starts with a capital).
const outsideRegistry = (html: string) => {
  const ts = templates();
  // Remembered per text and depth: a composed sentence (a verdict line with its list of faults) nests templates.
  const seen = new Map<string, boolean>();
  const known = (raw: string, depth = 7): boolean => {
    const key = `${depth}|${raw}`;
    if (!seen.has(key)) { seen.set(key, false); seen.set(key, check(raw, depth)); }
    return seen.get(key)!;
  };
  const check = (raw: string, depth: number): boolean => {
    const t = raw.trim();
    if (!t || DATA.test(t) || DOMAIN.test(t) || COUNTED.test(t)) return true;
    for (const v of [t, t.charAt(0).toLowerCase() + t.slice(1), t.charAt(0).toUpperCase() + t.slice(1)]) {
      for (const re of ts) {
        const m = re.exec(v);
        if (m && (m.length === 1 || (depth > 0 && m.slice(1).every((g) => known(g, depth - 1))))) return true;
      }
    }
    // Two known texts side by side: "<a> · <b>", or a title followed by its page counter "(1/4)".
    if (depth > 0 && t.includes(" · ") && t.split(" · ").every((p) => known(p, depth - 1))) return true;
    // A list of faults joined by "; ".
    if (depth > 0 && t.includes("; ") && t.split("; ").every((p) => known(p, depth - 1))) return true;
    const paren = t.lastIndexOf(" (");
    if (depth > 0 && paren > 0 && known(t.slice(0, paren), depth - 1) && known(t.slice(paren), depth - 1)) return true;
    return false;
  };
  return [...new Set(segments(html).filter((t) => !known(t)))];
};

// A lead report whose home page was judged by the AI: a section present, one missing, design judged "rau".
const aiSays = { seen: "fotografii de stoc cu zambete generice in primul ecran", problem: "Vizitatorul nu vede clinica reala si nu are incredere.", fix: "Pune in primul ecran o poza reala a clinicii si un buton de programare." };
const withAi: AuditData = { ...leadData, uxStd: leadData.uxStd!.map((g) => g.id !== "home" ? g : { ...g, rows: [...g.rows,
  { id: "st_leads_home_hero", ok: 1, total: 1, evaluated: true },
  { id: "st_leads_home_echipa", ok: 0, total: 1, evaluated: true },
  { id: "ai_home_design", ok: 0, total: 1, evaluated: true, ai: { grade: "rau" as const, ...aiSays } },
  { id: "ai_home_content", ok: 1, total: 1, evaluated: true, ai: { grade: "bun" as const, seen: "titlul 'Radiografii fara griji, in 10 centre'", problem: "", fix: "" } },
] }) };

describe("Part 2 judged by the AI", () => {
  it("shows the AI rows by grade with what it saw, the impact and the fix, and a missing section with its problem", () => {
    const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: withAi })));
    expect(text).toContain("Designul paginii e doar decor, nu duce spre programare");
    expect(text).toContain(`Ce am vazut: ${aiSays.seen} Impact negativ: ${aiSays.problem}`);
    expect(text).toContain(`Cum se repara: ${aiSays.fix}`);
    expect(text).toContain("Textele si dovezile paginii aduc programari");
    expect(text).toContain("Echipa nu apare pe prima pagina");
    expect(text).toMatch(/Rau · evaluat pe capturi/);
    expect(text).toMatch(/Structura · (Bun|De reglat|Rau)/);
    expect([...new Set(text.match(JARGON) ?? [])]).toEqual([]);
  });
});

describe("every rule says its problem, why it is bad and why it is good", () => {
  it("each shop row and each lead row, with lead overrides laid over the shop row", () => {
    const missing: string[] = [];
    const need = ["bad", "problem", "good"] as const;
    for (const [k, r] of Object.entries(REGISTRY.ROWS)) for (const f of need) if (!r[f]) missing.push(`${k}.${f}`);
    for (const [k, r] of Object.entries(REGISTRY.ROWS_LEADS)) { const m = { ...REGISTRY.ROWS[k], ...r } as Record<string, string>; for (const f of need) if (!m[f]) missing.push(`lead ${k}.${f}`); }
    expect(missing).toEqual([]);
  });

  it("every row the engine measures has its wording: a row without one would vanish from the report unseen", () => {
    // 2026-09-26: a rewrite of the register dropped its last row (ai_profiluri); the report filtered it out silently.
    const shop = tenData.seo!.flatMap((c) => c.rows).map((r) => r.id).filter((id) => !REGISTRY.ROWS[id]);
    const lead = leadData.seo!.flatMap((c) => c.rows).map((r) => r.id).filter((id) => !REGISTRY.ROWS[id] && !REGISTRY.ROWS_LEADS[id]);
    expect([...shop, ...lead]).toEqual([]);
  });

  it("every UX rule outside speed answers one of the four questions, and each page type shows them as headings", () => {
    const rows = [tenData, leadData].flatMap((d) => (d.uxStd ?? []).filter((c) => c.id !== "viteza").flatMap((c) => c.rows)).map((r) => r.id);
    expect(rows.filter((id) => !UX_QUESTION_OF[id])).toEqual([]);
    const text = [tenData, leadData].map((d) => visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: d })))).join(" ");
    for (const q of Object.values(REGISTRY.UX_QUESTIONS)) expect(text).toMatch(new RegExp(`${q} · (Bun|De reglat|Rau|De verificat)`));
  });

  it("every UX rule, shop signal or lead row, says its problem and both impacts", () => {
    const need = ["bad", "problem", "good"] as const;
    const rows = { ...(REGISTRY.UX_SIGNALS as Record<string, Record<string, string>>), ...(REGISTRY.UX_ROWS as Record<string, Record<string, string>>) };
    expect(Object.entries(rows).flatMap(([k, r]) => need.filter((f) => !r[f]).map((f) => `${k}.${f}`))).toEqual([]);
    const ux = [tenData, leadData].flatMap((d) => (d.uxStd ?? []).flatMap((c) => c.rows)).map((r) => r.id).filter((id) => !rows[id]);
    expect(ux).toEqual([]);
  });
});

describe("the report speaks only from its register", () => {
  it("every visible text of a report, old or with the ten components, desktop or phone, comes from the register", () => {
    for (const d of [data, tenData, leadData]) for (const phone of [false, true]) {
      expect(outsideRegistry(renderToStaticMarkup(createElement(ReportDeck, { data: d, createdAt: Date.UTC(2026, 8, 24), phone })))).toEqual([]);
    }
  });

  it("one thing, one wording: no sentence is written twice in the register", () => {
    // A second entry for the same thing points at the first (ROWS.x.fix), so a sentence appears as text only once.
    // Codes are not wording: the stage letter, the kind of result, an id.
    const src = readFileSync(path.join(process.cwd(), "lib/copy-registry.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");
    const literals = [...src.matchAll(/(\w+:\s*)?"((?:[^"\\]|\\.)*)"/g)].filter((m) => !/^(stage|kind|id):/.test(m[1] ?? "") && m[2]).map((m) => m[2].toLowerCase());
    const seen = new Map<string, number>();
    for (const t of literals) seen.set(t, (seen.get(t) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([t]) => t)).toEqual([]);
  });
});

describe("a lead site's report speaks of services, not of a shop (spec 2026-09-25 §5)", () => {
  // "poze cumparate" (stock photos) is not shopping.
  const SHOP = /produs\w*|\bcos(ul)?\b|categori\w*|magazin\w*|cumpar(?!ate)\w*|\bvand\w*/gi;
  it("no shop word on any slide, desktop or phone", () => {
    for (const phone of [false, true]) {
      const text = visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: leadData, createdAt: Date.UTC(2026, 8, 25), phone })));
      expect([...new Set(text.match(SHOP) ?? [])]).toEqual([]);
    }
  });
  it("a shop's report keeps its words", () => {
    expect(visibleText(renderToStaticMarkup(createElement(ReportDeck, { data: tenData })))).toMatch(/categorii si produse/);
  });
});

