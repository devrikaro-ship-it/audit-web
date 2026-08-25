// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProducts } from "@/lib/gads-product-simulation";
import ProfitabilitySimulator from "./ProfitabilitySimulator";

const analysis = analyzeProducts([
  { productId: "loss", title: "Loss product", cost: 1200, conversionValue: 600, conversions: 2, clicks: 500, impressions: 5000 },
  { productId: "winner", title: "Profitable product", cost: 240, conversionValue: 2400, conversions: 8, clicks: 120, impressions: 1200 },
], { breakEvenRoas: 5, months: 12 });
const snapshot = {
  website: "https://example.com",
  accountName: "Example",
  averageOrderValue: 300,
  goodsCost: 180,
  breakEvenCpa: 60,
  breakEvenRoas: 5,
  current: { spend: 120, revenue: 600, orders: 2, cpa: 60, roas: 5 },
  optimized: { spend: 120, revenue: 900, orders: 3, cpa: 40, roas: 7.5 },
  losses: [],
  opportunities: [],
};

afterEach(cleanup);

describe("profitability report simulator", () => {
  it("shows measured before data and a structurally matching simulated after table", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    expect(screen.getAllByText("Measured from Google Ads")).toHaveLength(2);
    expect(screen.getByText("Future simulation")).toBeTruthy();
    expect(screen.getAllByText("Product").length).toBeGreaterThanOrEqual(3);
    for (const heading of ["Clicks", "Cost", "Orders", "CPA", "Sales", "ROAS"]) {
      expect(screen.getAllByText(heading).length).toBeGreaterThanOrEqual(3);
    }
    expect(screen.queryByText("Profit after advertising")).toBeNull();
  });

  it("starts at measured monthly spend and updates the after table to zero", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    const slider = screen.getByRole("slider", { name: "Simulated monthly budget" }) as HTMLInputElement;
    expect(Number(slider.value)).toBe(Math.round(analysis.currentMonthlySpend));
    expect(slider.min).toBe("0");
    expect(Number(slider.max)).toBe(analysis.economicBudgetLimit);

    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByTestId("expected-revenue").textContent).toContain("0 RON");
    expect(screen.getByTestId("expected-orders").textContent).toContain("0");
    expect(screen.getByTestId("expected-roas").textContent).toContain("—");
  });

  it("explains the exact three-step strategy and the CSS assumption", () => {
    render(<ProfitabilitySimulator analysis={analysis} averageOrderValue={300} snapshot={snapshot} />);
    expect(screen.getByText("1. Stop the loss")).toBeTruthy();
    expect(screen.getByText("2. Move the budget")).toBeTruthy();
    expect(screen.getByText("3. Grow under control")).toBeTruthy();
    expect(screen.getByText(/estimated 20% CPC reduction/i)).toBeTruthy();
  });
});
