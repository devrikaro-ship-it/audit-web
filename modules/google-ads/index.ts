// The door of the google-ads module (spec 2026-10-05 §3 rule 4): everything outside the module reaches it here.
import { showLanding } from "./controller/show-landing";
import { showConnect } from "./controller/show-connect";
import { showAccounts } from "./controller/show-accounts";
import { showTogether } from "./controller/show-together";
import { showMargin } from "./controller/show-margin";
import { showPortal } from "./controller/show-portal";
import { showReport } from "./controller/show-report";
import * as oauthStart from "./controller/oauth-start";
import { managerAccounts } from "./controller/manager";
import { GADS_CHANNEL, gadsProspects } from "./model/prospects";
import type { AuditModule } from "@/shared/audit-contract";
import * as oauthCallback from "./controller/oauth-callback";
import * as reportDownload from "./controller/report-download";

export { metadata as gadsLandingMetadata } from "./controller/show-landing";
export { metadata as gadsConnectMetadata } from "./controller/show-connect";
export { metadata as gadsAccountsMetadata } from "./controller/show-accounts";
export { metadata as gadsTogetherMetadata } from "./controller/show-together";
export { metadata as gadsMarginMetadata } from "./controller/show-margin";
export { metadata as gadsReportMetadata } from "./controller/show-report";

export const googleAds = {
  name: "google-ads",
  audit: {
    name: "google-ads",
    channel: GADS_CHANNEL,
    filter: "gads",
    prospects: async () => gadsProspects(await managerAccounts()),
  } satisfies AuditModule,
  controllers: { showLanding, showConnect, showAccounts, showTogether, showMargin, showPortal, showReport, oauthStart, oauthCallback, reportDownload },
} as const;

// What the agency dashboard shows of Google Ads: the manager's accounts and reports, and the report view itself.
export { managerAccountKey, managerAccounts, readManagerReport, registeredReports, requireManagerAccess } from "./controller/manager";
export type { ManagerAccount } from "./controller/manager";
export { default as ReportingDashboard } from "./view/reporting-dashboard";
