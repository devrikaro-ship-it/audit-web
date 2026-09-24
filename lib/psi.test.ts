import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPSI } from "./net";
import { computeVitezaChecks } from "./audit-engine";

const answer = (body: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
afterEach(() => vi.unstubAllGlobals());

describe("a speed test that did not measure is not a score of 0", () => {
  it("returns no result when PageSpeed answers without a performance score", async () => {
    answer({ lighthouseResult: { audits: { "cumulative-layout-shift": { displayValue: "0" } } } });
    expect(await fetchPSI("https://s.ro", "mobile")).toBeNull();
  });

  it("marks a missing timing as unavailable, never as a dash", async () => {
    answer({ lighthouseResult: { categories: { performance: { score: 0.77 } }, audits: {} } });
    expect(await fetchPSI("https://s.ro", "mobile")).toMatchObject({ score: 77, lcp: "Date indisponibile", tbt: "Date indisponibile" });
  });

  it("when only one side was measured, the other is unavailable, not 0 / 100", () => {
    const r = computeVitezaChecks(null, { score: 97, lcp: "1.1 s", cls: "0", tbt: "0 ms" }, 120);
    expect(r.pagespeed_mobile.value).toMatch(/indisponibil/);
    expect(r.lcp.value).toMatch(/indisponibil/);
    expect(r.pagespeed_desktop.value).toBe("97 / 100");
  });
});
