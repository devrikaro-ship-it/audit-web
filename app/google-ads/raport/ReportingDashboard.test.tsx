// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  buildGoogleAdsReportV2,
  type GoogleAdsReportV2Input,
  type GoogleAdsReportV2ViewModel,
  type ReportProductInputV2,
} from "@/lib/gads-report-metrics";
import { analyzeProducts } from "@/lib/gads-product-simulation";
import ReportingDashboard from "./ReportingDashboard";

afterEach(cleanup);

const product = (
  productId: string,
  sourceLabel: ReportProductInputV2["sourceLabel"],
  overrides: Partial<ReportProductInputV2> = {},
): ReportProductInputV2 => ({
  productId,
  title: productId,
  cost: 100,
  conversionValue: 1_000,
  conversions: 2,
  clicks: 80,
  impressions: 1_000,
  catalogEligible: true,
  sourceLabel,
  ...overrides,
});

const reportInput = (
  overrides: Partial<GoogleAdsReportV2Input> = {},
): GoogleAdsReportV2Input => ({
  currencyCode: "EUR",
  minimumRoasTarget: 5,
  maximumCpaTarget: 75,
  periods: {
    selected: {
      range: { from: "2026-08-01", to: "2026-08-31" },
      spend: 500,
      salesVolume: 1_500,
      numberOfSales: 5,
    },
    previous: {
      range: { from: "2026-07-01", to: "2026-07-31" },
      spend: 400,
      salesVolume: 3_000,
      numberOfSales: 10,
    },
    previousYear: null,
  },
  products: [
    product("loss-product", "LOSS_MAKER", {
      cost: 400,
      conversionValue: 400,
      conversions: 1,
      clicks: 80,
    }),
    product("not-promoted-product", "NOT_PROMOTED", {
      cost: 0,
      conversionValue: 0,
      conversions: 0,
      clicks: 10,
    }),
    product("opportunity-product", "UNDERPROMOTED_POTENTIAL", {
      cost: 100,
      conversionValue: 1_100,
      conversions: 4,
      clicks: 20,
    }),
    product("performer-product", "PERFORMER"),
    product("quarantined-product", "UNDERPROMOTED_POTENTIAL", {
      cost: 10,
      conversionValue: 0,
      conversions: 0,
      clicks: 5,
    }),
  ],
  productPopulationStatus: "COMPLETE",
  ...overrides,
});

const createReport = (
  overrides: Partial<GoogleAdsReportV2Input> = {},
): GoogleAdsReportV2ViewModel => buildGoogleAdsReportV2(reportInput(overrides));

const sourceSnapshot = {
  currencyCode: "EUR",
  evidenceMonths: 12,
  minimumRoasTarget: 5,
  maximumCpaTarget: 75,
  current: {
    spend: 120,
    revenue: 300,
    orders: 10 / 12,
    cpa: 144,
    roas: 2.5,
  },
  optimized: {
    spend: 120,
    revenue: 1_255,
    orders: 4.18,
    cpa: 28.71,
    roas: 10.46,
  },
  productAnalysis: analyzeProducts([
    product("monthly-loss", "LOSS_MAKER", {
      cost: 1_200,
      conversionValue: 1_200,
      conversions: 2,
    }),
    product("monthly-opportunity", "UNDERPROMOTED_POTENTIAL", {
      cost: 240,
      conversionValue: 2_400,
      conversions: 8,
    }),
  ], { breakEvenRoas: 5, months: 12 }),
};

