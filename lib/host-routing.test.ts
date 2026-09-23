import { describe, expect, it } from "vitest";
import { routeForHost } from "./host-routing";

const env = { SITE_AUDIT_ORIGIN: "https://audit.devrika.ro", PUBLIC_URL: "https://audit.devrika.io" };

describe("routeForHost", () => {
  it("serves the Romanian three-audit page at the .ro home page", () => {
    expect(routeForHost("audit.devrika.ro", "/", "", env)).toEqual({ kind: "rewrite", path: "/audituri" });
  });
  it("keeps the funnel, reports and their APIs on .ro", () => {
    for (const p of ["/audituri", "/audit-seo", "/start", "/processing/abc", "/r/abc", "/r/abc/pdf", "/api/scan", "/api/audit", "/audit", "/fonts/shadeerah-soft.ttf", "/_next/static/x.js"]) {
      expect(routeForHost("audit.devrika.ro", p, "", env)).toEqual({ kind: "next" });
    }
  });
  it("sends every other .ro path to the main origin with its path and query", () => {
    expect(routeForHost("audit.devrika.ro", "/confidentialitate", "?x=1", env)).toEqual({ kind: "redirect", location: "https://audit.devrika.io/confidentialitate?x=1" });
    expect(routeForHost("audit.devrika.ro", "/api/google-ads/callback", "?code=c", env)).toEqual({ kind: "redirect", location: "https://audit.devrika.io/api/google-ads/callback?code=c" });
    expect(routeForHost("audit.devrika.ro", "/dashboard", "", env).kind).toBe("redirect");
  });
  it("leaves the main origin untouched", () => {
    expect(routeForHost("audit.devrika.io", "/", "", env)).toEqual({ kind: "next" });
    expect(routeForHost("audit.devrika.io", "/google-ads", "", env)).toEqual({ kind: "next" });
  });
  it("does nothing when SITE_AUDIT_ORIGIN is not set", () => {
    expect(routeForHost("audit.devrika.ro", "/", "", { PUBLIC_URL: env.PUBLIC_URL })).toEqual({ kind: "next" });
  });
  it("reads the first host of a forwarded list, case-insensitively", () => {
    expect(routeForHost("Audit.Devrika.RO, proxy", "/", "", env).kind).toBe("rewrite");
  });
});
