import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sealReportSnapshot, type GadsReportSnapshot } from "./gads-report-delivery";
import { seal } from "./gads-session";

function snapshot(overrides: Partial<GadsReportSnapshot> = {}): GadsReportSnapshot {
  return {
    generatedAt: "2026-09-09T08:47:32.837Z",
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
    reportProducts: [],
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
      products: [],
      productPopulationStatus: "COMPLETE",
      classificationDiagnostics: [],
    },
    ...overrides,
  };
}

function session(overrides: Record<string, unknown> = {}): string {
  return seal({
    refreshToken: "refresh-token",
    customerId: "123",
    customerName: "Example Store",
    website: "https://store.example/",
    customerTimeZone: "Europe/Bucharest",
    currencyCode: "EUR",
    averageOrderValue: 500,
    goodsCost: 300,
    ...overrides,
  });
}

describe("generated Google Ads report persistence", () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.GADS_SESSION_SECRET = "generated-session-secret";
    process.env.GADS_REPORT_SIGNING_SECRET = "generated-report-secret";
    const directory = await mkdtemp(path.join(os.tmpdir(), "gads-generated-"));
    process.env.GADS_REPORTS_DIR = path.join(directory, "reports");
    process.env.GADS_LEADS_FILE = path.join(directory, "gads-leads.json");
  });

  it("stores an exact signed report before contact and exposes one manager record", async () => {
    const signedSnapshot = sealReportSnapshot(snapshot());
    const { persistGeneratedReport } = await import("./gads-generated-report");
    const first = await persistGeneratedReport({ signedSnapshot, sealedSession: session() });
    const retry = await persistGeneratedReport({ signedSnapshot, sealedSession: session() });

    expect(retry.lead.id).toBe(first.lead.id);
    expect(retry.reportId).toBe(first.reportId);
    expect(retry.managerPath).toBe(`/dashboard/google-ads/reports/${first.lead.id}`);
    expect(await readFile(first.snapshotPath, "utf8")).toBe(signedSnapshot);
    expect(first.lead).toMatchObject({
      nume: "",
      email: "",
      customerId: "123",
    });
    expect(first.lead).not.toHaveProperty("serviceReportsEnabled");
    expect(first.lead).not.toHaveProperty("consentAt");
    expect(first.lead).not.toHaveProperty("deliveryStatus");
    const { registeredReports, readManagerReport } = await import("./gads-manager");
    const reports = await registeredReports();
    expect(reports).toHaveLength(1);
    expect((await readManagerReport(reports[0]))?.snapshot.generatedAt)
      .toBe("2026-09-09T08:47:32.837Z");
  });

  it("keeps distinct generations distinct and refuses invalid or crossed snapshots", async () => {
    const { persistGeneratedReport } = await import("./gads-generated-report");
    const first = await persistGeneratedReport({
      signedSnapshot: sealReportSnapshot(snapshot()),
      sealedSession: session(),
    });
    const second = await persistGeneratedReport({
      signedSnapshot: sealReportSnapshot(snapshot({ generatedAt: "2026-09-09T09:00:00.000Z" })),
      sealedSession: session(),
    });
    expect(second.reportId).not.toBe(first.reportId);
    await expect(persistGeneratedReport({ signedSnapshot: "invalid", sealedSession: session() }))
      .rejects.toThrow("invalid");
    await expect(persistGeneratedReport({
      signedSnapshot: sealReportSnapshot(snapshot({ website: "https://other.example/" })),
      sealedSession: session(),
    })).rejects.toThrow("session");
  });

  it("recovers an exact legacy pending snapshot without changing its source", async () => {
    const signedSnapshot = sealReportSnapshot(snapshot());
    const sealedSession = session();
    const { stagePendingReportSnapshot } = await import("./gads-pending-report");
    const staged = await stagePendingReportSnapshot(signedSnapshot, sealedSession);
    const pendingDirectory = path.join(
      process.env.GADS_REPORTS_DIR!,
      "pending",
      createHash("sha256").update(staged.reference).digest("hex"),
    );
    const before = await readFile(path.join(pendingDirectory, "snapshot"), "utf8");
    const digest = createHash("sha256").update(signedSnapshot).digest("hex");
    const { recoverPendingGeneratedReport } = await import("./gads-generated-report");
    const recovered = await recoverPendingGeneratedReport({
      pendingDirectory,
      expectedSnapshotDigest: digest,
      expectedWebsite: "https://store.example/",
      expectedAccountName: "Example Store",
    });

    expect(recovered.lead.customerId).toBeUndefined();
    expect(recovered.lead.nume).toBe("");
    expect(await readFile(path.join(pendingDirectory, "snapshot"), "utf8")).toBe(before);
    await expect(recoverPendingGeneratedReport({
      pendingDirectory,
      expectedSnapshotDigest: "0".repeat(64),
      expectedWebsite: "https://store.example/",
      expectedAccountName: "Example Store",
    })).rejects.toThrow("digest");

    const recordPath = path.join(pendingDirectory, "record.json");
    const record = JSON.parse(await readFile(recordPath, "utf8"));
    record.snapshotBytes += 1;
    await writeFile(recordPath, JSON.stringify(record), "utf8");
    await expect(recoverPendingGeneratedReport({
      pendingDirectory,
      expectedSnapshotDigest: digest,
      expectedWebsite: "https://store.example/",
      expectedAccountName: "Example Store",
    })).rejects.toThrow("integrity");
  });
});
