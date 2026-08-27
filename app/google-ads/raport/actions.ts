"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { findPortalToken, saveLead, updateLead } from "@/lib/gads-leads";
import { openReportSnapshot } from "@/lib/gads-report-delivery";
import { generateStoredReportPdf } from "@/lib/gads-report-pdf";
import { saveStoredReportSnapshot } from "@/lib/gads-report-snapshot";
import { sendReportEmail } from "@/lib/gads-report-email";

export type ContactResult = { ok: true; deliveryStatus: "EMAIL_SENT" | "EMAIL_FAILED"; reportId: string; portalPath: string } | { ok: false; error: string };

const SERVICE_TERMS_VERSION = "2026-08-27";

function text(formData: FormData, key: string, max: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function saveContact(formData: FormData): Promise<ContactResult> {
  const name = text(formData, "name", 120);
  const email = text(formData, "email", 160).toLowerCase();
  const phone = text(formData, "phone", 40);
  const reportSnapshot = text(formData, "reportSnapshot", 200_000);
  const consent = formData.get("reportConsent") === "yes";
  if (name.length < 2 || !validEmail(email) || phone.length < 6 || !consent) return { ok: false, error: "CONTACT_INVALID" };

  const snapshot = openReportSnapshot(reportSnapshot);
  if (!snapshot) return { ok: false, error: "REPORT_INVALID" };
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session || session.website !== snapshot.website || (session.customerName || "Your account") !== snapshot.accountName) return { ok: false, error: "SESSION_INVALID" };

  const reportId = randomUUID();
  const reportToken = randomBytes(24).toString("base64url");
  const portalToken = await findPortalToken(email, session.customerId) || randomBytes(24).toString("base64url");
  const consentAt = Date.now();
  const lead = await saveLead({
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
    reportId,
    reportToken,
    portalToken,
    deliveryStatus: "NEW_LEAD",
    consentAt,
    serviceReportsEnabled: true,
    serviceReportsConsentAt: consentAt,
    serviceTermsVersion: SERVICE_TERMS_VERSION,
  });

  let pdf: { path: string; buffer: Buffer };
  let snapshotPath: string;
  try {
    snapshotPath = await saveStoredReportSnapshot(reportId, reportSnapshot);
    pdf = await generateStoredReportPdf(reportId, snapshot);
    await updateLead(lead.id, { deliveryStatus: "PDF_READY", pdfPath: pdf.path, snapshotPath });
  } catch {
    await updateLead(lead.id, { deliveryStatus: "PDF_FAILED" });
    return { ok: false, error: "PDF_FAILED" };
  }

  const portalPath = `/google-ads/portal/${portalToken}`;
  const delivery = await sendReportEmail({ to: email, name, reportId, pdf: pdf.buffer, portalPath });
  if (!delivery.ok) {
    await updateLead(lead.id, { deliveryStatus: "EMAIL_FAILED" });
    return { ok: true, deliveryStatus: "EMAIL_FAILED", reportId, portalPath };
  }
  await updateLead(lead.id, { deliveryStatus: "EMAIL_SENT", emailMessageId: delivery.messageId });
  return { ok: true, deliveryStatus: "EMAIL_SENT", reportId, portalPath };
}

export const salveazaContact = saveContact;
