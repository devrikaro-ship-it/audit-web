// The dashboard addresses bound to their controllers (spec 2026-10-05 §4); the dashboard receives every audit module
// from routes/audits.ts, so it never imports one by name.
import type { RouteId } from "@/shared/route-table";
import { dashboard } from "@/modules/dashboard";
import { auditModules } from "./audits";

export { dashboardHomeMetadata } from "@/modules/dashboard";
export { dashboardGadsMetadata } from "@/modules/dashboard";
export { dashboardGadsReportMetadata } from "@/modules/dashboard";
export { dashboardLoginMetadata } from "@/modules/dashboard";

const dash = dashboard.controllers;

export const routes = {
  dashboardHome: (props: { searchParams: Promise<{ tip?: string }> }) => dash.showDashboard({ ...props, audits: auditModules }),
  dashboardGads: dash.showManagerAccounts,
  dashboardGadsReport: dash.showManagerReport,
  dashboardLogin: dash.showLogin,
  dashboardLoginSubmit: dash.loginSubmit,
  dashboardLogout: dash.logout,
} satisfies Partial<Record<RouteId, unknown>>;
