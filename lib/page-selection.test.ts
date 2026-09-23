import { describe, expect, it } from "vitest";
import { classifyFetchedPage, classifySitemap, collectTypedUrls, PAGE_BUDGET, sampleEvenly, selectPages } from "./page-selection";

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
  ])("%s -> %s", (url, type) => expect(classifySitemap(url)).toBe(type));
});

describe("collectTypedUrls", () => {
  it("reads every product and category sitemap, even past the 5th child", async () => {
    const typed = await collectTypedUrls(index, fetchText);
    expect(typed.product).toHaveLength(201);
    expect(typed.category).toHaveLength(20);
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
