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

// ── A lead site (spec 2026-09-25 §3) ──
const C = "https://clinica.ro";
const clinicLd = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Dentist", name: "Clinica", telephone: "+40 721 000 111", address: { "@type": "PostalAddress", streetAddress: "Str. Florilor 3" }, openingHours: "Mo-Fr 08:00-20:00", aggregateRating: { "@type": "AggregateRating", ratingValue: 4.9, reviewCount: 80 }, sameAs: ["https://facebook.com/c", "https://instagram.com/c"] })}</script>`;
const contact = '<a href="tel:+40721000111">0721 000 111</a> <p>Str. Florilor 3, Bucuresti</p>';
const own = (x: string) => `<p>${`Despre ${x}: explicam pe larg cum decurge fiecare etapa si ce trebuie sa stie pacientul inainte. `.repeat(3)}</p>`;
const vitan = "<p>Clinica din Vitan are parcare proprie in curte si intrare separata pentru pacientii cu scaun cu rotile. Ajungi cu autobuzul 102 pana la statia Mall Vitan, apoi mergi doua minute pe jos. Programul de sambata e mai lung decat in celelalte clinici ale noastre.</p>";
const unirii = "<p>La Unirii suntem la etajul doi, deasupra farmaciei, cu lift din holul cladirii. Metroul Piata Unirii e la trei minute, iesirea spre Bulevardul Corneliu Coposu. Aici lucreaza medicul specializat in tomografii pentru implanturi si chirurgie.</p>";
function goodClinic(): SeoInput {
  const home = page(`${C}/`, { title: "Clinica - radiologie dentara in Bucuresti", h1: "Clinica", meta: desc("clinica"), head: clinicLd, body: contact + own("clinica") });
  const svc = page(`${C}/radiografie-panoramica/`, { title: "Radiografie panoramica | Clinica", h1: "Radiografie panoramica", meta: desc("panoramica"), head: crumbs, body: contact + own("radiografia panoramica") });
  const loc1 = page(`${C}/clinica-vitan/`, { title: "Clinica Vitan - radiologie dentara", h1: "Clinica Vitan", meta: desc("vitan"), head: crumbs, body: contact + vitan });
  const loc2 = page(`${C}/clinica-unirii/`, { title: "Clinica Unirii - radiologie dentara", h1: "Clinica Unirii", meta: desc("unirii"), head: crumbs, body: contact + unirii });
  const all = [home, svc, loc1, loc2];
  return {
    origin: C, requested: all, pages: all, categories: [], products: [], robotsTxt: "User-agent: *\nSitemap: https://clinica.ro/sitemap.xml", sitemapXml: sitemap,
    listed: { categories: 0, products: 0, other: 4 }, refusedServer: false, readWithBrowser: false, probes: { ...goodProbes, sortParamHandled: null },
    kind: "leads", services: [svc.url], locations: [loc1.url, loc2.url], inSitemap: () => true,
  };
}

