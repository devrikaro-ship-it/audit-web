// Every address of the app with the controller it calls (spec 2026-10-05 §4): the one place to read them all.
// Pages import their own module's file (routes/<module>.ts), never this one, so a page loads only its own module.
import type { RouteId } from "@/shared/route-table";
import { routes as siteAudit } from "./site-audit";
import { routes as googleAds } from "./google-ads";
import { routes as publicPages } from "./public";
import { routes as dashboard } from "./dashboard";

export const routes = {
  ...siteAudit,
  ...googleAds,
  ...publicPages,
  ...dashboard,
} satisfies Record<RouteId, unknown>;
