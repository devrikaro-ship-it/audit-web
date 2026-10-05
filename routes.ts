// The composition root (spec 2026-10-05 §4): every address of shared/route-table.ts bound to its module's controller.
// The files under app/ call this file and nothing else.
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
