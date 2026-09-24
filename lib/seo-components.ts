// Part 1 of the site audit: the ten SEO components in dependency order (docs/superpowers/specs/
// 2026-09-24-seo-ten-components-design.md). Pure: the pages read and the network probes in, measured rows out.
// A row is ok of total; total 0 means not measured. verify marks a finding we observed but cannot confirm
// ("de verificat"). Words for the client live in the report (lib/report-deck.ts), never here.
import { countH1, parseCanonical, parseImages, parseJsonLD, parseMeta, parseMetaOG as parseMetaProperty, parseTitle } from "./parse-page";
import { priceCount } from "./page-selection";
import { hasRobotsRules, isAllowed } from "./robots-rules";
import { duplicateTextPages, isNoindex, ownWrittenText, sameAsLinks } from "./audit-engine";
import type { PageData } from "./net";
import type { SeoComponent, SeoRow } from "./types";

export type SeoProbes = {
  httpToHttps: boolean | null;       // http://host answers with a redirect to https
  maxRedirectHops: number | null;    // most redirects any http/www variant needs to reach the final address
  variantsSameHost: boolean | null;  // www and non-www end on the same host
  sitemapSample: { ok: number; total: number };  // listed money pages answering 200 with no redirect
  sortParamHandled: boolean | null;  // a category with ?sort= points back to the clean address (canonical) or is noindex
  sitemapLastmod: boolean | null;    // last-modified dates in the sitemap, or in the first child of a sitemap index
};

export type SeoInput = {
  origin: string;
  requested: PageData[];
  pages: PageData[];                 // the pages read successfully, home page first
  categories: string[];
  products: string[];
  robotsTxt: string;
  sitemapXml: string;
  listed: { categories: number; products: number; other: number };
  refusedServer: boolean;
  readWithBrowser: boolean;
  probes: SeoProbes;
};

const row = (id: string, ok: number, total: number, verify = false): SeoRow => ({ id, ok, total, ...(verify ? { verify } : {}) });
const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
const plain = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (t: string) => plain(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
const count = <T>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;

// JSON-LD nodes of a given @type, wherever they sit (@graph, arrays, nested).
function nodesOfType(html: string, type: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    const t = o["@type"];
    if ((Array.isArray(t) ? t : [t]).includes(type)) out.push(o);
    Object.values(o).forEach(walk);
  };
  parseJsonLD(html).forEach(walk);
  return out;
}
const offersOf = (p: Record<string, unknown>) => ([] as unknown[]).concat(p.offers ?? []).filter((o): o is Record<string, unknown> => !!o && typeof o === "object");
const priceOf = (o: Record<string, unknown>) => Number(String(o.price ?? o.lowPrice ?? "").replace(",", "."));

// Numbers a visitor reads on the page: "1.299,00" and "1,299.00" both read as 1299.
function visiblePrices(html: string): number[] {
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  return [...text.matchAll(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?/g)].map((m) => {
    const s = m[0].replace(/\s/g, "");
    return /,\d{1,2}$/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : /^\d{1,3}(\.\d{3})+$/.test(s) ? Number(s.replace(/\./g, "")) : Number(s);
  });
}

function repeated(pages: PageData[], value: (p: PageData) => string): number {
  const urls = new Map<string, Set<string>>();
  for (const p of pages) { const v = value(p).trim().toLowerCase(); if (v) urls.set(v, (urls.get(v) ?? new Set()).add(norm(p.url))); }
  return [...urls.values()].filter((u) => u.size > 1).reduce((n, u) => n + u.size, 0);
}

const SEARCH_BOTS = ["Googlebot", "Bingbot"];
const AI_SEARCH_BOTS = ["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"];

