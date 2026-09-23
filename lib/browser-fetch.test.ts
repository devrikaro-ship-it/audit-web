import { describe, expect, it } from "vitest";
import { fetchPagesWithProbe, looksBlocked, PROBE_PAGES } from "./browser-fetch";

describe("looksBlocked", () => {
  it("is blocked when the homepage does not come back (spishop.ro from the server: 403)", () => {
    expect(looksBlocked(false, "")).toBe(true);
  });
  it("is blocked when the homepage is an anti-bot challenge", () => {
    expect(looksBlocked(true, "<title>Just a moment...</title>")).toBe(true);
  });
  it("is blocked when at least 30% of the pages were refused (invictusmedical.ro: 429s)", () => {
    expect(looksBlocked(true, "<html>shop</html>", [200, 200, 429, 429, 429, 200, 200, 200, 200, 200])).toBe(true);
  });
  it("is not blocked by a few dead pages", () => {
    expect(looksBlocked(true, "<html>shop</html>", [200, 200, 404, 404, 404, 200, 200, 200, 403, 200])).toBe(false);
  });
});


describe("fetchPagesWithProbe", () => {
  const urls = Array.from({ length: 20 }, (_, i) => `https://s.ro/p${i}`);
  const page = (url: string, status: number) => ({ url, status });

  it("switches the remaining pages to the browser as soon as the probe is refused", async () => {
    const directCalls: string[][] = [];
    const browserCalls: string[][] = [];
    const r = await fetchPagesWithProbe(urls,
      async (u) => { directCalls.push(u); return u.map((x) => page(x, 429)); },
      async () => async (u) => { browserCalls.push(u); return u.map((x) => page(x, 200)); });
    expect(directCalls).toEqual([urls.slice(0, PROBE_PAGES)]);
    expect(browserCalls[0]).toEqual(urls.slice(PROBE_PAGES));
    expect(r.pages.every((p) => p.status === 200)).toBe(true);
    expect(r.usedBrowser).toBe(true);
  });

  it("stays direct and never opens the browser when the shop answers", async () => {
    let opened = false;
    const r = await fetchPagesWithProbe(urls, async (u) => u.map((x) => page(x, 200)), async () => { opened = true; return null; });
    expect(opened).toBe(false);
    expect(r.pages).toHaveLength(20);
  });

  it("still retries refused pages through the browser when blocking starts after the probe", async () => {
    const r = await fetchPagesWithProbe(urls,
      async (u) => u.map((x) => page(x, u.length === PROBE_PAGES ? 200 : 429)),
      async () => async (u) => u.map((x) => page(x, 200)));
    expect(r.usedBrowser).toBe(true);
    expect(r.pages.filter((p) => p.status === 429)).toHaveLength(0);
  });
});
