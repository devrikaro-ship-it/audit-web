import { describe, expect, it } from "vitest";
import { runSeoProbes } from "./seo-probes";

type Answer = { status: number; location?: string; html?: string };
const fake = (routes: Record<string, Answer>) => async (url: string) => {
  const a = routes[url] ?? { status: 404 };
  return { status: a.status, location: a.location ?? null, html: a.html ?? "", headers: {} };
};

describe("runSeoProbes", () => {
  it("counts every redirect hop, keeps the shop's limits out of the sitemap sample, reads the sort parameter's canonical", async () => {
    const f = fake({
      "https://s.ro/": { status: 200 },
      "http://s.ro/": { status: 301, location: "https://s.ro/" },
      "http://www.s.ro/": { status: 301, location: "http://s.ro/" },
      "https://www.s.ro/": { status: 301, location: "https://s.ro/" },
      "https://s.ro/gantere/": { status: 200 },
      "https://s.ro/vechi/": { status: 301, location: "https://s.ro/nou/" },
      "https://s.ro/limitat/": { status: 429 },
      "https://s.ro/gantere/?sort=price": { status: 200, html: '<link rel="canonical" href="https://s.ro/gantere/">' },
    });
    const p = await runSeoProbes("https://s.ro", ["https://s.ro/gantere/", "https://s.ro/vechi/", "https://s.ro/limitat/"], "https://s.ro/gantere/", "", f);
    expect(p).toEqual({ sitemapLastmod: null, httpToHttps: true, maxRedirectHops: 2, variantsSameHost: true, sitemapSample: { ok: 1, total: 2 }, sortParamHandled: true });
  });

  it("finds a www variant that stays a separate site and a sort parameter that makes a new page", async () => {
    const f = fake({
      "https://s.ro/": { status: 200 },
      "http://s.ro/": { status: 200 },
      "https://www.s.ro/": { status: 200 },
      "https://s.ro/gantere/?sort=price": { status: 200, html: '<link rel="canonical" href="https://s.ro/gantere/?sort=price">' },
    });
    const p = await runSeoProbes("https://s.ro", [], "https://s.ro/gantere/", "", f);
    expect(p).toMatchObject({ httpToHttps: false, variantsSameHost: false, sortParamHandled: false, sitemapSample: { ok: 0, total: 0 } });
  });

  it("follows the redirect a category without its trailing slash makes before judging the sort parameter", async () => {
    const f = fake({
      "https://s.ro/": { status: 200 },
      "https://s.ro/gantere?sort=price": { status: 301, location: "https://s.ro/gantere/?sort=price" },
      "https://s.ro/gantere/?sort=price": { status: 200, html: '<link rel="canonical" href="https://s.ro/gantere/">' },
    });
    expect((await runSeoProbes("https://s.ro", [], "https://s.ro/gantere", "", f)).sortParamHandled).toBe(true);
  });

  it("reads the last-modified dates of a sitemap index from its biggest child, not a one-page first child", async () => {
    const index = "<sitemapindex><sitemap><loc>https://s.ro/sitemap_agentic.xml</loc></sitemap><sitemap><loc>https://s.ro/sitemap_products_1.xml?from=1&amp;to=9</loc></sitemap></sitemapindex>";
    const f = fake({
      "https://s.ro/": { status: 200 },
      "https://s.ro/sitemap_agentic.xml": { status: 200, html: "<urlset><url><loc>https://s.ro/agents.md</loc></url></urlset>" },
      "https://s.ro/sitemap_products_1.xml?from=1&to=9": { status: 200, html: "<urlset><url><loc>a</loc><lastmod>2026-09-01</lastmod></url><url><loc>b</loc><lastmod>2026-09-01</lastmod></url></urlset>" },
    });
    expect((await runSeoProbes("https://s.ro", [], null, index, f)).sitemapLastmod).toBe(true);
    expect((await runSeoProbes("https://s.ro", [], null, "<urlset><url><loc>x</loc></url></urlset>", f)).sitemapLastmod).toBe(false);
  });
});

