import { beforeEach, describe, expect, it } from "vitest";
import {
  normalizeReportProductsToPeriod,
  openReportSnapshot,
  renderReportHtml,
  sealReportSnapshot,
  type GadsReportSnapshot,
  type GadsReportSnapshotV2,
} from "./gads-report-delivery";

const snapshot: GadsReportSnapshot = {
  website: "https://fitn4ss.ro/",
  accountName: "Fitn4ss",
  averageOrderValue: 500,
  goodsCost: 300,
  breakEvenCpa: 100,
  breakEvenRoas: 5,
  current: { spend: 1000, revenue: 3200, orders: 8, cpa: 125, roas: 3.2 },
  optimized: { spend: 1000, revenue: 5800, orders: 12, cpa: 83.33, roas: 5.8 },
  losses: [{ productId: "loss", title: "Loss product", cost: 700, revenue: 700, orders: 1, cpa: 700, roas: 1, amount: 560 }],
  opportunities: [{ productId: "win", title: "Winning product", cost: 100, revenue: 1200, orders: 3, cpa: 33.33, roas: 12, amount: 1680 }],
  campaigns: [{ name: "PMax All Products", channel: "PERFORMANCE_MAX", spend: 900, revenue: 2700, roas: 3, status: "ENABLED" }],
};

const reportV2: GadsReportSnapshotV2 = {
  version: 2,
  currencyCode: "EUR",
  periods: {
    selected: {
      range: { from: "2026-08-01", to: "2026-08-31" },
      spend: 1_000,
      salesVolume: 3_200,
      numberOfSales: 8,
    },
    previous: {
      range: { from: "2026-07-01", to: "2026-07-31" },
      spend: 900,
      salesVolume: 3_000,
      numberOfSales: 7,
    },
    previousYear: null,
  },
  products: [{
    productId: "loss",
    title: "Loss product",
    cost: 700,
    conversionValue: 700,
    conversions: 1,
    clicks: 80,
    impressions: 2_000,
    catalogEligible: true,
    sourceLabel: "LOSS_MAKER",
  }],
  productPopulationStatus: "COMPLETE",
  classificationDiagnostics: [],
};

