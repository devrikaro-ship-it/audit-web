import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { basicAuthOk, dashCredentials, type DashCred } from "./dash-auth";

export const DASHBOARD_COOKIE = "dashboard_session";
export const DASHBOARD_MAX_AGE = 8 * 60 * 60;
export const DASHBOARD_HOME = "/dashboard";

// The dashboard answers on our configured origins only (PUBLIC_URL, and SITE_AUDIT_ORIGIN since the .ro host serves
// the dashboard too). The forwarded host picks among them; a host outside the list falls back to the first one, so a
// spoofed header can never choose where we redirect or which Origin the login form must come from.
function configuredOrigins(): string[] {
  const out: string[] = [];
  for (const value of [process.env.PUBLIC_URL || process.env.GADS_REDIRECT_URI, process.env.SITE_AUDIT_ORIGIN]) {
    try {
      const u = new URL(value || "");
      if (u.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) && !out.includes(u.origin)) out.push(u.origin);
    } catch { /* not configured */ }
  }
  return out;
}

export function dashboardOrigin(request: { url: string; headers?: Headers }): string | null {
  if (process.env.NODE_ENV !== "production") return new URL(request.url).origin;
  const origins = configuredOrigins();
  if (origins.length === 0) return null;
  const host = request.headers?.get("x-forwarded-host")?.split(",")[0].trim().toLowerCase();
  return origins.find((o) => new URL(o).host === host) ?? origins[0];
}

function equal(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export function dashboardPasswordOk(user: string, password: string, credentials: DashCred = dashCredentials()) {
  if (!credentials) return false;
  const userMatches = equal(user, credentials.user);
  const passwordMatches = equal(password, credentials.pass);
  return userMatches && passwordMatches;
}

function sessionPath(token: string) {
  const directory = process.env.DASH_SESSIONS_DIR || path.join(path.dirname(process.env.GADS_LEADS_FILE || process.env.LEADS_FILE || path.join(process.cwd(), "data", "x")), "dashboard-sessions");
  return path.join(directory, createHash("sha256").update(token).digest("hex") + ".json");
}

function binding(token: string, credentials: NonNullable<DashCred>) {
  return createHmac("sha256", token).update(JSON.stringify([credentials.user, credentials.pass])).digest("hex");
}

export async function createDashboardSession(): Promise<string> {
  const credentials = dashCredentials();
  if (!credentials) throw new Error("Dashboard authentication unavailable");
  const token = randomBytes(32).toString("hex");
  const file = sessionPath(token);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify({ expiresAt: Date.now() + DASHBOARD_MAX_AGE * 1000, credentialBinding: binding(token, credentials) }), { mode: 0o600, flag: "wx" });
  return token;
}

export async function dashboardSessionOk(token: string | undefined): Promise<boolean> {
  const credentials = dashCredentials();
  if (!credentials || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const session = JSON.parse(await readFile(sessionPath(token), "utf8"));
    return Number.isSafeInteger(session.expiresAt) && session.expiresAt > Date.now()
      && session.expiresAt <= Date.now() + DASHBOARD_MAX_AGE * 1000
      && typeof session.credentialBinding === "string" && equal(session.credentialBinding, binding(token, credentials));
  } catch { return false; }
}

export async function revokeDashboardSession(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  try { await unlink(sessionPath(token)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

export async function dashboardAccessOk(headers: Headers) {
  if (headers.has("authorization")) return basicAuthOk(headers.get("authorization"), dashCredentials());
  const raw = headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(DASHBOARD_COOKIE + "="))?.slice(DASHBOARD_COOKIE.length + 1);
  return dashboardSessionOk(raw);
}

export function dashboardCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/dashboard", maxAge: DASHBOARD_MAX_AGE };
}

export function dashboardReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/dashboard") || /[\\\u0000-\u0020%]/.test(value)) return DASHBOARD_HOME;
  const url = new URL(value, "https://internal.invalid");
  if (url.origin !== "https://internal.invalid" || !(url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"))) return DASHBOARD_HOME;
  if (/^\/dashboard\/(login|logout)(\/|$)/.test(url.pathname)) return DASHBOARD_HOME;
  return url.pathname + url.search;
}
