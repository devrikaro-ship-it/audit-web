// The door of the google-ads module (spec 2026-10-05 §3 rule 4): everything outside the module reaches it here.
import { showLanding } from "./controller/show-landing";
import { showConnect } from "./controller/show-connect";
import { showAccounts } from "./controller/show-accounts";
import { showTogether } from "./controller/show-together";
import { showMargin } from "./controller/show-margin";
import { showPortal } from "./controller/show-portal";
import { showReport } from "./controller/show-report";
import * as oauthStart from "./controller/oauth-start";
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
  controllers: { showLanding, showConnect, showAccounts, showTogether, showMargin, showPortal, showReport, oauthStart, oauthCallback, reportDownload },
} as const;
