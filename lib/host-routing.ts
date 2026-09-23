// audit.devrika.ro serves the Romanian three-audit home page (/audituri) and the website audit (operator, 2026-09-23); every other path on it goes to the main
// origin (PUBLIC_URL, audit.devrika.io), so privacy, terms and OAuth URLs registered on .ro keep working.
// Hosts come from env: SITE_AUDIT_ORIGIN unset = no host routing at all.

export type HostDecision =
  | { kind: "next" }
  | { kind: "rewrite"; path: string }
  | { kind: "redirect"; location: string };

type Env = Record<string, string | undefined>;

// Everything the website-audit funnel needs (landing, funnel, processing, report, their APIs, static assets) plus the
// agency dashboard with every audit and report (operator, 2026-09-23).
const SITE_AUDIT_PATHS = [
  /^\/audituri(\/|$)/, /^\/audit-seo(\/|$)/, /^\/audit(\/|$)/, /^\/start(\/|$)/, /^\/processing\//, /^\/r\//,
  /^\/api\/scan(\/|$)/, /^\/api\/audit(\/|$)/, /^\/dashboard(\/|$)/,
  /^\/_next\//, /^\/fonts\//, /^\/devrika-logo\.svg$/, /^\/logo-devrika\.png$/, /^\/favicon\.ico$/,
];

function hostOf(origin: string | undefined): string | null {
  if (!origin) return null;
  try { return new URL(origin).host.toLowerCase(); } catch { return null; }
}

export function routeForHost(requestHost: string | null, path: string, search: string, env: Env = process.env): HostDecision {
  const siteHost = hostOf(env.SITE_AUDIT_ORIGIN);
  const host = requestHost?.split(",")[0].trim().toLowerCase() ?? "";
  if (!siteHost || host !== siteHost) return { kind: "next" };
  if (path === "/") return { kind: "rewrite", path: "/audituri" };
  if (SITE_AUDIT_PATHS.some((re) => re.test(path))) return { kind: "next" };
  const main = hostOf(env.PUBLIC_URL) ? new URL(env.PUBLIC_URL as string).origin : null;
  if (!main || hostOf(main) === siteHost) return { kind: "next" };
  return { kind: "redirect", location: `${main}${path}${search}` };
}
