import { describe, expect, it } from "vitest";
import {
  buildGoogleAdsReportV2,
  missedSalesVolume,
  periodResult,
  productLoss,
  type GoogleAdsReportV2Input,
  type ReportProductInputV2,
} from "./gads-report-metrics";

const range = { from: "2026-08-01", to: "2026-08-31" };

const reportProduct = (
  productId: string,
  sourceLabel: ReportProductInputV2["sourceLabel"],
  overrides: Partial<ReportProductInputV2> = {},
): ReportProductInputV2 => ({
  productId,
  title: productId,
  cost: 100,
  conversionValue: 500,
  conversions: 1,
  clicks: 20,
  impressions: 200,
  catalogEligible: true,
  sourceLabel,
  ...overrides,
});

const approvedInput = (overrides: Partial<GoogleAdsReportV2Input> = {}): GoogleAdsReportV2Input => ({
  currencyCode: "RON",
  minimumRoasTarget: 4,
  maximumCpaTarget: 200,
  periods: {
    selected: { range, spend: 14_950, salesVolume: 44_850, numberOfSales: 31 },
    previous: {
      range: { from: "2026-07-01", to: "2026-07-31" },
      spend: 12_000,
      salesVolume: 52_000,
      numberOfSales: 40,
    },
    previousYear: null,
  },
  products: [
    reportProduct("loss-with-sales", "LOSS_MAKER", {
      cost: 5_400,
      conversionValue: 9_800,
      conversions: 2,
      clicks: 120,
    }),
    reportProduct("loss-without-sales", "LOSS_MAKER", {
      cost: 5_460,
      conversionValue: 0,
      conversions: 0,
      clicks: 10,
    }),
    reportProduct("opportunity", "UNDERPROMOTED_POTENTIAL", {
      cost: 1_115,
      conversionValue: 7_860,
      conversions: 3,
      clicks: 30,
    }),
    reportProduct("not-promoted", "NOT_PROMOTED", {
      cost: 0,
      conversionValue: 0,
      conversions: 0,
      clicks: 2,
    }),
    reportProduct("performer", "PERFORMER", {
      cost: 1_000,
      conversionValue: 5_000,
      conversions: 10,
      clicks: 100,
    }),
    reportProduct("contradictory-opportunity", "UNDERPROMOTED_POTENTIAL", {
      cost: 100,
      conversionValue: 0,
      conversions: 0,
      clicks: 1,
    }),
    reportProduct("legacy-insufficient", "INSUFFICIENT_DATA", {
      cost: 0,
      conversionValue: 0,
      conversions: 0,
      clicks: 0,
    }),
    reportProduct("missing-label", undefined, {
      cost: 200,
      conversionValue: 0,
      conversions: 0,
      clicks: 0,
    }),
  ],
  productPopulationStatus: "PARTIAL",
  ...overrides,
});

describe("Google Ads V2 core formulas", () => {
  it("keeps exact raw period and product results while rounding only display amounts", () => {
    expect(periodResult({ spend: 14_950, salesVolume: 44_850, numberOfSales: 31 }, 4))
      .toMatchObject({ profitOrLoss: -3_737.5, displayAmount: -3_738 });
    expect(productLoss({ spend: 5_400, salesVolume: 9_800 }, 4)).toBe(2_950);
  });

  it("uses spend-weighted opportunity ROAS for the missed-sales simulation", () => {
    expect(missedSalesVolume({
      lossProductSpend: 10_860,
      opportunitySpend: 1_115,
      opportunitySalesVolume: 7_860,
    })).toBeCloseTo(76_555.70, 2);
  });

  it("returns unavailable values instead of zero for absent denominators or targets", () => {
    expect(periodResult({ spend: 100, salesVolume: 0, numberOfSales: 0 }, null)).toMatchObject({
      roas: 0,
      cpa: null,
      profitOrLoss: null,
      displayAmount: null,
    });
    expect(periodResult({ spend: 0, salesVolume: 0, numberOfSales: 0 }, 4).roas).toBeNull();
    expect(productLoss({ spend: 100, salesVolume: 0 }, null)).toBeNull();
    expect(missedSalesVolume({
      lossProductSpend: 100,
      opportunitySpend: 0,
      opportunitySalesVolume: 0,
    })).toBeNull();
  });
});