it("adds accessible report tabs and compares the existing model over one explicit monthly period", () => {
  const { container } = render(
    <ReportingDashboard report={createReport()} sourceSnapshot={sourceSnapshot} />,
  );
  const tablist = screen.getByRole("tablist", { name: "Report views" });
  const tabs = within(tablist).getAllByRole("tab");

  expect(tabs.map((tab) => tab.textContent)).toEqual(["Products", "Before & after", "Tracking"]);
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  expect(container.querySelectorAll("[data-report-section]")).toHaveLength(5);

  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
  expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[1]);

  fireEvent.keyDown(tabs[1], { key: "End" });
  expect(tabs[2].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[2]);
  fireEvent.keyDown(tabs[2], { key: "Home" });
  fireEvent.keyDown(tabs[0], { key: "ArrowRight" });

  const panel = screen.getByRole("tabpanel", { name: "Before & after" });
  expect(within(panel).getByText("Monthly equivalent")).toBeTruthy();
  expect(within(panel).getByText(/12 months of evidence/i)).toBeTruthy();
  const table = within(panel).getByRole("table", { name: "Before and after comparison" });
  expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
    "Scenario",
    "Budget",
    "Sales",
    "Orders",
    "CPA",
    "ROAS",
    "Target-based profit / loss",
  ]);
  expect(within(table).getAllByRole("row")[1].textContent).toContain("120 EUR");
  expect(within(table).getAllByRole("row")[1].textContent).toContain("Loss");
  expect(within(table).getAllByRole("row")[2].textContent).toContain("Profit");
  expect(within(panel).getByText(/Minimum ROAS target: 5×/)).toBeTruthy();
  expect(within(panel).getByText(/Maximum CPA target: 75 EUR/)).toBeTruthy();
  expect(within(panel).getByText(/20% CSS CPC reduction/)).toBeTruthy();

  const budget = within(panel).getByRole("slider", { name: "Simulated monthly budget" });
  fireEvent.change(budget, { target: { value: "60" } });
  expect(within(table).getAllByRole("row")[2].textContent).toContain("60 EUR");
  expect(panel.textContent).not.toMatch(/NaN|Infinity/);
});

it("uses the sidebar presentation without changing report views, keyboard controls, or product data", () => {
  const { container } = render(
    <ReportingDashboard report={createReport()} presentation="sidebar" />,
  );
  const root = container.querySelector('[data-report-dashboard="v2"]');
  const tablist = screen.getByRole("tablist", { name: "Report views" });
  const tabs = within(tablist).getAllByRole("tab");

  expect(root?.getAttribute("data-report-presentation")).toBe("sidebar");
  expect(root?.classList.contains("reportV2Sidebar")).toBe(true);
  expect(container.querySelector('[data-scroll-region="products"]')).toBeTruthy();
  expect(container.querySelector("style")?.textContent).toContain(
    ".reportV2Sidebar{display:grid",
  );
  expect(container.querySelector("style")?.textContent).toContain(
    ".reportV2Sidebar .productTableScroll{max-height:22rem",
  );

  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: "End" });
  expect(tabs[2].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[2]);
  expect(screen.getByRole("tabpanel", { name: "Tracking" })).toBeTruthy();

  fireEvent.keyDown(tabs[2], { key: "Home" });
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("loss-product")).toBeTruthy();
});

it("renders the saved tracking observation as escaped text with its original roles and timestamp", () => {
  const { container } = render(
    <ReportingDashboard
      report={createReport()}
      tracking={{
        status: "OBSERVED",
        observedAt: "2026-09-09T08:00:00.000Z",
        actions: [
          { name: "Purchase", category: "PURCHASE", primary: true },
          { name: '<img src="x" onerror="alert(1)">', category: "SUBMIT_LEAD_FORM", primary: false },
        ],
        issues: ["A page-view action is primary.", "<script>alert(1)</script>"],
      }}
    />,
  );

  fireEvent.click(screen.getByRole("tab", { name: "Tracking" }));
  const panel = screen.getByRole("tabpanel", { name: "Tracking" });
  expect(within(panel).getByText("Configuration observed")).toBeTruthy();
  expect(panel.querySelector("time")?.getAttribute("datetime")).toBe("2026-09-09T08:00:00.000Z");
  expect(within(panel).getByRole("row", { name: /Purchase PURCHASE Primary/ })).toBeTruthy();
  expect(within(panel).getByRole("row", { name: /SUBMIT_LEAD_FORM Secondary/ })).toBeTruthy();
  expect(within(panel).getByText('<img src="x" onerror="alert(1)">')).toBeTruthy();
  expect(within(panel).getByText("<script>alert(1)</script>")).toBeTruthy();
  expect(container.querySelector('img[src="x"]')).toBeNull();
  expect(container.querySelector("script")).toBeNull();
  expect(within(panel).getByText(/does not verify tag firing, consent, Enhanced Conversions/)).toBeTruthy();
  expect(panel.textContent).not.toMatch(/tracking (?:is )?healthy|passed end-to-end/i);
});