export function computeSeoComponents(input: SeoInput): SeoComponent[] {
  const { pages, robotsTxt, sitemapXml, probes } = input;
  const byUrl = new Map(pages.map((p) => [norm(p.url), p]));
  const pick = (urls: string[]) => urls.map((u) => byUrl.get(norm(u))).filter((p): p is PageData => !!p);
  const cats = pick(input.categories);
  const prods = pick(input.products);
  const money = [...cats, ...prods];
  const own = new Map(ownWrittenText(pages).map((o, i) => [norm(pages[i].url), o.own]));
  const ownChars = (p: PageData) => (own.get(norm(p.url)) ?? []).reduce((n, b) => n + b.length, 0);
  const path = (u: string) => { try { const x = new URL(u); return x.pathname + x.search; } catch { return u; } };

  const answered = input.requested.filter((p) => p.status !== 403 && p.status !== 429);
  // Stylesheets are always needed to render the page; a script may be (cart, checkout) or may not, so it is not judged.
  const homeAssets = [...(pages[0]?.html ?? "").matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
    .map((m) => { try { return new URL(m[1], input.origin + "/"); } catch { return null; } })
    .filter((u): u is URL => !!u && u.origin === input.origin).map((u) => u.pathname).slice(0, 20);
  const moneyPaths = money.map((p) => path(p.url)).slice(0, 20);
  const hasSitemap = /<urlset|<sitemapindex/i.test(sitemapXml);
  const listedTyped = input.listed.categories + input.listed.products > 0;

  const titled = pages.filter((p) => parseTitle(p.html));
  const described = pages.filter((p) => parseMeta(p.html, "description"));
  const nameInTitle = money.filter((p) => words((p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ")).length > 0);
  // The product's own photo: the images whose file is the page's declared main image (og:image or Product.image).
  // Decorative images may rightly have an empty alt, so only the product photo is judged.
  const fileOf = (u: string) => u.split("?")[0].split("/").pop()?.toLowerCase() ?? "";
  const productImages = (p: PageData) => {
    const declared = [parseMetaProperty(p.html, "og:image"), ...nodesOfType(p.html, "Product").flatMap((n) => ([] as unknown[]).concat(n.image ?? []))]
      .map((x) => (typeof x === "string" ? x : typeof x === "object" && x ? String((x as Record<string, unknown>).url ?? "") : "")).filter(Boolean).map(fileOf);
    return parseImages(p.html).filter((im) => im.src && declared.includes(fileOf(im.src)));
  };
  const withImages = prods.filter((p) => productImages(p).length > 0);
  const priced = prods.filter((p) => nodesOfType(p.html, "Product").some((n) => offersOf(n).some((o) => priceOf(o) > 0)));

  return [
    { id: "raspuns", rows: [
      row("pagini_200", count(answered, (p) => p.status === 200), answered.length),
      row("https", input.origin.startsWith("https://") && probes.httpToHttps !== false ? 1 : 0, 1),
      // Google follows up to 10 hops; two (http://www -> https://www -> https://) is the common setup, three or more a chain.
      row("redirect_scurt", probes.maxRedirectHops !== null && probes.maxRedirectHops <= 2 ? 1 : 0, probes.maxRedirectHops === null ? 0 : 1),
      row("acces_server", input.refusedServer ? 0 : 1, 1, input.refusedServer),
    ] },
    { id: "robots", rows: [
      row("robots_exista", hasRobotsRules(robotsTxt) ? 1 : 0, 1),
      row("robots_motoare", count(SEARCH_BOTS, (b) => isAllowed(robotsTxt, b, "/")), SEARCH_BOTS.length),
      row("robots_pagini", count([...moneyPaths, ...homeAssets], (pth) => isAllowed(robotsTxt, "Googlebot", pth)), moneyPaths.length + homeAssets.length),
      row("robots_sitemap", /^\s*sitemap\s*:/im.test(robotsTxt) ? 1 : 0, 1),
    ] },
    { id: "sitemap", rows: [
      row("sitemap_exista", hasSitemap ? 1 : 0, 1),
      row("sitemap_tipuri", (input.listed.categories > 0 ? 1 : 0) + (input.listed.products > 0 ? 1 : 0), hasSitemap && listedTyped ? 2 : 0),
      row("sitemap_valide", probes.sitemapSample.ok, probes.sitemapSample.total),
      row("sitemap_lastmod", probes.sitemapLastmod ? 1 : 0, hasSitemap && probes.sitemapLastmod !== null ? 1 : 0),
    ] },
    { id: "indexare", rows: [
      row("fara_noindex", count(money, (p) => !isNoindex(p)), money.length),
      row("canonical_propriu", count(money, (p) => { const c = parseCanonical(p.html); if (!c) return false; try { return norm(new URL(c, p.url).href) === norm(p.url); } catch { return false; } }), money.length),
      row("www_unic", probes.variantsSameHost ? 1 : 0, probes.variantsSameHost === null ? 0 : 1),
      row("parametri", probes.sortParamHandled ? 1 : 0, probes.sortParamHandled === null ? 0 : 1),
    ] },
    { id: "html", rows: input.readWithBrowser ? [row("html_nume", 0, 0), row("html_pret", 0, 0), row("html_descriere", 0, 0)] : [
      row("html_nume", count(prods, (p) => words((p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ")).length > 0), prods.length),
      row("html_pret", count(prods, (p) => priceCount(p.html.replace(/<script[\s\S]*?<\/script>/gi, " ")) > 0), prods.length),
      row("html_descriere", count(prods, (p) => ownChars(p) >= 200), prods.length),
    ] },
    { id: "titlu", rows: [
      row("titlu_exista", titled.length, pages.length),
      row("titlu_lungime", count(titled, (p) => { const n = parseTitle(p.html).length; return n >= 15 && n <= 65; }), titled.length),
      row("titlu_unic", titled.length - repeated(titled, (p) => parseTitle(p.html)), titled.length),
      row("titlu_nume", count(nameInTitle, (p) => {
        const name = words((p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ")).slice(0, 3);
        const title = words(parseTitle(p.html));
        // At least two of the first three words (all when the name is shorter): a trailing qualifier may be left out.
        return count(name, (w) => title.some((t) => t.startsWith(w.slice(0, 5)))) >= Math.min(2, name.length);
      }), nameInTitle.length),
    ] },
    { id: "descriere", rows: [
      row("descriere_exista", described.length, pages.length),
      row("descriere_unica", described.length - repeated(described, (p) => parseMeta(p.html, "description")), described.length),
      row("descriere_lungime", count(described, (p) => { const n = parseMeta(p.html, "description").length; return n >= 70 && n <= 160; }), described.length),
    ] },
    { id: "continut", rows: [
      row("un_titlu_mare", count(pages, (p) => countH1(p.html) === 1), pages.length),
      row("text_propriu", pages.length - duplicateTextPages(pages), pages.length),
      row("text_categorii", count(cats, (p) => ownChars(p) >= 200), cats.length),
      row("alt_imagini", count(withImages, (p) => productImages(p).every((im) => im.alt.trim().length > 0)), withImages.length),
    ] },
    { id: "date_structurate", rows: [
      row("schema_firma", pages.some((p) => ["Organization", "OnlineStore", "Store", "LocalBusiness"].some((t) => nodesOfType(p.html, t).length > 0)) ? 1 : 0, pages.length ? 1 : 0),
      row("schema_produs", count(prods, (p) => nodesOfType(p.html, "Product").some((n) => offersOf(n).some((o) => priceOf(o) > 0 && !!o.availability))), prods.length),
      row("schema_rating", count(prods, (p) => nodesOfType(p.html, "AggregateRating").length > 0), prods.length),
      row("schema_traseu", count(money, (p) => nodesOfType(p.html, "BreadcrumbList").length > 0), money.length),
      row("schema_livrare", count(prods, (p) => /"(shippingDetails|hasMerchantReturnPolicy)"/.test(p.html)), prods.length),
      row("schema_pret_vizibil", count(priced, (p) => {
        const declared = nodesOfType(p.html, "Product").flatMap(offersOf).map(priceOf).filter((x) => x > 0);
        const shown = visiblePrices(p.html);
        return declared.some((d) => shown.some((s) => Math.abs(s - d) < 0.01));
      }), priced.length),
    ] },
    { id: "ai", rows: [
      row("ai_roboti", count(AI_SEARCH_BOTS, (b) => isAllowed(robotsTxt, b, "/")), AI_SEARCH_BOTS.length),
      row("ai_profiluri", Math.min(sameAsLinks(pages).size, 2), 2),
    ] },
  ];
}

// Component score: mean of its measured rows; SEO score: mean of the components with a measured row.
export function componentScore(c: SeoComponent): number | null {
  const measured = c.rows.filter((r) => r.total > 0 && !r.verify);
  return measured.length ? Math.round(measured.reduce((s, r) => s + (r.ok / r.total) * 100, 0) / measured.length) : null;
}
export function seoScore(components: SeoComponent[]): number {
  const scores = components.map(componentScore).filter((s): s is number => s !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}
