"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, unseal } from "@/lib/gads-session";
import { saveOrGetReportLead, updateLead, type GadsLead } from "@/lib/gads-leads";
import { generateStoredReportPdf } from "@/lib/gads-report-pdf";
import { promotePendingReportSnapshot } from "@/lib/gads-report-snapshot";
import { sendReportEmail } from "@/lib/gads-report-email";
import {
  bindPendingReportSubmission,
  claimPendingReport,
  completePendingReport,
  heartbeatPendingReportClaim,
  PendingReportError,
  releasePendingReportClaim,
  type PendingReportClaim,
} from "@/lib/gads-pending-report";

export type ContactResult = { ok: true; deliveryStatus: "EMAIL_SENT" | "EMAIL_FAILED"; reportId: string; portalPath: string } | { ok: false; error: string };

const SERVICE_TERMS_VERSION = "2026-08-27";
const PENDING_REFERENCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function text(formData: FormData, key: string, max: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function exactReference(formData: FormData): string {
  const value = formData.get("pendingReportReference");
  return typeof value === "string" && PENDING_REFERENCE_PATTERN.test(value) ? value : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pendingErrorResult(error: unknown): ContactResult {
  if (!(error instanceof PendingReportError)) return { ok: false, error: "REPORT_INVALID" };
  if (error.code === "INVALID" || !error.sessionBound) return { ok: false, error: "REPORT_INVALID" };
  return { ok: false, error: `REPORT_${error.code}` };
}

async function release(claim: PendingReportClaim | null): Promise<void> {
  if (claim) await releasePendingReportClaim(claim).catch(() => undefined);
}

export async function saveContact(formData: FormData): Promise<ContactResult> {
  const name = text(formData, "name", 120);
  const email = text(formData, "email", 160).toLowerCase();
  const phone = text(formData, "phone", 40);
  const pendingReportReference = exactReference(formData);
  const consent = formData.get("reportConsent") === "yes";
  if (name.length < 2 || !validEmail(email) || phone.length < 6 || !consent) {
    return { ok: false, error: "CONTACT_INVALID" };
  }
  if (!pendingReportReference) return { ok: false, error: "REPORT_INVALID" };

  const jar = await cookies();
  const sealedSession = jar.get(SESSION_COOKIE)?.value;
  const session = unseal(sealedSession);
  if (!session || !sealedSession) return { ok: false, error: "SESSION_INVALID" };

  let claim: PendingReportClaim | null = null;
  try {
    claim = await claimPendingReport(pendingReportReference, sealedSession);
  } catch (error) {
    console.error("[gads-report] Pending report claim failed:", error);
    return pendingErrorResult(error);
  }

  let identity: Awaited<ReturnType<typeof bindPendingReportSubmission>>;
  try {
    identity = await bindPendingReportSubmission(claim, {
      name,
      email,
      phone,
      consentVersion: SERVICE_TERMS_VERSION,
    });
  } catch (error) {
    await release(claim);
    return pendingErrorResult(error);
  }

  if (claim.result) {
    const result = claim.result;
    await release(claim);
    return { ok: true, ...result };
  }
  if (!claim.snapshot || !claim.signedSnapshot) {
    await release(claim);
    return { ok: false, error: "REPORT_INVALID" };
  }

  const consentAt = Date.now();
  let lead: GadsLead | null = null;
  let pdf: { path: string; buffer: Buffer };
  let snapshotPath: string;
  try {
    lead = await saveOrGetReportLead({
      nume: name,
      email,
      telefon: phone,
      customerId: session.customerId,
      customerName: session.customerName,
      marginPct: session.marginPct,
      website: session.website,
      averageOrderValue: session.averageOrderValue,
      goodsCost: session.goodsCost,
      breakEvenCpa: session.breakEvenCpa,
      breakEvenRoas: session.breakEvenRoas,
      reportId: identity.reportId,
      reportToken: identity.reportToken,
      portalToken: identity.portalToken,
      deliveryStatus: "NEW_LEAD",
      consentAt,
      serviceReportsEnabled: true,
      serviceReportsConsentAt: consentAt,
      serviceTermsVersion: SERVICE_TERMS_VERSION,
    });
    await heartbeatPendingReportClaim(claim);
    snapshotPath = await promotePendingReportSnapshot(claim, identity.reportId);
    await heartbeatPendingReportClaim(claim);
    pdf = await generateStoredReportPdf(identity.reportId, claim.snapshot);
    await updateLead(lead.id, { deliveryStatus: "PDF_READY", pdfPath: pdf.path, snapshotPath });
  } catch (error) {
    console.error("[gads-report] Report storage or PDF generation failed:", error);
    if (lead) await updateLead(lead.id, { deliveryStatus: "PDF_FAILED" }).catch(() => undefined);
    await release(claim);
    return { ok: false, error: "PDF_FAILED" };
  }

  const portalPath = `/google-ads/portal/${lead.portalToken}`;
  try {
    await heartbeatPendingReportClaim(claim);
    const delivery = await sendReportEmail({
      to: email,
      name,
      reportId: identity.reportId,
      pdf: pdf.buffer,
      portalPath,
    });
    const result = {
      deliveryStatus: delivery.ok ? "EMAIL_SENT" as const : "EMAIL_FAILED" as const,
      reportId: identity.reportId,
      portalPath,
    };
    await updateLead(lead.id, delivery.ok
      ? { deliveryStatus: "EMAIL_SENT", emailMessageId: delivery.messageId }
      : { deliveryStatus: "EMAIL_FAILED" });
    await completePendingReport(claim, result);
    return { ok: true, ...result };
  } catch (error) {
    console.error("[gads-report] Report delivery completion failed:", error);
    await release(claim);
    return { ok: false, error: "PDF_FAILED" };
  }
}

export const salveazaContact = saveContact;
