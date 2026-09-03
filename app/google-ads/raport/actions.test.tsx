import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sealReportSnapshot, openReportSnapshot, type GadsReportSnapshot } from "@/lib/gads-report-delivery";
import { seal } from "@/lib/gads-session";
import { buildGoogleAdsReportV2 } from "@/lib/gads-report-metrics";

const cookieState = vi.hoisted(() => ({ value: "" }));
const promoteState = vi.hoisted(() => ({ failures: 0 }));
const generateStoredReportPdf = vi.hoisted(() => vi.fn(async (reportId: string) => ({
  path: `/data/${reportId}.pdf`,
  buffer: Buffer.from("pdf"),
})));
const sendReportEmail = vi.hoisted(() => vi.fn(async () => ({ ok: true as const, messageId: "email-1" })));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: cookieState.value }) }),
}));
vi.mock("@/lib/gads-report-pdf", () => ({ generateStoredReportPdf }));
vi.mock("@/lib/gads-report-email", () => ({ sendReportEmail }));
vi.mock("@/lib/gads-report-snapshot", async (original) => {
  const actual = await original<typeof import("@/lib/gads-report-snapshot")>();
  return {
    ...actual,
    promotePendingReportSnapshot: async (...args: Parameters<typeof actual.promotePendingReportSnapshot>) => {
      if (promoteState.failures > 0) {
        promoteState.failures -= 1;
        throw new Error("injected snapshot storage failure");
      }
      return actual.promotePendingReportSnapshot(...args);
    },
  };
});

function routeShapedSnapshot(productCount: number): GadsReportSnapshot {
  const products = Array.from({ length: productCount }, (_, index) => ({
    productId: `product-${index}`,
    title: `Catalog product ${index} ${"x".repeat(96)}`,
    cost: 10,
    conversionValue: 50,
    conversions: 1,
    clicks: 10,
    impressions: 100,
    catalogEligible: true,
    sourceLabel: "PERFORMER" as const,
  }));
  return {
    website: "https://store.example/",
    accountName: "Example Store",
    averageOrderValue: 500,
    goodsCost: 300,
    breakEvenCpa: 100,
    breakEvenRoas: 5,
    current: { spend: 10, revenue: 50, orders: 1, cpa: 10, roas: 5 },
    optimized: { spend: 10, revenue: 50, orders: 1, cpa: 10, roas: 5 },
    losses: [],
    opportunities: [],
    reportProducts: products,
    reportV2: {
      version: 2,
      currencyCode: "EUR",
      periods: {
        selected: {
          range: { from: "2026-08-01", to: "2026-08-31" },
          spend: 10,
          salesVolume: 50,
          numberOfSales: 1,
        },
        previous: null,
        previousYear: null,
      },
      products,
      productPopulationStatus: "COMPLETE",
      classificationDiagnostics: [],
    },
  };
}

function session(): string {
  return seal({
    refreshToken: "refresh-token",
    customerId: "123",
    customerName: "Example Store",
    website: "https://store.example/",
    customerTimeZone: "Europe/Bucharest",
    currencyCode: "EUR",
    averageOrderValue: 500,
    goodsCost: 300,
  });
}

function contactForm(reference: string, overrides: Partial<Record<"name" | "email" | "phone", string>> = {}): FormData {
  const form = new FormData();
  form.set("name", overrides.name ?? "Ion Popescu");
  form.set("email", overrides.email ?? "ion@example.com");
  form.set("phone", overrides.phone ?? "0722000111");
  form.set("pendingReportReference", reference);
  form.set("reportConsent", "yes");
  return form;
}

async function stage(productCount: number) {
  const signedSnapshot = sealReportSnapshot(routeShapedSnapshot(productCount));
  const { stagePendingReportSnapshot } = await import("@/lib/gads-pending-report");
  const staged = await stagePendingReportSnapshot(signedSnapshot, cookieState.value);
  return { ...staged, signedSnapshot };
}

async function action() {
  return (await import("./actions")).saveContact;
}

