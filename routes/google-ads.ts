// The google-ads addresses bound to their controllers (spec 2026-10-05 §4).
import type { RouteId } from "@/shared/route-table";
import { googleAds } from "@/modules/google-ads";

export { gadsLandingMetadata } from "@/modules/google-ads";
export { gadsConnectMetadata } from "@/modules/google-ads";
export { gadsAccountsMetadata } from "@/modules/google-ads";
export { gadsTogetherMetadata } from "@/modules/google-ads";
export { gadsMarginMetadata } from "@/modules/google-ads";
export { gadsReportMetadata } from "@/modules/google-ads";

const ads = googleAds.controllers;

export const routes = {
  gadsLanding: ads.showLanding,
  gadsConnect: ads.showConnect,
  gadsAccounts: ads.showAccounts,
  gadsTogether: ads.showTogether,
  gadsMargin: ads.showMargin,
  gadsPortal: ads.showPortal,
  gadsReport: ads.showReport,
  gadsStartApi: ads.oauthStart,
  gadsCallbackApi: ads.oauthCallback,
  gadsReportDownloadApi: ads.reportDownload,
} satisfies Partial<Record<RouteId, unknown>>;
