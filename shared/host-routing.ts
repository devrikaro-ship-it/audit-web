import { ROUTE_TABLE, matchRoute } from "./route-table";

// audit.devrika.ro serves the Romanian three-audit home page (/audituri) and the website audit (operator, 2026-09-23); every other path on it goes to the main
// origin (PUBLIC_URL, audit.devrika.io), so privacy, terms and OAuth URLs registered on .ro keep working.
// Hosts come from env: SITE_AUDIT_ORIGIN unset = no host routing at all.

export type HostDecision =
  | { kind: "next" }
  | { kind: "rewrite"; path: string }
  | { kind: "redirect"; location: string };

type Env = Record<string, string | undefined>;

// The addresses served on the site host are the route-table entries marked onSiteHost (spec 2026-10-05 §4); the static
// files those pages load are not addresses of the app, so they are listed here.
const STATIC_ASSETS = [/^\/_next\//, /^\/fonts\//, /^\/devrika-logo\.svg$/, /^\/logo-devrika\.png$/, /^\/favicon\.ico$/];

function servedOnSiteHost(path: string): boolean {
  if (STATIC_ASSETS.some((re) => re.test(path))) return true;
  const id = matchRoute(path);
  return id !== null && ROUTE_TABLE[id].onSiteHost;
}

function hostOf(origin: string | undefined): string | null {
  if (!origin) return null;
  try { return new URL(origin).host.toLowerCase(); } catch { return null; }
}

export function routeForHost(requestHost: string | null, path: string, search: string, env: Env = process.env): HostDecision {
  const siteHost = hostOf(env.SITE_AUDIT_ORIGIN);
  const host = requestHost?.split(",")[0].trim().toLowerCase() ?? "";
  if (!siteHost || host !== siteHost) return { kind: "next" };
  if (path === "/") return { kind: "rewrite", path: "/audituri" };
  if (servedOnSiteHost(path)) return { kind: "next" };
  const main = hostOf(env.PUBLIC_URL) ? new URL(env.PUBLIC_URL as string).origin : null;
  if (!main || hostOf(main) === siteHost) return { kind: "next" };
  return { kind: "redirect", location: `${main}${path}${search}` };
}
