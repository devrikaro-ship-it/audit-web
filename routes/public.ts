// The public addresses bound to their controllers (spec 2026-10-05 §4).
import type { RouteId } from "@/shared/route-table";
import { publicPages } from "@/modules/public";

export { auditsMetadata } from "@/modules/public";
export { hubMetadata } from "@/modules/public";
export { termsMetadata } from "@/modules/public";
export { privacyMetadata } from "@/modules/public";

const pages = publicPages.controllers;

export const routes = {
  home: pages.showHome,
  audits: pages.showAudits,
  hub: pages.showHub,
  terms: pages.showTerms,
  privacy: pages.showPrivacy,
} satisfies Partial<Record<RouteId, unknown>>;