describe("computeSeoComponents on a lead site", () => {
  it("a clinic that does everything right has every measured row ok, with the lead rows in place of the shop rows", () => {
    const r = rowsOf(goodClinic());
    expect(Object.values(r).filter((x) => x.total > 0 && x.ok !== x.total).map((x) => x.id)).toEqual([]);
    for (const id of ["sitemap_servicii", "html_serviciu", "html_contact", "html_descriere_serviciu", "text_servicii", "locatii_diferite", "schema_afacere_locala", "schema_program", "contact_consecvent", "schema_rating", "schema_traseu"]) expect(r[id]?.total, id).toBeGreaterThan(0);
    for (const id of ["sitemap_tipuri", "parametri", "html_nume", "html_pret", "text_categorii", "alt_imagini", "schema_produs", "schema_livrare"]) expect(r[id], id).toBeUndefined();
  });

  it("finds each lead fault where it is", () => {
    const s = goodClinic();
    const [home, svc, loc1] = s.pages;
    // A location page that only swaps the district name, a thin service page without phone or address, a page
    // missing from the sitemap, no local business data.
    const copy = page(`${C}/clinica-berceni/`, { title: "Clinica Berceni - radiologie dentara", h1: "Clinica Berceni", meta: desc("berceni"), head: crumbs, body: contact + vitan.replace(/Vitan/g, "Berceni") });
    const thin = page(`${C}/scanare/`, { title: "Scanare | Clinica", h1: "Scanare intraorala", meta: desc("scanare"), head: crumbs, body: "<p>Str. Florilor 3, Bucuresti</p><p>Scanare.</p>" });
    s.pages = [page(`${C}/`, { title: "Clinica - radiologie dentara", h1: "Clinica", meta: desc("c"), body: contact + own("clinica") }), svc, loc1, copy, thin];
    s.requested = s.pages;
    s.services = [svc.url, thin.url];
    s.locations = [loc1.url, copy.url];
    s.inSitemap = (u) => u !== thin.url;
    const r = rowsOf(s);
    expect(r.locatii_diferite).toMatchObject({ ok: 0, total: 2 });
    expect(r.text_servicii).toMatchObject({ ok: 1, total: 2 });
    expect(r.html_descriere_serviciu).toMatchObject({ ok: 1, total: 2 });
    expect(r.html_contact).toMatchObject({ ok: 3, total: 4 });
    expect(r.contact_consecvent).toMatchObject({ ok: 4, total: 5 });
    expect(r.sitemap_servicii).toMatchObject({ ok: 3, total: 4 });
    expect(r.schema_afacere_locala).toMatchObject({ ok: 0, total: 1 });
    expect(r.schema_program).toMatchObject({ ok: 0, total: 1 });
    expect(r.schema_rating).toMatchObject({ ok: 0, total: 1 });
    void home;
  });

  it("reads the real shapes seen on production: a short phone, a street without its dot, an http sitemap address", () => {
    const s = goodClinic();
    // dentalview.ro calls on "021 9878" (7 digits); piontaniservices.ro writes "Str Papiu Ilarian nr 17".
    const short = '<a href="tel:021 9878">021 9878</a> <p>Str Papiu Ilarian nr 17, Sector 3</p>';
    s.pages = s.pages.map((p) => ({ ...p, html: p.html.replace(contact, short) }));
    s.requested = s.pages;
    const r = rowsOf(s);
    expect(r.html_contact).toMatchObject({ ok: 3, total: 3 });
    expect(r.contact_consecvent).toMatchObject({ ok: 4, total: 4 });
    // The sitemap lists http://, the page ends on https:// and declares that: its own address.
    const svc = s.pages[1];
    s.pages[1] = { ...svc, url: svc.url.replace("https://", "http://"), finalUrl: svc.url };
    s.services = [s.pages[1].url];
    expect(rowsOf(s).canonical_propriu).toMatchObject({ ok: 3, total: 3 });
    // Served on http:// with no redirect, declaring its https:// address: still its own, but the site is not all
    // on the secure connection.
    s.pages[1] = { ...svc, url: svc.url.replace("https://", "http://") };
    s.services = [s.pages[1].url];
    s.requested = s.pages;
    expect(rowsOf(s).canonical_propriu).toMatchObject({ ok: 3, total: 3 });
    expect(rowsOf(s).https).toMatchObject({ ok: 0, total: 1 });
    // An https page declaring an http address points elsewhere.
    s.pages[1] = { ...svc, html: svc.html.replace(`href="${svc.url}"`, `href="${svc.url.replace("https://", "http://")}"`) };
    s.services = [svc.url];
    expect(rowsOf(s).canonical_propriu).toMatchObject({ ok: 2, total: 3 });
  });

  it("without a sitemap the listing row is not measured, never more found than checked", () => {
    expect(rowsOf({ ...goodClinic(), sitemapXml: "" }).sitemap_servicii).toMatchObject({ ok: 0, total: 0 });
  });
});

