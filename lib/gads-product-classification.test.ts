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
});
