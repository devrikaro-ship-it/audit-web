// The door of the site-audit module (spec 2026-10-05 §3 rule 4): everything outside the module reaches it here.
export { approveCandidate, readApprovals } from "./model/data/learning";
export { MIN_DOMAINS, candidateKey, computeLearning } from "./model/learning";
export { getAudit, listAudits } from "./model/data/audit-repository";
export { readObservations } from "./model/data/observations";
export { summarizeByPlatform } from "./model/observations";
export { PROFILES } from "./model/platform-knowledge";
export type { AuditData } from "./model/types";

import * as auditApi from "./controller/audit-api";
import * as scanSite from "./controller/scan-site";
import * as printReportPdf from "./controller/print-report-pdf";
import { redirectToFunnel } from "./controller/redirect-to-funnel";
import { showFunnel, showLanding, showProcessing, showReport, showReportPreview } from "./controller/pages";

export const siteAudit = {
  name: "site-audit",
  controllers: { showLanding, showFunnel, showProcessing, showReport, showReportPreview, redirectToFunnel, auditApi, scanSite, printReportPdf },
} as const;
