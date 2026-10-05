// The single address register (spec 2026-10-05 §4): every address of the app as plain data. It imports nothing, so
// proxy.ts and the host routing can read it without loading the modules. routes.ts binds each entry to a controller.
export type Access = "public" | "agency" | "gads-session";
export type ModuleName = "public" | "site-audit" | "google-ads" | "dashboard";
export type RouteDef = { path: string; module: ModuleName; access: Access; onSiteHost: boolean };

const route = (path: string, module: ModuleName, access: Access, onSiteHost: boolean): RouteDef => ({ path, module, access, onSiteHost });

export const ROUTE_TABLE = {
  home: route("/", "public", "public", false),
  audits: route("/audituri", "public", "public", true),
  hub: route("/hub", "public", "public", false),
  terms: route("/termeni", "public", "public", false),
  privacy: route("/confidentialitate", "public", "public", false),

  siteLanding: route("/audit-seo", "site-audit", "public", true),
  siteAuditAlias: route("/audit", "site-audit", "public", true),
  siteFunnel: route("/start", "site-audit", "public", true),
  siteProcessing: route("/processing/[id]", "site-audit", "public", true),
  siteReport: route("/r/[id]", "site-audit", "public", true),
  siteReportPdf: route("/r/[id]/pdf", "site-audit", "public", true),
  siteReportPreview: route("/r/preview", "site-audit", "public", true),
  siteScanApi: route("/api/scan", "site-audit", "public", true),
  siteAuditApi: route("/api/audit", "site-audit", "public", true),

  gadsLanding: route("/google-ads", "google-ads", "public", false),
  gadsConnect: route("/google-ads/connect", "google-ads", "public", false),
  gadsAccounts: route("/google-ads/conturi", "google-ads", "gads-session", false),
  gadsTogether: route("/google-ads/impreuna", "google-ads", "gads-session", false),
  gadsMargin: route("/google-ads/marja", "google-ads", "gads-session", false),
  gadsPortal: route("/google-ads/portal/[token]", "google-ads", "public", false),
  gadsReport: route("/google-ads/raport", "google-ads", "gads-session", false),
  gadsStartApi: route("/api/google-ads/start", "google-ads", "public", false),
  gadsCallbackApi: route("/api/google-ads/callback", "google-ads", "public", false),
  gadsReportDownloadApi: route("/api/google-ads/reports/[id]", "google-ads", "public", false),

  dashboardHome: route("/dashboard", "dashboard", "agency", true),
  dashboardGads: route("/dashboard/google-ads", "dashboard", "agency", true),
  dashboardGadsReport: route("/dashboard/google-ads/reports/[id]", "dashboard", "agency", true),
  dashboardLogin: route("/dashboard/login", "dashboard", "public", true),
  dashboardLoginSubmit: route("/dashboard/login/submit", "dashboard", "public", true),
  dashboardLogout: route("/dashboard/logout", "dashboard", "agency", true),
} as const satisfies Record<string, RouteDef>;

export type RouteId = keyof typeof ROUTE_TABLE;

const segments = (p: string) => p.split("/").filter(Boolean);
const isParam = (s: string) => /^\[[^\]]+\]$/.test(s);

export function href(id: RouteId, params: Record<string, string> = {}): string {
  const parts = segments(ROUTE_TABLE[id].path).map((s) => {
    if (!isParam(s)) return s;
    const value = params[s.slice(1, -1)];
    if (!value) throw new Error(`href(${id}): missing parameter ${s}`);
    return encodeURIComponent(value);
  });
  return "/" + parts.join("/");
}

// A static segment beats a parameter: /r/preview is siteReportPreview, not siteReport.
export function matchRoute(pathname: string): RouteId | null {
  const asked = segments(pathname);
  let best: { id: RouteId; params: number } | null = null;
  for (const id of Object.keys(ROUTE_TABLE) as RouteId[]) {
    const pattern = segments(ROUTE_TABLE[id].path);
    if (pattern.length !== asked.length) continue;
    if (!pattern.every((s, i) => isParam(s) || s === asked[i])) continue;
    const params = pattern.filter(isParam).length;
    if (!best || params < best.params) best = { id, params };
  }
  return best?.id ?? null;
}

export function accessFor(pathname: string): Access {
  const id = matchRoute(pathname);
  return id ? ROUTE_TABLE[id].access : "public";
}
