import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchText, fetchPage, fetchPSI } from "./net";

// Seam-ul de retea e mockabil: mock pe global.fetch, fara sa atingem reteaua reala.
function mockFetch(impl: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((u: string) => Promise.resolve(impl(u))));
}

afterEach(() => vi.unstubAllGlobals());

describe("net", () => {
  it("fetchText: 200 -> corp; non-200 sau throw -> ''", async () => {
    mockFetch(() => new Response("continut", { status: 200 }));
    expect(await fetchText("https://x.ro")).toBe("continut");

    mockFetch(() => new Response("", { status: 404 }));
    expect(await fetchText("https://x.ro")).toBe("");

    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("net"))));
    expect(await fetchText("https://x.ro")).toBe("");
  });

  it("fetchPage: normalizeaza headerele la lowercase si expune status/ok", async () => {
    mockFetch(() => new Response("<html>", { status: 200, headers: { "Content-Type": "text/html" } }));
    const p = await fetchPage("https://x.ro");
    expect(p).toMatchObject({ status: 200, ok: true, html: "<html>" });
    expect(p.headers["content-type"]).toContain("text/html");
  });

  it("fetchPage: throw de retea -> ok=false, html gol, status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("timeout"))));
    const p = await fetchPage("https://x.ro");
    expect(p).toMatchObject({ ok: false, html: "", status: 0 });
  });

  it("fetchPSI: extrage score (x100) + LCP/CLS/TBT din forma lighthouse", async () => {
    mockFetch(() => new Response(JSON.stringify({
      lighthouseResult: {
        categories: { performance: { score: 0.73 } },
        audits: {
          "largest-contentful-paint": { displayValue: "2.1 s" },
          "cumulative-layout-shift": { displayValue: "0.05" },
          "total-blocking-time": { displayValue: "120 ms" },
        },
      },
    }), { status: 200 }));
    const r = await fetchPSI("https://x.ro", "mobile");
    expect(r).toEqual({ score: 73, lcp: "2.1 s", cls: "0.05", tbt: "120 ms" });
  });

  it("fetchPSI: raspuns non-ok -> null", async () => {
    mockFetch(() => new Response("", { status: 500 }));
    expect(await fetchPSI("https://x.ro", "desktop")).toBeNull();
  });
});

describe("coada de interogari Google Ads", () => {
  it("nu lasa mai mult de 4 cereri deodata", async () => {
    const { googleAdsSearch } = await import("./net");
    let simultan = 0;
    let varf = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      simultan++;
      varf = Math.max(varf, simultan);
      await new Promise((r) => setTimeout(r, 15));
      simultan--;
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    }) as typeof fetch;
    try {
      await Promise.all(
        Array.from({ length: 12 }, () =>
          googleAdsSearch("123", "SELECT campaign.id FROM campaign", {
            accessToken: "t", developerToken: "d",
          })
        )
      );
    } finally {
      globalThis.fetch = original;
    }
    expect(varf).toBeLessThanOrEqual(4);
  });

  it("elibereaza locul si cand cererea esueaza — altfel coada se blocheaza definitiv", async () => {
    const { googleAdsSearch } = await import("./net");
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("nope", { status: 400 })) as typeof fetch;
    try {
      for (let i = 0; i < 6; i++) {
        await googleAdsSearch("123", "SELECT campaign.id FROM campaign", {
          accessToken: "t", developerToken: "d",
        }).catch(() => []);
      }
      // Daca locurile nu s-ar elibera, apelul de mai jos ar astepta la nesfarsit.
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ results: [] }), { status: 200 })) as typeof fetch;
      const r = await googleAdsSearch("123", "SELECT campaign.id FROM campaign", {
        accessToken: "t", developerToken: "d",
      });
      expect(r).toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });
});
