import { describe, expect, it } from "vitest";
import { calculateBreakEven } from "./gads-financials";

describe("break-even economics", () => {
  it("deducts goods and the fixed operating-cost estimate from one average order", () => {
    expect(calculateBreakEven({ averageOrderValue: 500, goodsCost: 250 })).toEqual({
      averageOrderValue: 500,
      goodsCost: 250,
      grossMarginPct: 50,
      operatingCostPct: 20,
      operatingCost: 100,
      breakEvenCpa: 150,
      breakEvenRoas: 500 / 150,
    });
  });

  it("refuses economics that leave no money available for advertising", () => {
    expect(() => calculateBreakEven({ averageOrderValue: 500, goodsCost: 400 }))
      .toThrow("No contribution remains available for advertising");
  });

  it.each([
    { averageOrderValue: 0, goodsCost: 0 },
    { averageOrderValue: 500, goodsCost: -1 },
    { averageOrderValue: 500, goodsCost: 501 },
    { averageOrderValue: Number.NaN, goodsCost: 100 },
  ])("rejects invalid financial input $averageOrderValue / $goodsCost", (input) => {
    expect(() => calculateBreakEven(input)).toThrow(RangeError);
  });
});
