// Every audit module of the app (spec 2026-10-05 §5): the dashboard lists what this file gives it. A new audit is one
// more line here.
import type { AuditModule } from "@/shared/audit-contract";
import { siteAudit } from "@/modules/site-audit";
import { googleAds } from "@/modules/google-ads";

export const auditModules: AuditModule[] = [siteAudit.audit, googleAds.audit];
