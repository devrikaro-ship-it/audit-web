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