describe("Google Ads report contact delivery", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GADS_SESSION_SECRET = "action-session-secret";
    process.env.GADS_REPORT_SIGNING_SECRET = "action-report-secret";
    const directory = await mkdtemp(path.join(os.tmpdir(), "gads-action-"));
    process.env.GADS_REPORTS_DIR = path.join(directory, "reports");
    process.env.GADS_LEADS_FILE = path.join(directory, "gads-leads.json");
    cookieState.value = session();
    promoteState.failures = 0;
    generateStoredReportPdf.mockImplementation(async (reportId: string) => ({
      path: `/data/${reportId}.pdf`,
      buffer: Buffer.from("pdf"),
    }));
    sendReportEmail.mockResolvedValue({ ok: true as const, messageId: "email-1" });
  });

  it("refuses incomplete contact data before creating a lead", async () => {
    const staged = await stage(1);
    const form = contactForm(staged.reference);
    form.delete("phone");
    await expect((await action())(form)).resolves.toMatchObject({ ok: false, error: "CONTACT_INVALID" });
    const { listLeads } = await import("@/lib/gads-leads");
    expect(await listLeads()).toEqual([]);
  });

  it.each([382, 10_000])("submits only a fixed reference and preserves exact final bytes at %i products", async (productCount) => {
    const staged = await stage(productCount);
    expect(staged.signedSnapshot.length).toBeGreaterThan(200_000);
    const form = contactForm(staged.reference);
    const applicationBody = new URLSearchParams(Array.from(form.entries()) as [string, string][]).toString();
    expect(form.get("pendingReportReference")).toHaveLength(43);
    expect(form.has("reportSnapshot")).toBe(false);
    expect(Buffer.byteLength(applicationBody)).toBeLessThan(1_024);

    const result = await (await action())(form);
    expect(result).toMatchObject({ ok: true, deliveryStatus: "EMAIL_SENT" });
    if (!result.ok) throw new Error("delivery unexpectedly failed");
    const { listLeads } = await import("@/lib/gads-leads");
    const [lead] = await listLeads();
    expect(lead.reportId).toBe(result.reportId);
    expect(await readFile(lead.snapshotPath!, "utf8")).toBe(staged.signedSnapshot);
    const opened = openReportSnapshot(await readFile(lead.snapshotPath!, "utf8"));
    expect(opened?.reportV2?.products).toHaveLength(productCount);
    const source = routeShapedSnapshot(productCount);
    const immediateModel = buildGoogleAdsReportV2({
      currencyCode: source.reportV2!.currencyCode,
      minimumRoasTarget: source.breakEvenRoas,
      maximumCpaTarget: source.breakEvenCpa,
      periods: source.reportV2!.periods,
      products: source.reportV2!.products,
      productPopulationStatus: source.reportV2!.productPopulationStatus,
    });
    const portalModel = buildGoogleAdsReportV2({
      currencyCode: opened!.reportV2!.currencyCode,
      minimumRoasTarget: opened!.breakEvenRoas,
      maximumCpaTarget: opened!.breakEvenCpa,
      periods: opened!.reportV2!.periods,
      products: opened!.reportV2!.products,
      productPopulationStatus: opened!.reportV2!.productPopulationStatus,
    });
    expect(portalModel).toEqual(immediateModel);
  }, 60_000);

  it("allows one concurrent delivery pipeline for a pending reference", async () => {
    const staged = await stage(1);
    const saveContact = await action();
    const results = await Promise.all([
      saveContact(contactForm(staged.reference)),
      saveContact(contactForm(staged.reference)),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: "REPORT_IN_PROGRESS" },
    ]);
    expect(sendReportEmail).toHaveBeenCalledTimes(1);
  });

  it("returns one stable result on identical replay and conflicts on changed contact", async () => {
    const staged = await stage(1);
    const saveContact = await action();
    const first = await saveContact(contactForm(staged.reference));
    const replay = await saveContact(contactForm(staged.reference));
    expect(replay).toEqual(first);
    expect(generateStoredReportPdf).toHaveBeenCalledTimes(1);
    expect(sendReportEmail).toHaveBeenCalledTimes(1);
    await expect(saveContact(contactForm(staged.reference, { phone: "0799999999" })))
      .resolves.toEqual({ ok: false, error: "REPORT_CONFLICT" });
  });

  it.each(["snapshot", "pdf"] as const)("retries a %s storage failure with the same report identity and one lead", async (failure) => {
    const staged = await stage(1);
    if (failure === "snapshot") promoteState.failures = 1;
    else generateStoredReportPdf.mockRejectedValueOnce(new Error("injected PDF failure"));
    const saveContact = await action();
    await expect(saveContact(contactForm(staged.reference))).resolves.toEqual({ ok: false, error: "PDF_FAILED" });
    const second = await saveContact(contactForm(staged.reference));
    expect(second.ok).toBe(true);
    const { listLeads } = await import("@/lib/gads-leads");
    const leads = await listLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0].reportId).toBe(second.ok ? second.reportId : undefined);
  });

  it("records an honest email failure once and replays its completed receipt", async () => {
    sendReportEmail.mockResolvedValueOnce({ ok: false as const, reason: "EMAIL_NOT_CONFIGURED" });
    const staged = await stage(1);
    const saveContact = await action();
    const first = await saveContact(contactForm(staged.reference));
    const replay = await saveContact(contactForm(staged.reference));
    expect(first).toMatchObject({ ok: true, deliveryStatus: "EMAIL_FAILED" });
    expect(replay).toEqual(first);
    expect(sendReportEmail).toHaveBeenCalledTimes(1);
  });
});
