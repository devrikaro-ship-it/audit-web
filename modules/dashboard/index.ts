// The door of the dashboard module (spec 2026-10-05 §3 rule 4): the agency dashboard and its login.
import { showDashboard } from "./controller/show-dashboard";
import { showManagerAccounts } from "./controller/show-manager-accounts";
import { showManagerReport } from "./controller/show-manager-report";
import { showLogin } from "./controller/show-login";
import * as loginSubmit from "./controller/login-submit";
import * as logout from "./controller/logout";

export { metadata as dashboardHomeMetadata } from "./controller/show-dashboard";
export { metadata as dashboardGadsMetadata } from "./controller/show-manager-accounts";
export { metadata as dashboardGadsReportMetadata } from "./controller/show-manager-report";
export { metadata as dashboardLoginMetadata } from "./controller/show-login";

export const dashboard = {
  name: "dashboard",
  controllers: { showDashboard, showManagerAccounts, showManagerReport, showLogin, loginSubmit, logout },
} as const;