it("distinguishes an unavailable collection from a successful empty configuration observation", () => {
  const unavailable = render(<ReportingDashboard report={createReport()} tracking={{ status: "UNAVAILABLE" }} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tracking" }));
  expect(screen.getByRole("tabpanel", { name: "Tracking" }).textContent).toContain(
    "No conversion-configuration observation is available",
  );
  unavailable.unmount();

  render(
    <ReportingDashboard
      report={createReport()}
      tracking={{
        status: "OBSERVED",
        observedAt: "2026-09-09T08:00:00.000Z",
        actions: [],
        issues: ["No active conversion action was observed."],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tracking" }));
  const observed = screen.getByRole("tabpanel", { name: "Tracking" });
  expect(within(observed).getByText("Configuration observed")).toBeTruthy();
  expect(within(observed).getByText("No enabled conversion actions were observed.")).toBeTruthy();
  expect(within(observed).getByText("No active conversion action was observed.")).toBeTruthy();
});

it("keeps the before-and-after surface honest when source inputs are missing or nonfinite", () => {
  render(
    <ReportingDashboard
      report={createReport()}
      sourceSnapshot={{
        currencyCode: undefined,
        evidenceMonths: undefined,
        minimumRoasTarget: null,
        maximumCpaTarget: null,
        current: {
          spend: Number.NaN,
          revenue: Number.POSITIVE_INFINITY,
          orders: Number.NaN,
          cpa: null,
          roas: Number.NaN,
        },
      }}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Before & after" }));
  const panel = screen.getByRole("tabpanel", { name: "Before & after" });
  const table = within(panel).getByRole("table", { name: "Before and after comparison" });

  expect(within(panel).getByText("Evidence window unavailable")).toBeTruthy();
  expect(within(table).getAllByText("Unavailable").length).toBeGreaterThanOrEqual(12);
  expect(within(panel).queryByRole("slider")).toBeNull();
  expect(panel.textContent).not.toMatch(/NaN|Infinity|RON|EUR/);
});

it("renders the approved five-section English hierarchy from supplied V2 values", () => {
  const report = createReport();
  const { container } = render(<ReportingDashboard report={report} demo />);
  const sections = Array.from(
    container.querySelectorAll("[data-report-section]"),
  ).map((section) => section.getAttribute("data-report-section"));

  expect(sections).toEqual([
    "brand-header",
    "account-summary",
    "primary-conclusions",
    "period-comparison",
    "product-actions",
  ]);
  expect(screen.getByText("DEVRIKA")).toBeTruthy();
  expect(screen.getAllByText(/August 1–31, 2026/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/read-only audit/i)).toBeTruthy();
  expect(screen.getByText(/simulated data/i)).toBeTruthy();
  expect(screen.getByRole("heading", { name: report.accountHeadline })).toBeTruthy();

  const targets = screen.getByRole("region", { name: "Account targets" });
  expect(
    Array.from(targets.querySelectorAll("[data-target-tile]")).map(
      (tile) => tile.querySelector("small")?.textContent,
    ),
  ).toEqual(["Current ROAS", "Minimum ROAS", "Current CPA", "Maximum CPA"]);
  expect(targets.querySelectorAll("[data-status='warning']")).toHaveLength(2);
  expect(targets.querySelectorAll("[data-status='positive']")).toHaveLength(2);

  const conclusions = screen.getByRole("region", { name: "Main conclusions" });
  expect(within(conclusions).getAllByRole("article")).toHaveLength(3);
  expect(within(conclusions).getByText("Measured loss")).toBeTruthy();
  expect(within(conclusions).getByText("Simulation")).toBeTruthy();
  expect(within(conclusions).getByText("Underpromoted products")).toBeTruthy();
});

it("renders the approved comparison rows, columns, measured values, and unavailable state", () => {
  render(<ReportingDashboard report={createReport()} />);
  const table = screen.getByRole("table", { name: "Period comparison" });

  expect(
    within(table).getAllByRole("columnheader").map((header) => header.textContent),
  ).toEqual([
    "Period",
    "Budget",
    "Sales volume",
    "Number of sales",
    "CPA",
    "ROAS",
    "Profit / Loss",
  ]);
  expect(
    within(table).getAllByRole("row").slice(1).map((row) =>
      within(row).getAllByRole("cell")[0].textContent,
    ),
  ).toEqual([
    "August 1–31, 2026Selected period",
    "July 1–31, 2026Previous period",
    "Same period last yearUnavailable",
  ]);

  const selectedRow = within(table).getAllByRole("row")[1];
  expect(selectedRow.textContent).toContain("€500");
  expect(selectedRow.textContent).toContain("€1,500");
  expect(selectedRow.textContent).toContain("5");
  expect(selectedRow.textContent).toContain("Loss");
  expect(selectedRow.textContent).toContain("€200");
  expect(selectedRow.textContent).not.toContain("RON");

  const unavailableRow = within(table).getAllByRole("row")[3];
  expect(within(unavailableRow).getAllByText("Unavailable")).toHaveLength(7);
  for (const header of within(table).getAllByRole("columnheader")) {
    expect(header.getAttribute("scope")).toBe("col");
  }
});

it("opens loss by default and supports pointer plus complete keyboard tab navigation", () => {
  render(<ReportingDashboard report={createReport()} />);
  const tablist = screen.getByRole("tablist", { name: "Product actions" });
  const tabs = within(tablist).getAllByRole("tab");

  expect(tabs).toHaveLength(4);
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  expect(tabs[0].getAttribute("tabindex")).toBe("0");
  expect(tabs[0].getAttribute("aria-controls")).toBe("product-panel-loss-maker");
  expect(screen.getByRole("tabpanel", { name: /Consumes budget/ }).id).toBe("product-panel-loss-maker");

  fireEvent.click(tabs[1]);
  expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tabpanel", { name: /Underpromoted/ }).id).toBe("product-panel-not-promoted");

  tabs[1].focus();
  fireEvent.keyDown(tabs[1], { key: "ArrowRight" });
  expect(tabs[2].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[2]);

  fireEvent.keyDown(tabs[2], { key: "End" });
  expect(tabs[3].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[3]);

  fireEvent.keyDown(tabs[3], { key: "ArrowRight" });
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");

  fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
  expect(tabs[3].getAttribute("aria-selected")).toBe("true");

  fireEvent.keyDown(tabs[3], { key: "Home" });
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[0]);
});

it("shows each product once across four complete nine-column action tables", () => {
  render(<ReportingDashboard report={createReport()} />);
  const seenIds: string[] = [];
  const expectedHeaders = [
    "Product",
    "Clicks",
    "Cost",
    "Number of sales",
    "Clicks / sale",
    "CPA",
    "Sales volume",
    "ROAS",
  ];

  for (const tab of within(screen.getByRole("tablist", { name: "Product actions" })).getAllByRole("tab")) {
    fireEvent.click(tab);
    const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
    expect(panel).toBeTruthy();
    const table = within(panel as HTMLElement).getByRole("table", { name: /Products:/ });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers).toHaveLength(9);
    expect(headers.slice(0, 8).map((header) => header.textContent)).toEqual(expectedHeaders);
    headers.forEach((header) => expect(header.getAttribute("scope")).toBe("col"));
    table.querySelectorAll("[data-product-id]").forEach((cell) => {
      const productId = cell.getAttribute("data-product-id");
      if (productId) seenIds.push(productId);
    });
  }

  expect(seenIds.sort()).toEqual([
    "loss-product",
    "not-promoted-product",
    "opportunity-product",
    "performer-product",
    "quarantined-product",
  ]);
  expect(new Set(seenIds).size).toBe(seenIds.length);
});

it("reconciles every conclusion with its tab and labels measured, simulated, partial, and quarantined claims", () => {
  const report = createReport({ productPopulationStatus: "PARTIAL" });
  render(<ReportingDashboard report={report} />);

  const claims = [
    ["MEASURED_PRODUCT_LOSS", "LOSS_MAKER", /Consumes budget/],
    ["SIMULATED_MISSED_SALES", "UNDERPROMOTED_POTENTIAL", /Have potential/],
    ["NOT_PROMOTED_PRODUCTS", "NOT_PROMOTED", /Underpromoted/],
  ] as const;
  for (const [conclusionKey, groupKey, tabName] of claims) {
    const conclusion = screen.getByTestId(`conclusion-${conclusionKey}`);
    fireEvent.click(screen.getByRole("tab", { name: tabName }));
    const panelClaim = screen.getByTestId(`group-claim-${groupKey}`);
    expect(panelClaim.getAttribute("data-raw-value")).toBe(
      conclusion.getAttribute("data-raw-value"),
    );
  }

  fireEvent.click(screen.getByRole("tab", { name: /Profitable/ }));
  const performerProfit = report.groups.find(
    (group) => group.key === "PERFORMER",
  )?.totals.profitOrLoss;
  expect(performerProfit?.status).toBe("AVAILABLE");
  expect(
    screen.getByTestId("group-claim-PERFORMER").getAttribute("data-raw-value"),
  ).toBe(
    performerProfit?.status === "AVAILABLE" ? String(performerProfit.value) : "",
  );

  expect(screen.getAllByText(/partial data/i).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("tab", { name: /Have potential/ }));
  const opportunityPanel = screen.getByRole("tabpanel", { name: /Have potential/ });
  expect(within(opportunityPanel).getByText("Simulation")).toBeTruthy();
  expect(within(opportunityPanel).getByText(/not a guarantee/i)).toBeTruthy();
  expect(within(opportunityPanel).getByText(/clicks per sale/i)).toBeTruthy();
  expect(
    within(opportunityPanel).getByText("1 product with unavailable classification"),
  ).toBeTruthy();
  expect(within(opportunityPanel).getAllByText("Unavailable").length).toBeGreaterThan(0);
});

it("keeps measured period inputs visible when targets and currency are unavailable", () => {
  const report = createReport({
    currencyCode: undefined,
    minimumRoasTarget: null,
    maximumCpaTarget: null,
  });
  render(<ReportingDashboard report={report} />);

  const selectedRow = within(
    screen.getByRole("table", { name: "Period comparison" }),
  ).getAllByRole("row")[1];
  expect(selectedRow.textContent).toContain("500");
  expect(selectedRow.textContent).toContain("1,500");
  expect(selectedRow.textContent).toContain("5");
  expect(selectedRow.textContent).toContain("Unavailable");
  expect(screen.getAllByText(/currency unavailable/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/RON/)).toBeNull();
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
});

it("renders honest empty and zero-denominator states without removing any tab or column", () => {
  const report = createReport({
    periods: {
      selected: {
        range: { from: "2026-08-01", to: "2026-08-31" },
        spend: 0,
        salesVolume: 0,
        numberOfSales: 0,
      },
      previous: null,
      previousYear: null,
    },
    products: [],
  });
  render(<ReportingDashboard report={report} />);

  expect(within(screen.getByRole("tablist", { name: "Product actions" })).getAllByRole("tab")).toHaveLength(4);
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  expect(screen.getByText(/no valid product/i)).toBeTruthy();
  expect(screen.getByRole("table", { name: /Products:/ })).toBeTruthy();
  expect(screen.getAllByRole("columnheader")).toHaveLength(16);
});

it("keeps the mobile contract reachable: two target columns, stacked conclusions, and scrollable full tables", () => {
  const { container } = render(<ReportingDashboard report={createReport()} />);

  expect(container.querySelector("[data-mobile-target-columns='2']")).toBeTruthy();
  expect(container.querySelector("[data-mobile-conclusions='stack']")).toBeTruthy();
  expect(container.querySelector("[data-horizontal-scroll='tabs']")).toBeTruthy();
  const tableScroller = container.querySelector("[data-horizontal-scroll='products']");
  expect(tableScroller).toBeTruthy();
  expect(tableScroller?.getAttribute("tabindex")).toBe("0");
  expect(within(tableScroller as HTMLElement).getAllByRole("columnheader")).toHaveLength(9);
  expect(container.querySelector("[data-legacy-permanent-labels]")).toBeNull();
});

it("labels unavailable group claims and meaningful benchmarks as unavailable inside their panels", () => {
  const missingTarget = createReport({ minimumRoasTarget: null });
  render(<ReportingDashboard report={missingTarget} />);

  const lossClaim = screen.getByTestId("group-claim-LOSS_MAKER");
  expect(within(lossClaim).getAllByText("Unavailable")).toHaveLength(2);
  expect(within(lossClaim).queryByText("Measured")).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: /Profitable/ }));
  const profitableClaim = screen.getByTestId("group-claim-PERFORMER");
  expect(within(profitableClaim).getAllByText("Unavailable")).toHaveLength(2);
  expect(within(profitableClaim).queryByText("Measured")).toBeNull();

  cleanup();
  const missingBenchmark = createReport({
    periods: {
      selected: {
        range: { from: "2026-08-01", to: "2026-08-31" },
        spend: 500,
        salesVolume: 0,
        numberOfSales: 0,
      },
      previous: null,
      previousYear: null,
    },
    products: [
      product("zero-sales", "NOT_PROMOTED", {
        cost: 500,
        conversionValue: 0,
        conversions: 0,
        clicks: 20,
      }),
    ],
  });
  render(<ReportingDashboard report={missingBenchmark} />);

  fireEvent.click(screen.getByRole("tab", { name: /Underpromoted/ }));
  expect(
    within(screen.getByRole("tabpanel", { name: /Underpromoted/ })).getByText("Account average: Unavailable"),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: /Have potential/ }));
  expect(
    within(screen.getByRole("tabpanel", { name: /Have potential/ })).getByText("Account average: Unavailable"),
  ).toBeTruthy();

  const selectedPeriodRow = within(
    screen.getByRole("table", { name: "Period comparison" }),
  ).getAllByRole("row")[1];
  expect(selectedPeriodRow.textContent).toContain("500");
  expect(selectedPeriodRow.textContent).toContain("0");
});

