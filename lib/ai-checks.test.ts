import { describe, expect, it } from "vitest";
import { computeAiChecks, hasMixedContent, isNoindex, sameAsLinks } from "./audit-engine";
import type { PageData } from "./net";

const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const page = (url: string, html: string, headers: Record<string, string> = {}): PageData => ({ url, html, status: 200, headers, ok: true });
const check = (checks: ReturnType<typeof computeAiChecks>, id: string) => checks.find((c) => c.id === id)!;

// A real llms.txt starts with a markdown title; a shop without one often answers 200 with its HTML home or a stub.
const LLMS = "# Magazin\n\n> Magazin online de echipamente fitness.\n\n## Categorii\n- [Gantere](https://s.ro/gantere)\n- [Benzi](https://s.ro/benzi)\n";

describe("computeAiChecks", () => {
  it("accepts a markdown llms.txt and rejects an HTML page or a stub served at the same path", () => {
    expect(check(computeAiChecks("", LLMS, []), "llms_txt").correctCount).toBe(1);
    expect(check(computeAiChecks("", `<html>${LLMS}</html>`, []), "llms_txt").correctCount).toBe(0);
    expect(check(computeAiChecks("", "# x", []), "llms_txt").correctCount).toBe(0);
    expect(check(computeAiChecks("", "", []), "llms_txt").correctCount).toBe(0);
  });

  it("counts sameAs profiles in any page's JSON-LD, including inside @graph, capped at 2", () => {
    const org = page("https://s.ro/", ld({ "@graph": [{ "@type": "Organization", sameAs: ["https://facebook.com/s", "https://instagram.com/s", "https://tiktok.com/@s"] }] }));
    expect(check(computeAiChecks("", "", [org]), "entitate_ai").correctCount).toBe(2);
    const one = page("https://s.ro/c", ld({ "@type": "OnlineStore", sameAs: "https://facebook.com/s" }));
    expect(check(computeAiChecks("", "", [page("https://s.ro/", ""), one]), "entitate_ai").correctCount).toBe(1);
    expect(check(computeAiChecks("", "", [page("https://s.ro/", ld({ "@type": "Organization" }))]), "entitate_ai").correctCount).toBe(0);
  });
});

describe("sameAsLinks", () => {
  it("dedupes across pages and ignores non-URL values", () => {
    const a = page("https://s.ro/a", ld({ "@type": "Organization", sameAs: ["https://facebook.com/s", "facebook"] }));
    const b = page("https://s.ro/b", ld({ "@type": "Organization", sameAs: ["https://facebook.com/s"] }));
    expect([...sameAsLinks([a, b])]).toEqual(["https://facebook.com/s"]);
  });
});

describe("isNoindex", () => {
  it("reads the robots meta in either attribute order and the X-Robots-Tag header", () => {
    expect(isNoindex(page("https://s.ro/", '<meta name="robots" content="noindex, follow">'))).toBe(true);
    expect(isNoindex(page("https://s.ro/", '<meta content="noindex" name="robots">'))).toBe(true);
    expect(isNoindex(page("https://s.ro/", "", { "x-robots-tag": "noindex" }))).toBe(true);
    expect(isNoindex(page("https://s.ro/", '<meta name="robots" content="index, follow">'))).toBe(false);
  });
});

describe("hasMixedContent", () => {
  it("flags http resources on https pages, not plain links or http pages", () => {
    expect(hasMixedContent(page("https://s.ro/", '<img src="http://cdn.s.ro/a.jpg">'))).toBe(true);
    expect(hasMixedContent(page("https://s.ro/", '<link rel="stylesheet" href="http://cdn.s.ro/a.css">'))).toBe(true);
    expect(hasMixedContent(page("https://s.ro/", '<a href="http://other.ro">x</a>'))).toBe(false);
    expect(hasMixedContent(page("http://s.ro/", '<img src="http://cdn.s.ro/a.jpg">'))).toBe(false);
  });
});
