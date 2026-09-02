import { describe, expect, it } from "vitest";
import { classifyReportProducts } from "./gads-product-classification";

const product = (overrides: Partial<Parameters<typeof classifyReportProducts>[0][number]> = {}) => ({
  productId: "p1", title: "Product", cost: 500, conversionValue: 3000, conversions: 10,
  clicks: 200, impressions: 2000, catalogEligible: true, ...overrides,
});

describe("product reporting classifications", () => {
  it("classifies every measured product with one closed label", () => {
    const rows = classifyReportProducts([
      product({ productId: "loss", conversionValue: 500 }),
      product({ productId: "hidden", cost: 0, conversionValue: 0, conversions: 0, clicks: 0, impressions: 0 }),
      product({ productId: "potential", clicks: 5, conversions: 1, cost: 20, conversionValue: 500 }),
      product({ productId: "winner" }),
      product({ productId: "unknown", catalogEligible: false, cost: 0, conversionValue: 0, conversions: 0, clicks: 0, impressions: 0 }),
    ], 5);

    expect(Object.fromEntries(rows.map((row) => [row.productId, row.label]))).toEqual({
      loss: "LOSS_MAKER", hidden: "NOT_PROMOTED", potential: "UNDERPROMOTED_POTENTIAL",
      winner: "PERFORMER", unknown: "INSUFFICIENT_DATA",
    });
    expect(rows.find((row) => row.productId === "winner")?.clicksPerSale).toBe(20);
  });

  it("quantifies measured risk and estimated opportunity without mixing their sources", () => {
    const rows = classifyReportProducts([
      product({ productId: "loss", cost: 500, conversionValue: 500, conversions: 1 }),
      product({ productId: "benchmark", cost: 500, conversionValue: 3000, conversions: 10, clicks: 200 }),
      product({ productId: "potential", cost: 20, conversionValue: 500, conversions: 1, clicks: 5 }),
    ], 5);

    expect(rows.find((row) => row.productId === "loss")).toMatchObject({
      financialImpact: 400,
      financialImpactKind: "MEASURED_RISK",
    });
    expect(rows.find((row) => row.productId === "potential")).toMatchObject({
      financialImpact: 375,
      financialImpactKind: "ESTIMATED_OPPORTUNITY",
    });
  });

  it("uses the full evidence window when displayed values are period averages", () => {
    expect(classifyReportProducts([
      product({ productId: "benchmark", impressions: 100, clicks: 20, conversions: 1, cost: 50, conversionValue: 500 }),
      product({ productId: "potential", impressions: 100, clicks: 5, conversions: 0.5, cost: 20, conversionValue: 250 }),
    ], 5, 12).find((row) => row.productId === "potential")?.label).toBe("UNDERPROMOTED_POTENTIAL");
  });
});
