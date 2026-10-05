// The site-audit addresses bound to their controllers (spec 2026-10-05 §4). Each module has its own binding file, so a
// page loads only its own module; routes/index.ts gathers them all.
import type { RouteId } from "@/shared/route-table";
import { siteAudit } from "@/modules/site-audit";

const site = siteAudit.controllers;

export const routes = {
  siteLanding: site.showLanding,
  siteAuditAlias: site.redirectToFunnel,
  siteFunnel: site.showFunnel,
  siteProcessing: site.showProcessing,
  siteReport: site.showReport,
  siteReportPdf: site.printReportPdf,
  siteReportPreview: site.showReportPreview,
  siteScanApi: site.scanSite,
  siteAuditApi: site.auditApi,
} satisfies Partial<Record<RouteId, unknown>>;