describe("Google Ads V2 report view model", () => {
  it("builds period rows, target states, and honest missing-comparison states", () => {
    const report = buildGoogleAdsReportV2(approvedInput());

    expect(report.periods.selected).toMatchObject({
      status: "AVAILABLE",
      budget: { status: "AVAILABLE", value: 14_950 },
      salesVolume: { status: "AVAILABLE", value: 44_850 },
      numberOfSales: { status: "AVAILABLE", value: 31 },
      roas: { status: "AVAILABLE", value: 3 },
      profitOrLoss: {
        status: "AVAILABLE",
        value: { raw: -3_737.5, displayAmount: -3_738, outcome: "LOSS" },
      },
    });
    expect(report.periods.previous.status).toBe("AVAILABLE");
    expect(report.periods.previousYear).toEqual({
      status: "UNAVAILABLE",
      key: "PREVIOUS_YEAR",
      reason: "Comparison period data is unavailable",
    });
    expect(report.targets).toMatchObject({
      currentRoas: { status: "AVAILABLE", value: 3 },
      minimumRoas: { status: "AVAILABLE", value: 4 },
      currentCpa: { status: "AVAILABLE" },
      maximumCpa: { status: "AVAILABLE", value: 200 },
    });
    expect(report.accountHeadline).toContain("sub pragul minim");
  });

  it("uses the account population for clicks per sale and keeps exactly four exclusive groups", () => {
    const report = buildGoogleAdsReportV2(approvedInput());
    const allRows = report.groups.flatMap((group) => group.rows);

    expect(report.groups.map((group) => group.key)).toEqual([
      "LOSS_MAKER",
      "NOT_PROMOTED",
      "UNDERPROMOTED_POTENTIAL",
      "PERFORMER",
    ]);
    expect(report.averageClicksPerSale).toEqual({ status: "AVAILABLE", value: 263 / 15 });
    expect(allRows).toHaveLength(8);
    expect(new Set(allRows.map((row) => row.productId)).size).toBe(8);
    expect(report.productPopulationStatus).toBe("PARTIAL");
    expect(report.groups.every((group) => group.totalScope === "PARTIAL")).toBe(true);
  });

  it("quarantines contradictory, legacy, and missing labels without adding them to business totals", () => {
    const report = buildGoogleAdsReportV2(approvedInput());
    const opportunity = report.groups.find((group) => group.key === "UNDERPROMOTED_POTENTIAL")!;
    const loss = report.groups.find((group) => group.key === "LOSS_MAKER")!;

    expect(opportunity.validRows.map((row) => row.productId)).toEqual(["opportunity"]);
    expect(opportunity.quarantinedRows).toMatchObject([
      { productId: "contradictory-opportunity", classificationText: "Clasificare indisponibilă" },
    ]);
    expect(loss.validRows.map((row) => row.productId)).toEqual([
      "loss-with-sales",
      "loss-without-sales",
    ]);
    expect(loss.totals).toMatchObject({
      productCount: { status: "AVAILABLE", value: 2 },
      spend: { status: "AVAILABLE", value: 10_860 },
      productLoss: { status: "AVAILABLE", value: 8_410 },
    });
    expect(report.classificationDiagnostics).toHaveLength(3);
    expect(report.classificationDiagnostics.map((item) => item.productId).sort()).toEqual([
      "contradictory-opportunity",
      "legacy-insufficient",
      "missing-label",
    ]);
  });

  it("validates all four source-label directions", () => {
    const products = [
      reportProduct("valid-opportunity", "UNDERPROMOTED_POTENTIAL", { cost: 100, conversionValue: 500, conversions: 1 }),
      reportProduct("invalid-opportunity-sales", "UNDERPROMOTED_POTENTIAL", { cost: 100, conversionValue: 500, conversions: 0 }),
      reportProduct("invalid-opportunity-roas", "UNDERPROMOTED_POTENTIAL", { cost: 100, conversionValue: 399, conversions: 1 }),
      reportProduct("valid-not-promoted", "NOT_PROMOTED", { cost: 0, conversionValue: 0, conversions: 0, clicks: 1 }),
      reportProduct("invalid-not-promoted-sales", "NOT_PROMOTED", { conversions: 1 }),
      reportProduct("invalid-not-promoted-traffic", "NOT_PROMOTED", { cost: 0, conversionValue: 0, conversions: 0, clicks: 500 }),
      reportProduct("valid-loss", "LOSS_MAKER", { cost: 100, conversionValue: 100, conversions: 1 }),
      reportProduct("invalid-loss-spend", "LOSS_MAKER", { cost: 0, conversionValue: 0, conversions: 0 }),
      reportProduct("invalid-loss-result", "LOSS_MAKER", { cost: 100, conversionValue: 500, conversions: 1 }),
      reportProduct("valid-performer", "PERFORMER", { cost: 100, conversionValue: 500, conversions: 1 }),
      reportProduct("invalid-performer-result", "PERFORMER", { cost: 100, conversionValue: 100, conversions: 1 }),
      reportProduct("invalid-performer-evidence", "PERFORMER", { cost: 0, conversionValue: 0, conversions: 0 }),
    ];
    const report = buildGoogleAdsReportV2(approvedInput({ products, productPopulationStatus: "COMPLETE" }));

    expect(report.groups.flatMap((group) => group.validRows).map((row) => row.productId).sort()).toEqual([
      "valid-loss",
      "valid-not-promoted",
      "valid-opportunity",
      "valid-performer",
    ]);
    expect(report.classificationDiagnostics).toHaveLength(8);
  });

  it("makes conclusion values the exact corresponding tab-total objects", () => {
    const report = buildGoogleAdsReportV2(approvedInput());
    const byKey = Object.fromEntries(report.groups.map((group) => [group.key, group]));

    expect(report.conclusions[0].groupKey).toBe("LOSS_MAKER");
    expect(report.conclusions[0].metric).toBe(byKey.LOSS_MAKER.totals.productLoss);
    expect(report.conclusions[1].groupKey).toBe("UNDERPROMOTED_POTENTIAL");
    expect(report.conclusions[1].metric).toBe(byKey.UNDERPROMOTED_POTENTIAL.totals.missedSalesVolume);
    expect(report.conclusions[2].groupKey).toBe("NOT_PROMOTED");
    expect(report.conclusions[2].metric).toBe(byKey.NOT_PROMOTED.totals.productCount);
    expect(report.conclusions[1].metric).toEqual({
      status: "AVAILABLE",
      value: expect.closeTo(76_555.70, 2),
    });
  });

  it("keeps zero-product groups and labels their empty totals as measured zero", () => {
    const report = buildGoogleAdsReportV2(approvedInput({ products: [], productPopulationStatus: "COMPLETE" }));

    expect(report.groups).toHaveLength(4);
    expect(report.groups.every((group) => group.emptyState.length > 0)).toBe(true);
    expect(report.groups.every((group) => (
      group.totals.productCount.status === "AVAILABLE"
      && group.totals.productCount.value === 0
    ))).toBe(true);
    expect(report.averageClicksPerSale.status).toBe("UNAVAILABLE");
  });

  it("preserves measured values while withholding target-dependent claims", () => {
    const report = buildGoogleAdsReportV2(approvedInput({
      minimumRoasTarget: null,
      maximumCpaTarget: null,
      products: [reportProduct("measured", "LOSS_MAKER", { cost: 100, conversionValue: 0, conversions: 0 })],
    }));

    expect(report.periods.selected).toMatchObject({
      budget: { status: "AVAILABLE", value: 14_950 },
      salesVolume: { status: "AVAILABLE", value: 44_850 },
      numberOfSales: { status: "AVAILABLE", value: 31 },
      profitOrLoss: { status: "UNAVAILABLE" },
    });
    expect(report.targets.minimumRoas.status).toBe("UNAVAILABLE");
    expect(report.targets.maximumCpa.status).toBe("UNAVAILABLE");
    expect(report.accountHeadline).toContain("indisponibil");
    expect(report.classificationDiagnostics).toHaveLength(1);
  });
});
