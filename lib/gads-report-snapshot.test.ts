import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  openReportSnapshot,
  sealReportSnapshot,
  type GadsReportSnapshot,
} from "./gads-report-delivery";
import { seal } from "./gads-session";

const completeV2Snapshot: GadsReportSnapshot = {
  generatedAt: "2026-09-08T12:00:00.000Z",
  evidenceMonths: 2,
  website: "https://synthetic-store.example/",
  accountName: "Synthetic Store",
  averageOrderValue: 500,
  goodsCost: 300,
  breakEvenCpa: 100,
  breakEvenRoas: 5,
  current: {
    spend: 1_250,
    revenue: 4_500,
    orders: 9,
    cpa: 138.89,
    roas: 3.6,
    clicks: 640,
    impressions: 12_800,
  },
  optimized: {
    spend: 1_250,
    revenue: 6_250,
    orders: 13,
    cpa: 96.15,
    roas: 5,
    clicks: 640,
    impressions: 12_800,
  },
  losses: [{
    productId: "loss-1",
    title: "Loss product",
    cost: 700,
    revenue: 700,
    orders: 1,
    cpa: 700,
    roas: 1,
    amount: 560,
  }],
  opportunities: [{
    productId: "winner-1",
    title: "Winning product",
    cost: 200,
    revenue: 2_400,
    orders: 4,
    cpa: 50,
    roas: 12,
    amount: 3_360,
  }],
  campaigns: [{
    name: "PMax Synthetic",
    channel: "PERFORMANCE_MAX",
    spend: 1_100,
    revenue: 4_100,
    roas: 3.73,
    status: "ENABLED",
  }],
  reportV2: {
    version: 2,
    currencyCode: "RON",
    periods: {
      selected: {
        range: { from: "2026-08-01", to: "2026-08-31" },
        spend: 1_250,
        salesVolume: 4_500,
        numberOfSales: 9,
      },
      previous: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        spend: 1_100,
        salesVolume: 3_850,
        numberOfSales: 8,
      },
      previousYear: {
        range: { from: "2025-08-01", to: "2025-08-31" },
        spend: 900,
        salesVolume: 3_100,
        numberOfSales: 7,
      },
    },
    products: [
      {
        productId: "loss-1",
        title: "Loss product",
        cost: 700,
        conversionValue: 700,
        conversions: 1,
        clicks: 80,
        impressions: 2_000,
        catalogEligible: true,
        sourceLabel: "LOSS_MAKER",
      },
      {
        productId: "winner-1",
        title: "Winning product",
        cost: 200,
        conversionValue: 2_400,
        conversions: 4,
        clicks: 160,
        impressions: 3_200,
        catalogEligible: true,
        sourceLabel: "PERFORMER",
      },
    ],
    productPopulationStatus: "COMPLETE",
    classificationDiagnostics: [],
  },
};

let storageDirectory = "";

