import { describe, expect, it } from "vitest";
import { componentScore, computeSeoComponents, seoScore, type SeoInput, type SeoProbes } from "./seo-components";
import type { PageData } from "./net";

const O = "https://s.ro";
const desc = (x: string) => `Descriere ${x}: produs de calitate, livrat rapid in toata tara, cu garantie si retur usor pentru orice client al magazinului.`;
const text = (x: string) => `<p>${`Textul propriu al paginii ${x}, scris pentru cumparatori, cu detalii despre folosire si alegere. `.repeat(3)}</p>`;
const productLd = (name: string, price: number, extra = "") => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name, image: "https://s.ro/img/set.jpg", offers: { "@type": "Offer", price, priceCurrency: "RON", availability: "https://schema.org/InStock", ...(extra ? JSON.parse(extra) : {}) }, aggregateRating: { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 12 } })}</script>`;
const crumbs = `<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>`;
const org = `<script type="application/ld+json">{"@type":"OnlineStore","name":"S","sameAs":["https://facebook.com/s","https://instagram.com/s"]}</script>`;

function page(url: string, o: { title?: string; h1?: string; meta?: string; body?: string; head?: string; canonical?: string | null; status?: number } = {}): PageData {
  const canonical = o.canonical === undefined ? url : o.canonical;
  return {
    url, status: o.status ?? 200, ok: (o.status ?? 200) === 200, headers: {},
    html: `<html><head><title>${o.title ?? ""}</title>${o.meta ? `<meta name="description" content="${o.meta}">` : ""}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}${o.head ?? ""}</head><body>${o.h1 ? `<h1>${o.h1}</h1>` : ""}${o.body ?? ""}</body></html>`,
  };
}

const goodProbes: SeoProbes = { sitemapLastmod: true, httpToHttps: true, maxRedirectHops: 1, variantsSameHost: true, sitemapSample: { ok: 20, total: 20 }, sortParamHandled: true };
const robots = "User-agent: *\nDisallow: /cos/\nSitemap: https://s.ro/sitemap.xml";
const sitemap = "<urlset><url><loc>https://s.ro/gantere/</loc><lastmod>2026-09-01</lastmod></url></urlset>";

function goodShop(): SeoInput {
  const home = page(`${O}/`, { title: "Magazin S - echipament fitness pentru acasa", h1: "Magazin S", meta: desc("home"), head: org, body: text("home") });
  const cat = page(`${O}/gantere/`, { title: "Gantere reglabile si fixe | Magazin S", h1: "Gantere reglabile", meta: desc("gantere"), head: crumbs, body: text("gantere") });
  const prod = page(`${O}/set-gantere-20kg/`, { title: "Set gantere reglabile 20 kg | Magazin S", h1: "Set gantere reglabile 20 kg", meta: desc("set"), head: productLd("Set gantere", 299, '{"shippingDetails":{"@type":"OfferShippingDetails"}}') + crumbs, body: `<span>299 lei</span><img src="/img/set.jpg" alt="Set gantere 20 kg"><img src="/img/linie.svg" alt="">${text("set")}` });
  return {
    origin: O, requested: [home, cat, prod], pages: [home, cat, prod], categories: [cat.url], products: [prod.url],
    robotsTxt: robots, sitemapXml: sitemap, listed: { categories: 12, products: 300, other: 4 },
    refusedServer: false, readWithBrowser: false, probes: goodProbes,
  };
}
const rowsOf = (input: SeoInput) => Object.fromEntries(computeSeoComponents(input).flatMap((c) => c.rows.map((r) => [r.id, r])));

describe("computeSeoComponents on a shop that does everything right", () => {
  it("reports every measured row fully ok", () => {
    const failing = Object.values(rowsOf(goodShop())).filter((r) => r.total > 0 && r.ok !== r.total).map((r) => r.id);
    expect(failing).toEqual([]);
  });
  it("gives the ten components in dependency order", () => {
    expect(computeSeoComponents(goodShop()).map((c) => c.id)).toEqual(["raspuns", "robots", "sitemap", "indexare", "html", "titlu", "descriere", "continut", "date_structurate", "ai"]);
  });
});

describe("computeSeoComponents finds each fault where it is", () => {
  it("A. reading: errors, blocked robots, missing sitemap, noindex, foreign canonical, content only in the browser", () => {
    const s = goodShop();
    const dead = page(`${O}/produs-vechi/`, { status: 404 });
    const limited = page(`${O}/altul/`, { status: 429 });
    s.requested = [...s.requested, dead, limited];
    s.robotsTxt = "User-agent: *\nDisallow: /gantere/\nUser-agent: OAI-SearchBot\nDisallow: /";
    s.sitemapXml = "";
    s.pages[1] = page(`${O}/gantere/`, { title: "Gantere reglabile si fixe | Magazin S", h1: "Gantere reglabile", meta: desc("g"), head: '<meta name="robots" content="noindex">', canonical: `${O}/alta-pagina/`, body: text("g") });
    const r = rowsOf(s);
    expect(r.pagini_200).toMatchObject({ ok: 3, total: 4 });
    expect(r.robots_pagini.ok).toBeLessThan(r.robots_pagini.total);
    expect(r.robots_sitemap).toMatchObject({ ok: 0, total: 1 });
    expect(r.sitemap_exista).toMatchObject({ ok: 0, total: 1 });
    expect(r.sitemap_lastmod.total).toBe(0);
    expect(r.fara_noindex).toMatchObject({ ok: 1, total: 2 });
    expect(r.canonical_propriu).toMatchObject({ ok: 1, total: 2 });
    expect(r.ai_roboti).toMatchObject({ ok: 2, total: 3 });
    expect(rowsOf({ ...goodShop(), readWithBrowser: true, refusedServer: true }).html_pret.total).toBe(0);
    expect(rowsOf({ ...goodShop(), refusedServer: true }).acces_server).toMatchObject({ ok: 0, total: 1, verify: true });
  });

  it("B. understanding: repeated or long titles, missing descriptions, no category text, images without alt, price mismatch", () => {
    const s = goodShop();
    const twin = page(`${O}/benzi/`, { title: "Gantere reglabile si fixe | Magazin S", h1: "Benzi de alergare", body: "<div>grid</div>" });
    s.pages = [...s.pages, twin];
    s.requested = [...s.requested, twin];
    s.categories = [...s.categories, twin.url];
    s.pages[2] = page(`${O}/set-gantere-20kg/`, { title: "Set gantere reglabile 20 kg | Magazin S - cel mai bun pret din Romania la echipamente", h1: "Set gantere reglabile 20 kg", meta: desc("set"), head: productLd("Set gantere", 299), body: `<span>349 lei</span><img src="/img/set.jpg" alt="">${text("set")}` });
    const r = rowsOf(s);
    expect(r.titlu_unic).toMatchObject({ ok: 2, total: 4 });
    expect(r.titlu_lungime).toMatchObject({ ok: 3, total: 4 });
    expect(r.titlu_nume).toMatchObject({ ok: 2, total: 3 });
    const tolerant = goodShop();
    tolerant.pages[2] = page(`${O}/el/`, { title: "Elevator de radacini drept 6760 | Magazin S", h1: "Elevator radacini fragmente drept" });
    tolerant.pages[1] = page(`${O}/fir/`, { title: "Silkam Black 4/0 lungime fir 75 cm | Magazin S", h1: "Fir sutura neresorbabil Silkam" });
    tolerant.products = [`${O}/el/`]; tolerant.categories = [`${O}/fir/`];
    expect(rowsOf(tolerant).titlu_nume).toMatchObject({ ok: 1, total: 2 });
    expect(r.descriere_exista).toMatchObject({ ok: 3, total: 4 });
    expect(r.text_categorii).toMatchObject({ ok: 1, total: 2 });
    expect(r.alt_imagini).toMatchObject({ ok: 0, total: 1 });
    expect(r.schema_pret_vizibil).toMatchObject({ ok: 0, total: 1 });
    expect(r.schema_traseu).toMatchObject({ ok: 1, total: 3 });
    expect(r.schema_livrare).toMatchObject({ ok: 0, total: 1 });
  });

  it("C. probes that could not run are not measured, never a fault", () => {
    const r = rowsOf({ ...goodShop(), probes: { sitemapLastmod: null, httpToHttps: null, maxRedirectHops: null, variantsSameHost: null, sitemapSample: { ok: 0, total: 0 }, sortParamHandled: null } });
    expect([r.redirect_scurt.total, r.www_unic.total, r.sitemap_valide.total, r.parametri.total]).toEqual([0, 0, 0, 0]);
  });
});

describe("componentScore", () => {
  it("is the share of ✓ rows: a row passes only when every page checked passes; unmeasured and unconfirmed rows are left out", () => {
    expect(componentScore({ id: "x", rows: [{ id: "a", ok: 45, total: 46 }, { id: "d", ok: 3, total: 3 }, { id: "b", ok: 0, total: 0 }, { id: "c", ok: 0, total: 1, verify: true }] })).toBe(50);
    expect(componentScore({ id: "x", rows: [{ id: "a", ok: 0, total: 0 }] })).toBeNull();
  });
  it("scores the SEO part as the share of ✓ over all judged rows, not the mean of the components", () => {
    expect(seoScore([{ id: "x", rows: [{ id: "a", ok: 1, total: 1 }] }, { id: "y", rows: [{ id: "b", ok: 1, total: 1 }, { id: "c", ok: 0, total: 1 }, { id: "d", ok: 0, total: 1 }] }])).toBe(50);
  });
});
