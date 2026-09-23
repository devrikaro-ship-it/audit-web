import { describe, expect, it } from "vitest";
import { classifyFetchedPage, classifySitemap, collectTypedUrls, mapWithConcurrency, PAGE_BUDGET, replacementsFor, sampleEvenly, selectPages } from "./page-selection";
import { PROFILES, profileFor } from "./platform-knowledge";

const O = "https://shop.example";
const urlset = (paths: string[]) => `<urlset>${paths.map((p) => `<url><loc>${O}/${p}/</loc></url>`).join("")}</urlset>`;
const range = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

// Shaped like magazinfitness.ro on 2026-09-23: blog first, one-segment product URLs, categories as the 6th child.
const children: Record<string, string> = {
  [`${O}/post-sitemap.xml`]: urlset(range(63, "blog-post")),
  [`${O}/page-sitemap.xml`]: urlset(range(8, "page")),
  [`${O}/product-sitemap1.xml`]: urlset(range(100, "product-a")),
  [`${O}/product-sitemap2.xml`]: urlset(range(101, "product-b")),
  [`${O}/brand-sitemap.xml`]: urlset(range(5, "brand")),
  [`${O}/product_cat-sitemap.xml`]: urlset(range(20, "category")),
};
const index = `<sitemapindex>${Object.keys(children).map((u) => `<sitemap><loc>${u}</loc></sitemap>`).join("")}</sitemapindex>`;
const fetchText = async (u: string) => children[u] ?? "";

describe("classifySitemap", () => {
  it.each([
    ["https://s.ro/product-sitemap.xml", "product"],
    ["https://s.ro/product-sitemap2.xml", "product"],
    ["https://s.ro/wp-sitemap-posts-product-1.xml", "product"],
    ["https://s.com/sitemap_products_1.xml?from=1&to=99", "product"],
    ["https://s.ro/product_cat-sitemap.xml", "category"],
    ["https://s.ro/wp-sitemap-taxonomies-product_cat-1.xml", "category"],
    ["https://s.com/sitemap_collections_1.xml", "category"],
    ["https://s.ro/product_tag-sitemap.xml", "other"],
    ["https://s.ro/brand-sitemap.xml", "other"],
    ["https://s.ro/post-sitemap.xml", "other"],
    ["https://s.com/sitemap_blogs_1.xml", "other"],
    ["https://s.ro/sitemap?show_xml=true&w=products", "product"],
    ["https://s.ro/sitemap?show_xml=true&w=categories", "category"],
    ["https://s.ro/sitemap?show_xml=true&w=manufacturers", "other"],
    ["https://products-shop.ro/page-sitemap.xml", "other"],
  ])("%s -> %s", (url, type) => expect(classifySitemap(url)).toBe(type));
});

describe("collectTypedUrls", () => {
  it("reads every product and category sitemap, even past the 5th child", async () => {
    const typed = await collectTypedUrls(index, fetchText);
    expect(typed.product).toHaveLength(201);
    expect(typed.category).toHaveLength(20);
  });
});

describe("collectTypedUrls with escaped child URLs", () => {
  it("fetches Shopify child sitemaps with a decoded query string", async () => {
    const shop = "https://s.com";
    const child = `${shop}/sitemap_collections_1.xml?from=1&to=9`;
    const xml = `<sitemapindex><sitemap><loc>${shop}/sitemap_collections_1.xml?from=1&amp;to=9</loc></sitemap></sitemapindex>`;
    const typed = await collectTypedUrls(xml, async (u) => (u === child ? urlset(["collections/a", "collections/b"]) : ""));
    expect(typed.category).toHaveLength(2);
  });
});

describe("selectPages", () => {
  it("fills the budget with the pages that sell, not the blog listed first", async () => {
    const { urls, planned } = selectPages(`${O}/`, await collectTypedUrls(index, fetchText));
    const count = (t: string) => [...planned.values()].filter((v) => v === t).length;
    expect(urls).toHaveLength(PAGE_BUDGET);
    expect(urls[0]).toBe(O);
    expect(count("category")).toBe(15);
    expect(count("product")).toBeGreaterThanOrEqual(30);
    expect(count("other")).toBeLessThanOrEqual(5);
  });
});

describe("sampleEvenly", () => {
  it("spreads picks across the whole list", () => {
    const picks = sampleEvenly(range(201, "p"), 35);
    expect(picks).toHaveLength(35);
    expect(Number(picks[34].split("-")[1])).toBeGreaterThan(170);
  });
});

describe("classifyFetchedPage", () => {
  const grid = `<div>${Array.from({ length: 8 }, () => `<span>199,00 lei</span><a class="add_to_cart_button">Adauga in cos</a>`).join("")}</div>`;
  it("keeps a category grid a category, even with Product markup for its items", () =>
    expect(classifyFetchedPage(`<script type="application/ld+json">{"@type":"Product"}</script>${grid}`, "category")).toBe("category"));
  it("recognises a product by og:type", () => expect(classifyFetchedPage(`<meta property="og:type" content="product">`, "other")).toBe("product"));
  it("does not count a blog post as a product", () => expect(classifyFetchedPage("<article><p>Cum alegi o banda de alergare</p></article>", "product")).toBe("other"));
  it("recognises an unplanned product grid as a category", () => expect(classifyFetchedPage(grid, "other")).toBe("category"));
});