it("obeys hand-built target presentation states and authoritative quarantined totals", () => {
  const builtReport = createReport();
  const report: GoogleAdsReportV2ViewModel = {
    ...builtReport,
    targetPresentation: {
      currentRoas: "positive",
      minimumRoas: "unavailable",
      currentCpa: "positive",
      maximumCpa: "unavailable",
    },
    groups: builtReport.groups.map((group) =>
      group.key === "NOT_PROMOTED"
        ? {
            ...group,
            quarantinedRows: [],
            totals: {
              ...group.totals,
              quarantinedProductCount: { status: "AVAILABLE", value: 7 },
            },
          }
        : group,
    ),
  };
  const { container } = render(<ReportingDashboard report={report} />);
  const targetTiles = container.querySelectorAll("[data-target-tile]");

  expect(targetTiles[0].getAttribute("data-status")).toBe("positive");
  expect(targetTiles[1].getAttribute("data-status")).toBe("unavailable");
  expect(targetTiles[2].getAttribute("data-status")).toBe("positive");
  expect(targetTiles[3].getAttribute("data-status")).toBe("unavailable");

  const notPromotedTab = screen.getByRole("tab", { name: /Underpromoted/ });
  expect(within(notPromotedTab).getByText("7 unavailable")).toBeTruthy();
  fireEvent.click(notPromotedTab);
  expect(
    within(screen.getByRole("tabpanel", { name: /Underpromoted/ })).getByText(
      "7 products with unavailable classification",
    ),
  ).toBeTruthy();
});

