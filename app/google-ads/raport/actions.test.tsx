import { beforeEach, expect, it, vi } from "vitest";

const saveLead = vi.hoisted(() => vi.fn(async (record: Record<string, unknown>) => ({ ...record, id: "lead-1", createdAt: 1 })));
const updateLead = vi.hoisted(() => vi.fn(async () => null));
const findPortalToken = vi.hoisted(() => vi.fn(async () => null));
const openReportSnapshot = vi.hoisted(() => vi.fn(() => ({ website: "https://fitn4ss.ro/", accountName: "Fitn4ss" })));
const generateStoredReportPdf = vi.hoisted(() => vi.fn(async () => ({ path: "/data/report.pdf", buffer: Buffer.from("pdf") })));
const saveStoredReportSnapshot = vi.hoisted(() => vi.fn(async () => "/data/report.snapshot"));
const sendReportEmail = vi.hoisted(() => vi.fn(async () => ({ ok: true as const, messageId: "email-1" })));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("@/lib/gads-session", () => ({
  SESSION_COOKIE: "session",
  unseal: () => ({ customerId: "123", customerName: "Fitn4ss", website: "https://fitn4ss.ro/", averageOrderValue: 500, goodsCost: 300, breakEvenCpa: 100, breakEvenRoas: 5, marginPct: 40 }),
}));
vi.mock("@/lib/gads-leads", () => ({ saveLead, updateLead, findPortalToken }));
vi.mock("@/lib/gads-report-delivery", () => ({ openReportSnapshot, renderReportHtml: () => "<html>report</html>" }));
vi.mock("@/lib/gads-report-pdf", () => ({ generateStoredReportPdf }));
vi.mock("@/lib/gads-report-snapshot", () => ({ saveStoredReportSnapshot }));
vi.mock("@/lib/gads-report-email", () => ({ sendReportEmail }));
vi.mock("node:crypto", async (original) => ({ ...(await original<Record<string, unknown>>()), randomUUID: () => "report-1", randomBytes: () => Buffer.from("report-token") }));

import { saveContact } from "./actions";

function validForm() {
  const form = new FormData();
  form.set("name", "Ion Popescu");
  form.set("email", "ion@fitn4ss.ro");
  form.set("phone", "0722000111");
  form.set("reportSnapshot", "signed-report");
  form.set("reportConsent", "yes");
  return form;
}

beforeEach(() => vi.clearAllMocks());

it("refuses incomplete contact data before creating a lead", async () => {
  const form = validForm();
  form.delete("phone");
  await expect(saveContact(form)).resolves.toMatchObject({ ok: false, error: "CONTACT_INVALID" });
  expect(saveLead).not.toHaveBeenCalled();
});

it("stores the lead, saves the PDF, sends it, and records the final status", async () => {
  await expect(saveContact(validForm())).resolves.toMatchObject({ ok: true, deliveryStatus: "EMAIL_SENT", portalPath: expect.stringMatching(/^\/google-ads\/portal\//) });
  expect(saveLead).toHaveBeenCalledWith(expect.objectContaining({
    nume: "Ion Popescu",
    email: "ion@fitn4ss.ro",
    telefon: "0722000111",
    website: "https://fitn4ss.ro/",
    deliveryStatus: "NEW_LEAD",
    serviceReportsEnabled: true,
    serviceReportsConsentAt: expect.any(Number),
    serviceTermsVersion: "2026-08-27",
  }));
  expect(saveLead).toHaveBeenCalledWith(expect.objectContaining({ portalToken: expect.any(String) }));
  expect(saveStoredReportSnapshot).toHaveBeenCalledWith("report-1", "signed-report");
  expect(generateStoredReportPdf).toHaveBeenCalledWith("report-1", expect.objectContaining({ website: "https://fitn4ss.ro/", accountName: "Fitn4ss" }));
  expect(sendReportEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ion@fitn4ss.ro", pdf: Buffer.from("pdf"), portalPath: expect.stringMatching(/^\/google-ads\/portal\//) }));
  expect(updateLead).toHaveBeenLastCalledWith("lead-1", expect.objectContaining({ deliveryStatus: "EMAIL_SENT", emailMessageId: "email-1" }));
});

it("keeps the saved PDF and reports email failure honestly", async () => {
  sendReportEmail.mockResolvedValueOnce({ ok: false as const, reason: "EMAIL_NOT_CONFIGURED" });
  await expect(saveContact(validForm())).resolves.toMatchObject({ ok: true, deliveryStatus: "EMAIL_FAILED" });
  expect(updateLead).toHaveBeenCalledWith("lead-1", expect.objectContaining({ deliveryStatus: "PDF_READY", pdfPath: "/data/report.pdf", snapshotPath: "/data/report.snapshot" }));
  expect(updateLead).toHaveBeenLastCalledWith("lead-1", expect.objectContaining({ deliveryStatus: "EMAIL_FAILED" }));
});

it("reuses an existing portal identity for later reports of the same account", async () => {
  findPortalToken.mockResolvedValueOnce("existing-portal");
  await saveContact(validForm());
  expect(saveLead).toHaveBeenCalledWith(expect.objectContaining({ portalToken: "existing-portal" }));
});
