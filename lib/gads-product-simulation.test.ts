import { describe, expect, it } from "vitest";
import { DIMINISHING_RETURN_RATE, analyzeProducts, simulateOptimizedBudget } from "./gads-product-simulation";

const products = [
  { productId: "loss-high", title: "High-cost loss", cost: 1200, conversionValue: 1200, conversions: 2, clicks: 500, impressions: 5000 },
  { productId: "loss-low", title: "Low-cost loss", cost: 600, conversionValue: 300, conversions: 1, clicks: 250, impressions: 2500 },
  { productId: "opportunity-large", title: "Large opportunity", cost: 240, conversionValue: 2400, conversions: 8, clicks: 120, impressions: 1200 },
  { productId: "opportunity-small", title: "Small opportunity", cost: 120, conversionValue: 960, conversions: 4, clicks: 60, impressions: 600 },
  { productId: "accident", title: "Single accidental order", cost: 12, conversionValue: 600, conversions: 1, clicks: 3, impressions: 30 },
];

describe("product profitability analysis", () => {
  it("orders losses by descending measured cost and calculates money at risk", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    expect(analysis.losses.map((row) => row.productId)).toEqual(["loss-high", "loss-low"]);
    expect(analysis.losses[0]).toMatchObject({ monthlyCost: 100, monthlyRevenue: 100, roas: 1 });
    expect(analysis.losses[0].monthlyMoneyAtRisk).toBe(80);
  });

  it("orders qualified underpromoted products by estimated profitable sales opportunity", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    expect(analysis.opportunities.map((row) => row.productId)).toEqual(["opportunity-large", "opportunity-small"]);
    expect(analysis.opportunities.some((row) => row.productId === "accident")).toBe(false);
  });

  it("limits each list to the top twenty products", () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      productId: `loss-${index}`,
      title: `Loss ${index}`,
      cost: (index + 1) * 120,
      conversionValue: 0,
      conversions: 0,
      clicks: 10,
      impressions: 100,
    }));
    expect(analyzeProducts(many, { breakEvenRoas: 5, months: 12 }).losses).toHaveLength(20);
  });
});

describe("controlled optimized budget simulation", () => {
  it("uses a five-percent diminishing-return rate for each additional product-spend multiple", () => {
    const singleProduct = [{
      productId: "scalable",
      title: "Scalable product",
      cost: 1200,
      conversionValue: 12000,
      conversions: 24,
      clicks: 600,
      impressions: 6000,
    }];
    const analysis = analyzeProducts(singleProduct, { breakEvenRoas: 5, months: 12 });
    const result = simulateOptimizedBudget(analysis, 200);

    expect(DIMINISHING_RETURN_RATE).toBe(0.05);
    expect(result.products[0].simulatedRoas).toBeCloseTo(12.5 / 1.05, 6);
  });

  it("returns zero sales and orders when the slider reaches zero", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    const result = simulateOptimizedBudget(analysis, 0);
    expect(result).toMatchObject({ budget: 0, expectedRevenue: 0, expectedOrders: 0, expectedRoas: null });
    expect(result.products.every((row) => row.simulatedCost === 0 && row.simulatedRevenue === 0)).toBe(true);
  });

  it("applies the CSS assumption and directs most spend to qualified profitable products", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    const result = simulateOptimizedBudget(analysis, analysis.currentMonthlySpend);
    const profitableSpend = result.products.filter((row) => row.strategy === "SCALE").reduce((sum, row) => sum + row.simulatedCost, 0);
    const cappedSpend = result.products.filter((row) => row.strategy === "CAP").reduce((sum, row) => sum + row.simulatedCost, 0);
    expect(result.cssCpcReductionPct).toBe(20);
    expect(profitableSpend).toBeGreaterThan(cappedSpend);
  });

  it("keeps loss-product spend below an absolute cap as total budget grows", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    const low = simulateOptimizedBudget(analysis, analysis.currentMonthlySpend);
    const high = simulateOptimizedBudget(analysis, analysis.currentMonthlySpend * 4);
    const capped = (result: typeof low) => result.products.filter((row) => row.strategy === "CAP").reduce((sum, row) => sum + row.simulatedCost, 0);
    expect(capped(high)).toBeLessThanOrEqual(analysis.lossProductMonthlyCap);
    expect(capped(high) / high.budget).toBeLessThanOrEqual(capped(low) / low.budget);
  });

  it("uses diminishing returns and never exposes a budget above the break-even limit", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    const midpoint = simulateOptimizedBudget(analysis, analysis.economicBudgetLimit / 2);
    const limit = simulateOptimizedBudget(analysis, analysis.economicBudgetLimit);
    expect(limit.expectedRevenue / Math.max(limit.budget, 1)).toBeLessThan(midpoint.expectedRevenue / Math.max(midpoint.budget, 1));
    expect(limit.expectedRoas).toBeGreaterThanOrEqual(5);
    expect(simulateOptimizedBudget(analysis, analysis.economicBudgetLimit * 2).budget).toBe(analysis.economicBudgetLimit);
  });

  it("returns a zero economic limit when no qualified profitable product can receive budget", () => {
    const analysis = analyzeProducts(products.filter((product) => product.productId.startsWith("loss")), {
      breakEvenRoas: 5,
      months: 12,
    });
    const result = simulateOptimizedBudget(analysis, analysis.currentMonthlySpend);
    expect(analysis.economicBudgetLimit).toBe(0);
    expect(result).toMatchObject({ budget: 0, expectedRevenue: 0, expectedOrders: 0, expectedRoas: null });
  });

  it("never scales an individual product below break-even at the economic limit", () => {
    const analysis = analyzeProducts(products, { breakEvenRoas: 5, months: 12 });
    const result = simulateOptimizedBudget(analysis, analysis.economicBudgetLimit);
    const scaled = result.products.filter((row) => row.strategy === "SCALE" && row.simulatedCost > 0);
    expect(scaled.length).toBeGreaterThan(0);
    expect(scaled.every((row) => (row.simulatedRoas ?? 0) >= analysis.breakEvenRoas)).toBe(true);
  });
});