describe("platform reading profiles", () => {
  const P = (name: string) => profileFor(name as Parameters<typeof profileFor>[0]);

  it.each([
    ["MerchantPro", "https://m.ro/sitemap_shop.xml", "mixed"],
    ["MerchantPro", "https://m.ro/sitemap_products.xml", "product"],
    ["MerchantPro", "https://m.ro/sitemap_images.xml", "skip"],
    ["Shopify", "https://s.com/sitemap_agentic_discovery.xml", "skip"],
    ["Shopify", "https://s.com/sitemap_collections_1.xml?from=1&to=9", "category"],
    ["PrestaShop", "https://p.ro/sitemaps/product-ro-sitemap.xml", "product"],
    ["PrestaShop", "https://p.ro/sitemaps/other-ro-sitemap.xml", "other"],
    ["WooCommerce", "https://w.ro/product_tag-sitemap.xml", "skip"],
    ["WooCommerce", "https://w.ro/product_cat-sitemap.xml", "category"],
    ["GoMag", "https://g.ro/sitemap_categories.xml", "category"],
  ])("%s: %s is read as %s", (platform, url, kind) => expect(classifySitemap(url, P(platform))).toBe(kind));

  it("MerchantPro: types the mixed shop sitemap by path and drops filter pages", async () => {
    const shop = "https://m.ro";
    const index = `<sitemapindex><sitemap><loc>${shop}/sitemap_shop.xml</loc></sitemap></sitemapindex>`;
    const child = `<urlset>${["/catalog/implanturi-41", "/catalog/implanturi-41/filtru-diametru-4-mm-7", "/contact"].map((p) => `<url><loc>${shop}${p}</loc></url>`).join("")}</urlset>`;
    const typed = await collectTypedUrls(index, async () => child, "", { profile: P("MerchantPro") });
    expect(typed.category).toEqual([`${shop}/catalog/implanturi-41`]);
    expect(typed.other).toEqual([`${shop}/contact`]);
    expect(typed.product).toEqual([]);
  });

  it("PrestaShop: reads only the sitemaps of the site language", async () => {
    const p = "https://p.ro";
    const index = `<sitemapindex>${["product-ro", "product-en", "product-hu"].map((n) => `<sitemap><loc>${p}/sitemaps/${n}-sitemap.xml</loc></sitemap>`).join("")}</sitemapindex>`;
    const read: string[] = [];
    await collectTypedUrls(index, async (u) => (read.push(u), ""), "", { profile: P("PrestaShop"), language: "ro" });
    expect(read).toEqual([`${p}/sitemaps/product-ro-sitemap.xml`]);
  });

  it("OpenCart: types a flat route sitemap by route and drops information pages", async () => {
    const o = "https://o.ro";
    const flat = `<urlset>${["route=product/product&amp;product_id=5", "route=product/category&amp;path=3", "route=information/information&amp;information_id=4"].map((q) => `<url><loc>${o}/index.php?${q}</loc></url>`).join("")}</urlset>`;
    const typed = await collectTypedUrls(flat, async () => "", `${o}/sitemap.xml`, { profile: P("OpenCart") });
    expect(typed.product).toEqual([`${o}/index.php?route=product/product&product_id=5`]);
    expect(typed.category).toEqual([`${o}/index.php?route=product/category&path=3`]);
    expect(typed.other).toEqual([]);
  });

  it("every profile is complete and paces requests between 1 and 8", () => {
    for (const p of PROFILES) {
      expect(p.concurrency).toBeGreaterThanOrEqual(1);
      expect(p.concurrency).toBeLessThanOrEqual(8);
      for (const k of ["skip", "category", "mixed", "other", "product"] as const) expect(Array.isArray(p.sitemapSignals[k])).toBe(true);
    }
    for (const name of ["WooCommerce", "Shopify", "MerchantPro", "GoMag", "PrestaShop", "OpenCart", "Magento"]) expect(P(name).platform).toBe(name);
    expect(P("Wix").platform).toBe("generic");
  });
});

describe("replacementsFor", () => {
  it("replaces dead pages with untried URLs of the same type", () => {
    const typed = { product: ["https://s/p1", "https://s/p2"], category: ["https://s/c1", "https://s/c2", "https://s/c3"], other: [] };
    const r = replacementsFor(["category", "category"], typed, new Set(["https://s/c1"]));
    expect(r.urls).toEqual(["https://s/c2", "https://s/c3"]);
    expect([...r.planned.values()]).toEqual(["category", "category"]);
  });
});

describe("mapWithConcurrency", () => {
  it("never runs more than the limit at once", async () => {
    let running = 0, peak = 0;
    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 2, async () => {
      running++; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 2));
      running--;
    });
    expect(peak).toBe(2);
  });

  it("starts nothing after the deadline, so a rate-limiting site cannot stretch the audit", async () => {
    const started: number[] = [];
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 1, async (i) => {
      started.push(i);
      await new Promise((r) => setTimeout(r, 25));
      return i;
    }, Date.now() + 60);
    expect(started.length).toBeLessThan(6);
    expect(out.filter((x) => x === undefined).length).toBe(6 - started.length);
  });
});
