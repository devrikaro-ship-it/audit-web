import { describe, expect, it } from "vitest";
import { buildProducts, type PerfRow } from "./gads-intake";
import { openReportSnapshot, sealReportSnapshot, type GadsReportSnapshot } from "./gads-report-delivery";

const rows: PerfRow[] = [
  { itemId: "shared", title: "Shared product", costMicros: 1_200_000, conversionsValue: 8, conversions: 0.5, clicks: 7, impressions: 90 },
  { itemId: "neighbor", title: "Neighbor product", costMicros: 2_000_000, conversionsValue: 9, conversions: 1, clicks: 2, impressions: 20 },
  { itemId: "shared", title: "Shared product", costMicros: 800_000, conversionsValue: 4, conversions: 0.25, clicks: 3, impressions: 30 },
];

function signedReport(products: ReturnType<typeof buildProducts>["products"], complete: boolean) {
  const snapshot: GadsReportSnapshot = {
    website: "https://synthetic.invalid", accountName: "Synthetic import control",
    averageOrderValue: 12, goodsCost: 4, breakEvenCpa: 8, breakEvenRoas: 2,
    current: { spend: 4, revenue: 21, orders: 1.75, cpa: 4 / 1.75, roas: 5.25 },
    optimized: { spend: 4, revenue: 21, orders: 1.75, cpa: 4 / 1.75, roas: 5.25 },
    losses: [], opportunities: [],
    reportV2: {
      version: 2, currencyCode: "GBP",
      periods: { selected: { range: { from: "2026-08-01", to: "2026-08-31" }, spend: 4, salesVolume: 21, numberOfSales: 1.75 }, previous: null, previousYear: null },
      products: products.map(product => ({ ...product, catalogEligible: complete })),
      productPopulationStatus: complete ? "COMPLETE" : "PARTIAL", classificationDiagnostics: [],
    },
  };
  return openReportSnapshot(sealReportSnapshot(snapshot));
}

describe("real intake to signed report population", () => {
  it.each([true, false])("conserves split performance metrics and opens the signed report with catalog completeness %s", complete => {
    const input = structuredClone(rows);
    const result = buildProducts(input, complete ? [{ itemId: "catalog-only" }, { itemId: "catalog-only" }] : null);
    expect(result.products.map(product => product.productId)).toEqual(complete ? ["shared", "neighbor", "catalog-only"] : ["shared", "neighbor"]);
    expect(result.products[0]).toMatchObject({ cost: 2, conversionValue: 12, conversions: 0.75, clicks: 10, impressions: 120 });
    expect(result.products.reduce((total, product) => total + product.cost, 0)).toBe(4);
    expect(result.products.reduce((total, product) => total + product.conversionValue, 0)).toBe(21);
    expect(result.products.reduce((total, product) => total + product.conversions, 0)).toBe(1.75);
    expect(input).toEqual(rows);
    expect(signedReport(result.products, complete)?.reportV2?.products).toHaveLength(complete ? 3 : 2);
  });

  it("retains strict refusal of an unnormalized duplicate signed population", () => {
    const unique = buildProducts([rows[0]], []).products;
    expect(signedReport([...unique, ...unique], true)).toBeNull();
    expect(signedReport(unique, true)).not.toBeNull();
  });
});
