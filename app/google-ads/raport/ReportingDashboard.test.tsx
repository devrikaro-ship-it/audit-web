// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
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

const analysis = {
  breakEvenRoas: 5,
  months: 12,
  currentMonthlySpend: 500,
  lossProductMonthlyCap: 40,
  economicBudgetLimit: 1000,
  losses: [],
  opportunities: [],
};

it("renders live account KPIs and filters the complete product table", () => {
  render(<ReportingDashboard snapshot={snapshot} analysis={analysis} updatedAt="2026-08-27T08:00:00Z" />);
  expect(screen.getByText("Below break-even")).toBeTruthy();
  expect(screen.getByText("100")).toBeTruthy();
  expect(screen.getByText("Budget burner")).toBeTruthy();
  expect(screen.getByText("Growth product")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "Growth" } });
  expect(screen.queryByText("Budget burner")).toBeNull();
  expect(screen.getByText("Growth product")).toBeTruthy();
});

it("keeps the simulated budget tool below the measured dashboard", () => {
  const { container } = render(<ReportingDashboard snapshot={snapshot} analysis={analysis} />);
  const view = within(container);

  const measuredTable = view.getByRole("region", { name: "All product performance" });
  const simulator = view.getByRole("region", { name: "Simularea alocării bugetului" });

  expect(measuredTable.compareDocumentPosition(simulator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(view.getAllByText("Simulare viitoare", { selector: ".source.simulated" }).length).toBeGreaterThan(0);
});

it("shows product IDs and labels financial impact by evidence type", () => {
  const { container } = render(<ReportingDashboard snapshot={snapshot} analysis={analysis} />);
  const table = within(container).getByRole("region", { name: "All product performance" });

  expect(within(table).getByRole("columnheader", { name: "Item ID" })).toBeTruthy();
  expect(within(table).getByRole("columnheader", { name: "Financial impact" })).toBeTruthy();
  expect(within(table).getByText("Measured risk")).toBeTruthy();
});

it("starts in action priority order and sorts by every numeric table metric", () => {
  const { container } = render(<ReportingDashboard snapshot={snapshot} analysis={analysis} />);
  const view = within(container);
  const table = view.getByRole("region", { name: "All product performance" });
  const sort = view.getByLabelText("Sort products");

  expect(within(table).getAllByRole("row")[1].textContent).toContain("Budget burner");
  expect(within(sort).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
    "priority", "impressions", "clicks", "cost", "conversions", "conversionRate", "clicksPerSale",
    "conversionValue", "cpa", "roas", "profitabilityGap", "financialImpact",
  ]);

  fireEvent.change(sort, { target: { value: "conversions" } });
  expect(within(table).getAllByRole("row")[1].textContent).toContain("Growth product");
});

it("offers only signed reporting periods and preserves the selected report", () => {
  const { container } = render(<ReportingDashboard
    snapshot={snapshot}
    analysis={analysis}
    periodLabel="August 2026"
    periodSelector={{
      action: "/google-ads/portal/safe-token",
      selected: "august",
      options: [
        { value: "august", label: "August 2026" },
        { value: "july", label: "July 2026" },
      ],
    }}
  />);
  const view = within(container);

  expect(view.getAllByText(/August 2026/).length).toBeGreaterThan(0);
  expect((view.getByLabelText("Reporting period") as HTMLSelectElement).value).toBe("august");
  expect(view.getByRole("button", { name: "Apply period" })).toBeTruthy();
  expect(view.queryByRole("option", { name: "June 2026" })).toBeNull();
});

it("proves every KPI, label filter, empty state, and scroll-table semantics", () => {
  const { container } = render(<ReportingDashboard snapshot={snapshot} analysis={analysis} />);
  const view = within(container);

  for (const value of ["500 RON", "1.500 RON", "100", "5", "5.00%", "3.00×"]) {
    expect(view.getAllByText(value).length).toBeGreaterThan(0);
  }
  const table = view.getByRole("region", { name: "All product performance" });
  expect(table.getAttribute("tabindex")).toBe("0");
  expect(within(table).getByRole("columnheader", { name: "Product" })).toBeTruthy();

  fireEvent.change(view.getByLabelText("Filter products"), { target: { value: "PERFORMER" } });
  expect(within(table).queryByText("Budget burner")).toBeNull();
  expect(within(table).getByText("Growth product")).toBeTruthy();

  fireEvent.change(view.getByLabelText("Search products"), { target: { value: "missing product" } });
  expect(within(table).getByText("No products match these filters.")).toBeTruthy();
});

it("uses a compact KPI grid instead of a horizontal KPI strip on mobile", () => {
  const { container } = render(<ReportingDashboard snapshot={snapshot} analysis={analysis} />);
  expect(container.querySelector("style")?.textContent).toContain(".kpis{grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}");
});
