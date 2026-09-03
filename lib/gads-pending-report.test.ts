import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealReportSnapshot, type GadsReportSnapshot } from "./gads-report-delivery";
import { seal } from "./gads-session";
import { reportStorageDirectory } from "./gads-report-snapshot";
import {
  bindPendingReportSubmission,
  claimPendingReport,
  cleanupExpiredPendingReports,
  completePendingReport,
  releasePendingReportClaim,
  stagePendingReportSnapshot,
} from "./gads-pending-report";

const contact = {
  name: "Ion Popescu",
  email: "ion@example.com",
  phone: "0722000111",
  consentVersion: "2026-08-27",
};

function reportSnapshot(productCount: number): GadsReportSnapshot {
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

function pendingDirectory(reference: string): string {
  return path.join(
    reportStorageDirectory(),
    "pending",
    createHash("sha256").update(reference).digest("hex"),
  );
}

function validSession(): string {
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

describe("pending Google Ads report snapshots", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T12:00:00.000Z"));
    process.env.GADS_SESSION_SECRET = "pending-session-secret";
    process.env.GADS_REPORT_SIGNING_SECRET = "pending-report-secret";
    process.env.GADS_REPORTS_DIR = await mkdtemp(path.join(os.tmpdir(), "gads-pending-"));
    delete process.env.GADS_PENDING_REPORT_TTL_MS;
    delete process.env.GADS_PENDING_CLAIM_LEASE_MS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([382, 10_000])("stages exact signed bytes with one fixed-size reference at %i products", async (productCount) => {
    const signedSnapshot = sealReportSnapshot(reportSnapshot(productCount));
    const session = validSession();
    const staged = await stagePendingReportSnapshot(signedSnapshot, session);

    expect(staged.reference).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await readFile(path.join(pendingDirectory(staged.reference), "snapshot"), "utf8"))
      .toBe(signedSnapshot);
    expect((await stat(path.join(pendingDirectory(staged.reference), "snapshot"))).mode & 0o777)
      .toBe(0o600);
  }, 30_000);

  it("rejects a changed reference and a reference used by another sealed session", async () => {
    const session = validSession();
    const staged = await stagePendingReportSnapshot(sealReportSnapshot(reportSnapshot(1)), session);
    const changed = `${staged.reference.slice(0, -1)}${staged.reference.endsWith("A") ? "B" : "A"}`;
    await expect(claimPendingReport(changed, session)).rejects.toMatchObject({ code: "INVALID" });

    const foreignSession = seal({
      refreshToken: "other-refresh-token",
      customerId: "123",
      customerName: "Example Store",
      website: "https://store.example/",
      customerTimeZone: "Europe/Bucharest",
      currencyCode: "EUR",
      averageOrderValue: 500,
      goodsCost: 300,
    });
    await expect(claimPendingReport(staged.reference, foreignSession)).rejects.toMatchObject({ code: "INVALID" });
  });

  it.each(["snapshot", "length", "digest"] as const)("fails closed when pending %s integrity changes", async (mutation) => {
    const session = validSession();
    const signedSnapshot = sealReportSnapshot(reportSnapshot(1));
    const staged = await stagePendingReportSnapshot(signedSnapshot, session);
    const directory = pendingDirectory(staged.reference);
    if (mutation === "snapshot") {
      await writeFile(path.join(directory, "snapshot"), `${signedSnapshot}x`, "utf8");
    } else {
      const recordPath = path.join(directory, "record.json");
      const record = JSON.parse(await readFile(recordPath, "utf8"));
      if (mutation === "length") record.snapshotBytes += 1;
      else record.snapshotDigest = "0".repeat(64);
      await writeFile(recordPath, JSON.stringify(record), "utf8");
    }

    await expect(claimPendingReport(staged.reference, session)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("expires entries while leaving a non-expired control entry intact", async () => {
    process.env.GADS_PENDING_REPORT_TTL_MS = "1000";
    const session = validSession();
    const expired = await stagePendingReportSnapshot(sealReportSnapshot(reportSnapshot(1)), session);
    vi.advanceTimersByTime(1_001);
    process.env.GADS_PENDING_REPORT_TTL_MS = "10000";
    const live = await stagePendingReportSnapshot(sealReportSnapshot(reportSnapshot(1)), validSession());

    await expect(claimPendingReport(expired.reference, session)).rejects.toMatchObject({ code: "EXPIRED" });
    const result = await cleanupExpiredPendingReports(Date.now(), 10);
    expect(result.removed).toBe(1);
    await expect(stat(pendingDirectory(expired.reference))).rejects.toThrow();
    await expect(stat(pendingDirectory(live.reference))).resolves.toBeTruthy();
  });

  it("allows only one concurrent cross-process claim and preserves bytes for retry", async () => {
    const session = validSession();
    const signedSnapshot = sealReportSnapshot(reportSnapshot(1));
    const staged = await stagePendingReportSnapshot(signedSnapshot, session);
    const claims = await Promise.allSettled([
      claimPendingReport(staged.reference, session),
      claimPendingReport(staged.reference, session),
    ]);
    const accepted = claims.filter((result) => result.status === "fulfilled");
    const refused = claims.filter((result) => result.status === "rejected");
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect((refused[0] as PromiseRejectedResult).reason).toMatchObject({ code: "IN_PROGRESS" });

    const claim = (accepted[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof claimPendingReport>>>).value;
    const firstIdentity = await bindPendingReportSubmission(claim, contact);
    await releasePendingReportClaim(claim);
    const retry = await claimPendingReport(staged.reference, session);
    expect(retry.signedSnapshot).toBe(signedSnapshot);
    await expect(bindPendingReportSubmission(retry, contact)).resolves.toEqual(firstIdentity);
    await releasePendingReportClaim(retry);
  });

  it("returns a stable completed result for an identical replay and rejects changed contact", async () => {
    const session = validSession();
    const staged = await stagePendingReportSnapshot(sealReportSnapshot(reportSnapshot(1)), session);
    const claim = await claimPendingReport(staged.reference, session);
    const identity = await bindPendingReportSubmission(claim, contact);
    const result = {
      deliveryStatus: "EMAIL_SENT" as const,
      reportId: identity.reportId,
      portalPath: "/google-ads/portal/stable-portal",
    };
    await completePendingReport(claim, result);

    const replay = await claimPendingReport(staged.reference, session);
    await expect(bindPendingReportSubmission(replay, contact)).resolves.toEqual(identity);
    expect(replay.result).toEqual(result);
    await releasePendingReportClaim(replay);

    const changedReplay = await claimPendingReport(staged.reference, session);
    await expect(bindPendingReportSubmission(changedReplay, { ...contact, phone: "0799999999" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await releasePendingReportClaim(changedReplay);
  });

  it("recovers an abandoned claim only after its lease expires", async () => {
    process.env.GADS_PENDING_CLAIM_LEASE_MS = "1000";
    const session = validSession();
    const staged = await stagePendingReportSnapshot(sealReportSnapshot(reportSnapshot(1)), session);
    const first = await claimPendingReport(staged.reference, session);
    await expect(claimPendingReport(staged.reference, session)).rejects.toMatchObject({ code: "IN_PROGRESS" });
    vi.advanceTimersByTime(1_001);
    const recovered = await claimPendingReport(staged.reference, session);
    expect(recovered.ownerToken).not.toBe(first.ownerToken);
    await releasePendingReportClaim(recovered);
  });

  it("keeps an expired entry with a live claim and removes it after the claim lease", async () => {
    process.env.GADS_PENDING_REPORT_TTL_MS = "1000";
    process.env.GADS_PENDING_CLAIM_LEASE_MS = "2000";
    const session = validSession();
    const staged = await stagePendingReportSnapshot(sealReportSnapshot(reportSnapshot(1)), session);
    await claimPendingReport(staged.reference, session);
    vi.advanceTimersByTime(1_001);
    await expect(cleanupExpiredPendingReports(Date.now(), 10)).resolves.toMatchObject({ removed: 0 });
    await expect(stat(pendingDirectory(staged.reference))).resolves.toBeTruthy();

    vi.advanceTimersByTime(1_000);
    await expect(cleanupExpiredPendingReports(Date.now(), 10)).resolves.toMatchObject({ removed: 1 });
    await expect(stat(pendingDirectory(staged.reference))).rejects.toThrow();
  });
});
