// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ReportingDashboard from "./ReportingDashboard";

const snapshot = {
  website: "https://store.example", accountName: "Example Store", averageOrderValue: 300, goodsCost: 180,
  breakEvenCpa: 100, breakEvenRoas: 5,
  current: { spend: 500, revenue: 1500, orders: 5, cpa: 100, roas: 3, clicks: 100, impressions: 5000 },
  optimized: { spend: 500, revenue: 3000, orders: 10, cpa: 50, roas: 6 }, losses: [], opportunities: [],
  reportProducts: [
    { productId: "bad", title: "Budget burner", cost: 400, conversionValue: 400, conversions: 1, clicks: 80, impressions: 3000, catalogEligible: true },
    { productId: "good", title: "Growth product", cost: 100, conversionValue: 1100, conversions: 4, clicks: 20, impressions: 2000, catalogEligible: true },
  ],
};

it("renders live account KPIs and filters the complete product table", () => {
  render(<ReportingDashboard snapshot={snapshot} updatedAt="2026-08-27T08:00:00Z" />);
  expect(screen.getByText("Below break-even")).toBeTruthy();
  expect(screen.getByText("100")).toBeTruthy();
  expect(screen.getByText("Budget burner")).toBeTruthy();
  expect(screen.getByText("Growth product")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "Growth" } });
  expect(screen.queryByText("Budget burner")).toBeNull();
  expect(screen.getByText("Growth product")).toBeTruthy();
});
