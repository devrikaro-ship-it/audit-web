import { beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sealReportSnapshot } from "./gads-report-delivery";
import { seal } from "./gads-session";

describe("stored Google Ads report snapshots", () => {
  beforeEach(async () => {
    process.env.GADS_REPORTS_DIR = await mkdtemp(path.join(os.tmpdir(), "gads-report-snapshots-"));
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