describe("stored Google Ads report snapshots", () => {
  beforeEach(async () => {
    storageDirectory = await mkdtemp(path.join(os.tmpdir(), "gads-report-snapshots-"));
    process.env.GADS_REPORTS_DIR = storageDirectory;
    process.env.GADS_REPORT_SIGNING_SECRET = "synthetic-storage-witness-secret";
  });

  afterEach(async () => {
    await rm(storageDirectory, { recursive: true, force: true });
  });

  it("reopens a complete signed V2 report with identical data and account currency", async () => {
    const { saveStoredReportSnapshot, readStoredReportSnapshot } = await import("./gads-report-snapshot");
    const signedSnapshot = sealReportSnapshot(completeV2Snapshot);
    const snapshotPath = await saveStoredReportSnapshot("synthetic-v2", signedSnapshot);

    expect(path.dirname(snapshotPath)).toBe(path.resolve(process.env.GADS_REPORTS_DIR!));
    expect(await readFile(snapshotPath, "utf8")).toBe(signedSnapshot);

    const reopened = openReportSnapshot(await readStoredReportSnapshot(snapshotPath));
    expect(reopened).toEqual(completeV2Snapshot);
    expect(reopened?.reportV2?.currencyCode).toBe("RON");
    expect(reopened?.reportV2?.productPopulationStatus).toBe("COMPLETE");
    expect(reopened?.reportV2?.products.map(({ productId }) => productId)).toEqual([
      "loss-1",
      "winner-1",
    ]);
  });

  it("keeps original signed V2 bytes across identical retry and conflicting save", async () => {
    const { saveStoredReportSnapshot, readStoredReportSnapshot } = await import("./gads-report-snapshot");
    const original = sealReportSnapshot(completeV2Snapshot);
    const snapshotPath = await saveStoredReportSnapshot("synthetic-immutable", original);

    await expect(saveStoredReportSnapshot("synthetic-immutable", original)).resolves.toBe(snapshotPath);

    const conflict = sealReportSnapshot({
      ...completeV2Snapshot,
      accountName: "Conflicting Synthetic Store",
    });
    await expect(saveStoredReportSnapshot("synthetic-immutable", conflict))
      .rejects.toThrow("Refusing to overwrite immutable report snapshot");

    const preserved = await readStoredReportSnapshot(snapshotPath);
    expect(preserved).toBe(original);
    expect(openReportSnapshot(preserved)).toEqual(completeV2Snapshot);
  });

  it("lets the signature layer refuse tampered V2 bytes read from isolated storage", async () => {
    const { saveStoredReportSnapshot, readStoredReportSnapshot } = await import("./gads-report-snapshot");
    const signedSnapshot = sealReportSnapshot(completeV2Snapshot);
    const snapshotPath = await saveStoredReportSnapshot("synthetic-tampered", signedSnapshot);
    const signature = signedSnapshot.slice(signedSnapshot.lastIndexOf(".") + 1);
    const changedPayload = Buffer.from(JSON.stringify({
      ...completeV2Snapshot,
      reportV2: {
        ...completeV2Snapshot.reportV2!,
        currencyCode: "EUR",
      },
    })).toString("base64url");

    await writeFile(snapshotPath, `${changedPayload}.${signature}`, "utf8");

    expect(openReportSnapshot(await readStoredReportSnapshot(snapshotPath))).toBeNull();
  });

  it("stores the signed snapshot outside the lead index and reads it back", async () => {
    const { saveStoredReportSnapshot, readStoredReportSnapshot } = await import("./gads-report-snapshot");
    const snapshotPath = await saveStoredReportSnapshot("report-1", "signed.snapshot");
    expect(await readFile(snapshotPath, "utf8")).toBe("signed.snapshot");
    await expect(readStoredReportSnapshot(snapshotPath)).resolves.toBe("signed.snapshot");
  });

  it("refuses report identifiers that could escape the reports directory", async () => {
    const { saveStoredReportSnapshot } = await import("./gads-report-snapshot");
    await expect(saveStoredReportSnapshot("../outside", "signed.snapshot")).rejects.toThrow("Invalid report id");
  });

  it("refuses stored snapshot paths outside the reports directory", async () => {
    const { readStoredReportSnapshot } = await import("./gads-report-snapshot");
    await expect(readStoredReportSnapshot(path.join(os.tmpdir(), "outside.snapshot"))).rejects.toThrow("Invalid snapshot path");
  });

  it("publishes pending signed bytes immutably and accepts only an identical retry", async () => {
    process.env.GADS_SESSION_SECRET = "snapshot-session-secret";
    process.env.GADS_REPORT_SIGNING_SECRET = "snapshot-report-secret";
    const sealedSession = seal({ refreshToken: "refresh", website: "https://store.example/", customerName: "Store" });
    const signedSnapshot = sealReportSnapshot({
      website: "https://store.example/",
      accountName: "Store",
      averageOrderValue: 500,
      goodsCost: 300,
      breakEvenCpa: 100,
      breakEvenRoas: 5,
      current: { spend: 10, revenue: 50, orders: 1, cpa: 10, roas: 5 },
      optimized: { spend: 10, revenue: 50, orders: 1, cpa: 10, roas: 5 },
      losses: [],
      opportunities: [],
    });
    const { stagePendingReportSnapshot, claimPendingReport, releasePendingReportClaim } = await import("./gads-pending-report");
    const { promotePendingReportSnapshot, readStoredReportSnapshot } = await import("./gads-report-snapshot");
    const staged = await stagePendingReportSnapshot(signedSnapshot, sealedSession);
    const claim = await claimPendingReport(staged.reference, sealedSession);

    const snapshotPath = await promotePendingReportSnapshot(claim, "report-immutable");
    expect(await readStoredReportSnapshot(snapshotPath)).toBe(signedSnapshot);
    await expect(promotePendingReportSnapshot(claim, "report-immutable")).resolves.toBe(snapshotPath);
    await releasePendingReportClaim(claim);

    await writeFile(snapshotPath, "different signed bytes", "utf8");
    const second = await stagePendingReportSnapshot(signedSnapshot, sealedSession);
    const secondClaim = await claimPendingReport(second.reference, sealedSession);
    await expect(promotePendingReportSnapshot(secondClaim, "report-immutable")).rejects.toThrow("immutable");
    expect(await readFile(snapshotPath, "utf8")).toBe("different signed bytes");
    await releasePendingReportClaim(secondClaim);
  });

  it("refuses bytes changed after claim and before immutable publication", async () => {
    process.env.GADS_SESSION_SECRET = "snapshot-session-secret";
    process.env.GADS_REPORT_SIGNING_SECRET = "snapshot-report-secret";
    const sealedSession = seal({ refreshToken: "refresh", website: "https://store.example/", customerName: "Store" });
    const signedSnapshot = sealReportSnapshot({
      website: "https://store.example/",
      accountName: "Store",
      averageOrderValue: 500,
      goodsCost: 300,
      breakEvenCpa: 100,
      breakEvenRoas: 5,
      current: { spend: 10, revenue: 50, orders: 1, cpa: 10, roas: 5 },
      optimized: { spend: 10, revenue: 50, orders: 1, cpa: 10, roas: 5 },
      losses: [],
      opportunities: [],
    });
    const { stagePendingReportSnapshot, claimPendingReport, releasePendingReportClaim } = await import("./gads-pending-report");
    const { promotePendingReportSnapshot } = await import("./gads-report-snapshot");
    const staged = await stagePendingReportSnapshot(signedSnapshot, sealedSession);
    const claim = await claimPendingReport(staged.reference, sealedSession);
    await writeFile(claim.pendingSnapshotPath!, `${signedSnapshot}changed`, "utf8");

    await expect(promotePendingReportSnapshot(claim, "report-raced"))
      .rejects.toThrow("changed after claim");
    await releasePendingReportClaim(claim);
  });
});