it("renders authoritative English copy and correct singular and plural product forms", () => {
  render(<ReportingDashboard report={createReport()} />);

  expect(
    screen.getByRole("heading", {
      name: "The account is below the minimum profitability threshold in the selected period.",
    }),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Products consuming budget" })).toBeTruthy();
  expect(screen.getByText(/measured spend/)).toBeTruthy();
  expect(screen.getAllByText("1 product").length).toBeGreaterThan(0);
  expect(screen.getByText("1 valid product")).toBeTruthy();
  expect(screen.queryByText("1 products")).toBeNull();
  expect(screen.queryByText("1 valid products")).toBeNull();

  const comparisonHeaders = within(
    screen.getByRole("table", { name: "Period comparison" }),
  ).getAllByRole("columnheader");
  expect(comparisonHeaders.map((header) => header.textContent)).toContain("Sales volume");
  expect(comparisonHeaders.map((header) => header.textContent)).toContain("Number of sales");

  cleanup();
  const pluralReport = createReport({
    products: [
      product("loss-one", "LOSS_MAKER", {
        cost: 200,
        conversionValue: 100,
        conversions: 1,
      }),
      product("loss-two", "LOSS_MAKER", {
        cost: 300,
        conversionValue: 100,
        conversions: 1,
      }),
    ],
  });
  render(<ReportingDashboard report={pluralReport} />);
  expect(
    screen.getByTestId("conclusion-MEASURED_PRODUCT_LOSS").textContent,
  ).toContain("2 products");
  expect(screen.getByText("2 valid products")).toBeTruthy();
});
