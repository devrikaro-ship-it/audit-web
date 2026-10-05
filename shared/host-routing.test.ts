import { describe, expect, it } from "vitest";
import { routeForHost } from "./host-routing";
import { ROUTE_TABLE } from "./route-table";

const env = { SITE_AUDIT_ORIGIN: "https://audit.devrika.ro", PUBLIC_URL: "https://audit.devrika.io" };

describe("routeForHost", () => {
  it("serves the Romanian three-audit page at the .ro home page", () => {
    expect(routeForHost("audit.devrika.ro", "/", "", env)).toEqual({ kind: "rewrite", path: "/audituri" });
  });
  it("keeps the funnel, reports and their APIs on .ro", () => {
    for (const p of ["/audituri", "/audit-seo", "/dashboard", "/dashboard/google-ads/reports/x", "/dashboard/login", "/start", "/processing/abc", "/r/abc", "/r/abc/pdf", "/api/scan", "/api/audit", "/audit", "/fonts/shadeerah-soft.ttf", "/_next/static/x.js"]) {
      expect(routeForHost("audit.devrika.ro", p, "", env)).toEqual({ kind: "next" });
    }
  });
  it("sends every other .ro path to the main origin with its path and query", () => {
    expect(routeForHost("audit.devrika.ro", "/confidentialitate", "?x=1", env)).toEqual({ kind: "redirect", location: "https://audit.devrika.io/confidentialitate?x=1" });
    expect(routeForHost("audit.devrika.ro", "/api/google-ads/callback", "?code=c", env)).toEqual({ kind: "redirect", location: "https://audit.devrika.io/api/google-ads/callback?code=c" });
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

// Today's list, copied from lib/host-routing.ts at af360b9: the oracle the table-driven routing must match on every
// address of the app and every asset.
const LEGACY = [/^\/audituri(\/|$)/, /^\/audit-seo(\/|$)/, /^\/audit(\/|$)/, /^\/start(\/|$)/, /^\/processing\//, /^\/r\//,
  /^\/api\/scan(\/|$)/, /^\/api\/audit(\/|$)/, /^\/dashboard(\/|$)/,
  /^\/_next\//, /^\/fonts\//, /^\/devrika-logo\.svg$/, /^\/logo-devrika\.png$/, /^\/favicon\.ico$/];
function legacy(host: string, path: string, search: string) {
  if (host !== "audit.devrika.ro") return { kind: "next" };
  if (path === "/") return { kind: "rewrite", path: "/audituri" };
  if (LEGACY.some((re) => re.test(path))) return { kind: "next" };
  return { kind: "redirect", location: `https://audit.devrika.io${path}${search}` };
}

describe("host routing from the route table", () => {
  const concrete = Object.values(ROUTE_TABLE).map((r) => r.path.replace(/\[[^\]]+\]/g, "x1"));
  const assets = ["/_next/static/a.js", "/fonts/sora.woff2", "/devrika-logo.svg", "/logo-devrika.png", "/favicon.ico"];
  it("decides every address and asset exactly as before, on both hosts", () => {
    for (const host of ["audit.devrika.ro", "audit.devrika.io"]) {
      for (const path of [...concrete, ...assets]) {
        expect(routeForHost(host, path, "?a=1", env), `${host}${path}`).toEqual(legacy(host, path, "?a=1"));
      }
    }
  });
});
