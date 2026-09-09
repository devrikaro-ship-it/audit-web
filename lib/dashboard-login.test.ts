import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let directory: string;
beforeEach(async () => {
  vi.resetModules();
  directory = await mkdtemp(path.join(os.tmpdir(), "dashboard-login-"));
  vi.stubEnv("DASH_SESSIONS_DIR", directory);
  vi.stubEnv("DASH_USER", "manager");
  vi.stubEnv("DASH_PASS", "test-only:password");
});
afterEach(async () => { vi.unstubAllEnvs(); vi.useRealTimers(); await rm(directory, { recursive: true, force: true }); });

const origin = "https://dashboard.example.test";
const request = (route: string, body = "", headers: Record<string, string> = {}) => new NextRequest(origin + route, {
  method: body ? "POST" : "GET", headers: { origin, "content-type": "application/x-www-form-urlencoded", ...headers }, body: body || undefined,
});

it("redirects anonymous navigation to login and accepts a valid session until logout revokes replay", async () => {
  const { proxy } = await import("../proxy");
  const { POST: login } = await import("../app/dashboard/login/submit/route");
  const { POST: logout } = await import("../app/dashboard/logout/route");
  const anonymous = await proxy(request("/dashboard/google-ads?view=latest"));
  expect(anonymous.status).toBe(307);
  expect(anonymous.headers.get("location")).toBe(origin + "/dashboard/login?next=%2Fdashboard%2Fgoogle-ads%3Fview%3Dlatest");
  expect(anonymous.headers.has("www-authenticate")).toBe(false);
  const loggedIn = await login(request("/dashboard/login/submit", "username=manager&password=test-only%3Apassword&next=%2Fdashboard%2Fgoogle-ads"));
  expect(loggedIn.status).toBe(303);
  expect(loggedIn.headers.get("location")).toBe(origin + "/dashboard/google-ads");
  const cookie = loggedIn.headers.get("set-cookie")!;
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/SameSite=Strict/i);
  expect(cookie).not.toContain("password");
  const cookieHeader = cookie.split(";")[0];
  expect((await proxy(request("/dashboard/google-ads", "", { cookie: cookieHeader }))).headers.get("x-middleware-next")).toBe("1");
  const loggedOut = await logout(request("/dashboard/logout", "logout=1", { cookie: cookieHeader }));
  expect(loggedOut.status).toBe(303);
  expect(loggedOut.headers.get("set-cookie")).toContain("Max-Age=0");
  expect((await proxy(request("/dashboard/google-ads", "", { cookie: cookieHeader }))).status).toBe(307);
});

it("refuses bad credentials and cross-site forms without granting a cookie, and confines return paths", async () => {
  const { POST } = await import("../app/dashboard/login/submit/route");
  const good = "username=manager&password=test-only%3Apassword";
  const bad = await POST(request("/dashboard/login/submit", "username=manager&password=wrong"));
  expect(bad.status).toBe(303);
  expect(bad.headers.get("location")).toContain("error=invalid");
  expect(bad.headers.has("set-cookie")).toBe(false);
  const crossSite = await POST(request("/dashboard/login/submit", good, { origin: "https://attacker.example" }));
  expect(crossSite.status).toBe(403);
  expect(crossSite.headers.has("set-cookie")).toBe(false);
  const huge = await POST(request("/dashboard/login/submit", good + "&extra=" + "x".repeat(5000)));
  expect(huge.status).toBe(413);
  for (const next of ["https://attacker.example", "//attacker.example", "/dashboard/../google-ads", "/dashboard/login", "/dashboard/logout", "/dashboard\\evil"]) {
    const response = await POST(request("/dashboard/login/submit", good + "&next=" + encodeURIComponent(next)));
    expect(response.headers.get("location")).toBe(origin + "/dashboard/google-ads");
  }
});

it("rejects forged and expired sessions, credential changes, and unavailable production configuration", async () => {
  const { createDashboardSession, dashboardSessionOk, DASHBOARD_MAX_AGE } = await import("./dashboard-session");
  const token = await createDashboardSession();
  expect(await dashboardSessionOk(token)).toBe(true);
  expect(await dashboardSessionOk("f".repeat(64))).toBe(false);
  expect(await dashboardSessionOk("../../anything")).toBe(false);
  vi.stubEnv("DASH_PASS", "changed-test-password");
  expect(await dashboardSessionOk(token)).toBe(false);
  vi.stubEnv("DASH_PASS", "test-only:password");
  expect(await dashboardSessionOk(token)).toBe(true);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + (DASHBOARD_MAX_AGE + 1) * 1000);
  expect(await dashboardSessionOk(token)).toBe(false);
  vi.restoreAllMocks();
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DASH_USER", ""); vi.stubEnv("DASH_PASS", "");
  const { proxy } = await import("../proxy");
  expect((await proxy(request("/dashboard/google-ads"))).status).toBe(503);
});

it("bounds repeated login attempts while allowing the first valid login", async () => {
  const { POST } = await import("../app/dashboard/login/submit/route");
  expect((await POST(request("/dashboard/login/submit", "username=manager&password=test-only%3Apassword"))).status).toBe(303);
  let response;
  for (let attempt = 0; attempt < 25; attempt++) response = await POST(request("/dashboard/login/submit", "username=manager&password=wrong"));
  expect(response!.status).toBe(429);
  expect(response!.headers.has("set-cookie")).toBe(false);
});

it("uses the configured public origin behind the production proxy and refuses spoofed origins", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PUBLIC_URL", origin);
  const { proxy } = await import("../proxy");
  const { POST: login } = await import("../app/dashboard/login/submit/route");
  const { POST: logout } = await import("../app/dashboard/logout/route");
  const backend = (route: string, body?: string, cookie?: string) => new NextRequest("http://localhost:3000" + route, { method: body ? "POST" : "GET", body, headers: { origin, "content-type": "application/x-www-form-urlencoded", "x-forwarded-host": "attacker.example", ...(cookie ? { cookie } : {}) } });
  const anonymous = await proxy(backend("/dashboard/google-ads"));
  expect(anonymous.headers.get("location")).toBe(origin + "/dashboard/login?next=%2Fdashboard%2Fgoogle-ads");
  const response = await login(backend("/dashboard/login/submit", "username=manager&password=test-only%3Apassword"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(origin + "/dashboard/google-ads");
  expect(response.headers.get("set-cookie")).toMatch(/; Secure/i);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  expect((await logout(backend("/dashboard/logout", "logout=1", cookie))).headers.get("location")).toBe(origin + "/dashboard/login");
  vi.stubEnv("PUBLIC_URL", ""); vi.stubEnv("GADS_REDIRECT_URI", "");
  expect((await login(backend("/dashboard/login/submit", "username=manager&password=test-only%3Apassword"))).status).toBe(503);
});