describe("stored Google Ads report delivery", () => {
  beforeEach(() => { process.env.GADS_REPORT_SIGNING_SECRET = "test-report-secret"; });

  it("opens an unchanged signed snapshot and refuses modified content", () => {
    const signed = sealReportSnapshot(snapshot);
    expect(openReportSnapshot(signed)).toEqual(snapshot);
    const [payload, signature] = signed.split(".");
    const changed = Buffer.from(JSON.stringify({ ...snapshot, breakEvenRoas: 1 })).toString("base64url");
    expect(openReportSnapshot(`${changed}.${signature}`)).toBeNull();
    expect(openReportSnapshot(`${payload}.invalid`)).toBeNull();
  });

  it("keeps old reports compatible and refuses malformed campaign data", () => {
    const legacySnapshot = { ...snapshot };
    delete legacySnapshot.campaigns;
    expect(openReportSnapshot(sealReportSnapshot(legacySnapshot))).toEqual(legacySnapshot);

    const malformed = { ...snapshot, campaigns: [{ ...snapshot.campaigns![0], spend: "900" }] };
    expect(openReportSnapshot(sealReportSnapshot(malformed as unknown as GadsReportSnapshot))).toBeNull();
  });

  it("round-trips complete account traffic and product reporting rows", () => {
    const expanded = {
      ...snapshot,
      evidenceMonths: 12,
      current: { ...snapshot.current, clicks: 420, impressions: 9000 },
      reportProducts: [{ productId: "all", title: "All product", cost: 120, conversionValue: 600, conversions: 2, clicks: 50, impressions: 1000, catalogEligible: true }],
    };
    expect(openReportSnapshot(sealReportSnapshot(expanded))).toEqual(expanded);
  });

  it("round-trips a complete V2 payload without changing the V1 snapshot shape", () => {
    const expanded = { ...snapshot, reportV2 };
    expect(openReportSnapshot(sealReportSnapshot(expanded))).toEqual(expanded);

    const legacySnapshot = { ...snapshot };
    expect(openReportSnapshot(sealReportSnapshot(legacySnapshot))).toEqual(legacySnapshot);
    expect(legacySnapshot).not.toHaveProperty("reportV2");
  });

  it("refuses malformed V2 ranges, currency, totals, duplicate products, and oversized populations", () => {
    const invalidDateOrder = structuredClone(reportV2);
    invalidDateOrder.periods.selected.range = { from: "2026-09-01", to: "2026-08-31" };

    const invalidCurrency = structuredClone(reportV2);
    invalidCurrency.currencyCode = "eur";

    const nonFiniteTotals = structuredClone(reportV2);
    nonFiniteTotals.periods.selected.spend = Number.NaN;

    const duplicateProducts = structuredClone(reportV2);
    duplicateProducts.products = [
      duplicateProducts.products[0],
      { ...duplicateProducts.products[0] },
    ];

    const oversizedPopulation = structuredClone(reportV2);
    oversizedPopulation.products = Array.from({ length: 10_001 }, (_, index) => ({
      ...reportV2.products[0],
      productId: `product-${index}`,
    }));

    for (const invalid of [
      invalidDateOrder,
      invalidCurrency,
      nonFiniteTotals,
      duplicateProducts,
      oversizedPopulation,
    ]) {
      expect(openReportSnapshot(sealReportSnapshot({ ...snapshot, reportV2: invalid }))).toBeNull();
    }
  });

  it("rejects signatures after either V1 or V2 payload bytes change", () => {
    const expanded = { ...snapshot, reportV2 };
    const signed = sealReportSnapshot(expanded);
    const signature = signed.slice(signed.lastIndexOf(".") + 1);

    const changedV1 = Buffer.from(JSON.stringify({ ...expanded, breakEvenRoas: 1 })).toString("base64url");
    const changedV2 = Buffer.from(JSON.stringify({
      ...expanded,
      reportV2: { ...reportV2, currencyCode: "USD" },
    })).toString("base64url");

    expect(openReportSnapshot(`${changedV1}.${signature}`)).toBeNull();
    expect(openReportSnapshot(`${changedV2}.${signature}`)).toBeNull();
  });

  it("normalizes every product metric to the same reporting period", () => {
    expect(normalizeReportProductsToPeriod([{
      productId: "all", title: "All product", cost: 1200, conversionValue: 6000,
      conversions: 24, clicks: 600, impressions: 12000, catalogEligible: true,
    }], 12)).toEqual([{
      productId: "all", title: "All product", cost: 100, conversionValue: 500,
      conversions: 2, clicks: 50, impressions: 1000, catalogEligible: true,
    }]);
  });

  it("renders measured and simulated values with their status labels", () => {
    const html = renderReportHtml(snapshot);
    expect(html).toContain("Măsurat din Google Ads");
    expect(html).toContain("Simulare viitoare, nu promisiune");
    expect(html).toContain("Loss product");
    expect(html).toContain("Winning product");
    expect(html).toContain("reducere estimată de 20% a CPC-ului prin CSS");
    expect(html).toContain("Audit de profitabilitate Google Ads");
    expect(html).toContain("Produse care îți consumă bugetul");
    expect(html).toContain("Produse profitabile care primesc prea puțin trafic");
    expect(html).not.toContain("Profit after advertising");
    expect(html).not.toContain("83.33 RON");
    expect(html).not.toContain("3.20×");
    expect(html).not.toContain(">8.0<");
    expect(html).toContain("83 RON");
    expect(html).toContain("6×");
    expect(html).toContain("Cum sunt organizate campaniile acum");
    expect(html).toContain("PMax All Products");
    expect(html).toContain("Cum trebuie organizat contul");
    expect(html).toContain("Search · protecție brand");
    expect(html).toContain("Performance Max · produse profitabile");
    expect(html).toContain("Standard Shopping · control");
  });
});
