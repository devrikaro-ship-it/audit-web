import { describe, expect, it } from "vitest";
import { ROUTE_TABLE, accessFor, href, matchRoute, type RouteId } from "./route-table";

describe("route table", () => {
  it("holds the 30 addresses of the app, each once", () => {
    const paths = Object.values(ROUTE_TABLE).map((r) => r.path);
    expect(paths).toHaveLength(30);
    expect(new Set(paths).size).toBe(30);
  });

  it("builds a link with its parameters encoded", () => {
    expect(href("siteReport", { id: "3f2a9c1e" })).toBe("/r/3f2a9c1e");
    expect(href("gadsPortal", { token: "a b/c" })).toBe("/google-ads/portal/a%20b%2Fc");
    expect(href("home")).toBe("/");
  });

  it("refuses a link with a missing parameter", () => {
    expect(() => href("siteReport")).toThrow("missing parameter [id]");
  });

  it("matches a concrete path, the static segment first", () => {
    const cases: [string, RouteId | null][] = [
      ["/r/3f2a9c1e", "siteReport"], ["/r/preview", "siteReportPreview"], ["/r/3f2a9c1e/pdf", "siteReportPdf"],
      ["/dashboard", "dashboardHome"], ["/dashboard/google-ads/reports/9", "dashboardGadsReport"], ["/", "home"],
      ["/nu-exista", null], ["/r", null],
    ];
    for (const [path, id] of cases) expect(matchRoute(path), path).toBe(id);
  });

  it("gives the dashboard pages agency access, except login and its submit", () => {
    expect(accessFor("/dashboard")).toBe("agency");
    expect(accessFor("/dashboard/logout")).toBe("agency");
    expect(accessFor("/dashboard/login")).toBe("public");
    expect(accessFor("/dashboard/login/submit")).toBe("public");
    expect(accessFor("/r/abc")).toBe("public");
    expect(accessFor("/nu-exista")).toBe("public");
  });
});
