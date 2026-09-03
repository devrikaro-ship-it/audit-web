// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  buildGoogleAdsReportV2,
  type GoogleAdsReportV2Input,
  type GoogleAdsReportV2ViewModel,
  type ReportProductInputV2,
} from "@/lib/gads-report-metrics";
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

it("renders the approved five-section Romanian hierarchy from supplied V2 values", () => {
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
  expect(screen.getAllByText(/1–31 august 2026/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/audit doar în citire/i)).toBeTruthy();
  expect(screen.getByText(/date simulate/i)).toBeTruthy();
  expect(screen.getByRole("heading", { name: report.accountHeadline })).toBeTruthy();

  const targets = screen.getByRole("region", { name: "Țintele contului" });
  expect(
    Array.from(targets.querySelectorAll("[data-target-tile]")).map(
      (tile) => tile.querySelector("small")?.textContent,
    ),
  ).toEqual(["ROAS actual", "ROAS minim", "CPA actual", "CPA maxim"]);
  expect(targets.querySelectorAll("[data-status='warning']")).toHaveLength(2);
  expect(targets.querySelectorAll("[data-status='positive']")).toHaveLength(2);

  const conclusions = screen.getByRole("region", { name: "Concluziile principale" });
  expect(within(conclusions).getAllByRole("article")).toHaveLength(3);
  expect(within(conclusions).getByText("Pierdere măsurată")).toBeTruthy();
  expect(within(conclusions).getByText("Simulare")).toBeTruthy();
  expect(within(conclusions).getByText("Produse insuficient promovate")).toBeTruthy();
});

it("renders the approved comparison rows, columns, measured values, and unavailable state", () => {
  render(<ReportingDashboard report={createReport()} />);
  const table = screen.getByRole("table", { name: "Comparația perioadelor" });

  expect(
    within(table).getAllByRole("columnheader").map((header) => header.textContent),
  ).toEqual([
    "Perioadă",
    "Buget",
    "Volum vanzari",
    "Nr. vanzari",
    "CPA",
    "ROAS",
    "Profit / Pierdere",
  ]);
  expect(
    within(table).getAllByRole("row").slice(1).map((row) =>
      within(row).getAllByRole("cell")[0].textContent,
    ),
  ).toEqual([
    "1–31 august 2026Perioada selectată",
    "1–31 iulie 2026Perioada anterioară",
    "Aceeași perioadă anul trecutIndisponibil",
  ]);

  const selectedRow = within(table).getAllByRole("row")[1];
  expect(selectedRow.textContent).toContain("500");
  expect(selectedRow.textContent).toContain("1.500");
  expect(selectedRow.textContent).toContain("5");
  expect(selectedRow.textContent).toContain("Pierdere");
  expect(selectedRow.textContent).toContain("200");

  const unavailableRow = within(table).getAllByRole("row")[3];
  expect(within(unavailableRow).getAllByText("Indisponibil")).toHaveLength(7);
  for (const header of within(table).getAllByRole("columnheader")) {
    expect(header.getAttribute("scope")).toBe("col");
  }
});

it("opens loss by default and supports pointer plus complete keyboard tab navigation", () => {
  render(<ReportingDashboard report={createReport()} />);
  const tablist = screen.getByRole("tablist", { name: "Acțiuni pentru produse" });
  const tabs = within(tablist).getAllByRole("tab");

  expect(tabs).toHaveLength(4);
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  expect(tabs[0].getAttribute("tabindex")).toBe("0");
  expect(tabs[0].getAttribute("aria-controls")).toBe("product-panel-loss-maker");
  expect(screen.getByRole("tabpanel").id).toBe("product-panel-loss-maker");

  fireEvent.click(tabs[1]);
  expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tabpanel").id).toBe("product-panel-not-promoted");

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
    "Produs",
    "Clickuri",
    "Cost",
    "Nr. vanzari",
    "Clickuri / vânzare",
    "CPA",
    "Volum vanzari",
    "ROAS",
  ];

  for (const tab of screen.getAllByRole("tab")) {
    fireEvent.click(tab);
    const panel = screen.getByRole("tabpanel");
    const table = within(panel).getByRole("table", { name: /Produse:/ });
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
    ["MEASURED_PRODUCT_LOSS", "LOSS_MAKER", /Consumă buget/],
    ["SIMULATED_MISSED_SALES", "UNDERPROMOTED_POTENTIAL", /Au potențial/],
    ["NOT_PROMOTED_PRODUCTS", "NOT_PROMOTED", /Insuficient promovate/],
  ] as const;
  for (const [conclusionKey, groupKey, tabName] of claims) {
    const conclusion = screen.getByTestId(`conclusion-${conclusionKey}`);
    fireEvent.click(screen.getByRole("tab", { name: tabName }));
    const panelClaim = screen.getByTestId(`group-claim-${groupKey}`);
    expect(panelClaim.getAttribute("data-raw-value")).toBe(
      conclusion.getAttribute("data-raw-value"),
    );
  }

  fireEvent.click(screen.getByRole("tab", { name: /Profitabile/ }));
  const performerProfit = report.groups.find(
    (group) => group.key === "PERFORMER",
  )?.totals.profitOrLoss;
  expect(performerProfit?.status).toBe("AVAILABLE");
  expect(
    screen.getByTestId("group-claim-PERFORMER").getAttribute("data-raw-value"),
  ).toBe(
    performerProfit?.status === "AVAILABLE" ? String(performerProfit.value) : "",
  );

  expect(screen.getAllByText(/date parțiale/i).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("tab", { name: /Au potențial/ }));
  const opportunityPanel = screen.getByRole("tabpanel");
  expect(within(opportunityPanel).getByText("Simulare")).toBeTruthy();
  expect(within(opportunityPanel).getByText(/nu este o garanție/i)).toBeTruthy();
  expect(within(opportunityPanel).getByText(/clickuri pentru o vânzare/i)).toBeTruthy();
  expect(within(opportunityPanel).getByText("Clasificare indisponibilă")).toBeTruthy();
  expect(within(opportunityPanel).getAllByText("Indisponibil").length).toBeGreaterThan(0);
});

it("keeps measured period inputs visible when targets and currency are unavailable", () => {
  const report = createReport({
    currencyCode: undefined,
    minimumRoasTarget: null,
    maximumCpaTarget: null,
  });
  render(<ReportingDashboard report={report} />);

  const selectedRow = within(
    screen.getByRole("table", { name: "Comparația perioadelor" }),
  ).getAllByRole("row")[1];
  expect(selectedRow.textContent).toContain("500");
  expect(selectedRow.textContent).toContain("1.500");
  expect(selectedRow.textContent).toContain("5");
  expect(selectedRow.textContent).toContain("Indisponibil");
  expect(screen.getAllByText(/monedă indisponibilă/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/RON/)).toBeNull();
  expect(screen.getAllByText("Indisponibil").length).toBeGreaterThan(0);
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

  expect(screen.getAllByRole("tab")).toHaveLength(4);
  expect(screen.getAllByText("Indisponibil").length).toBeGreaterThan(0);
  expect(screen.getByText(/niciun produs valid/i)).toBeTruthy();
  expect(screen.getByRole("table", { name: /Produse:/ })).toBeTruthy();
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
  expect(within(lossClaim).getAllByText("Indisponibil")).toHaveLength(2);
  expect(within(lossClaim).queryByText("Măsurat")).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: /Profitabile/ }));
  const profitableClaim = screen.getByTestId("group-claim-PERFORMER");
  expect(within(profitableClaim).getAllByText("Indisponibil")).toHaveLength(2);
  expect(within(profitableClaim).queryByText("Măsurat")).toBeNull();

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

  fireEvent.click(screen.getByRole("tab", { name: /Insuficient promovate/ }));
  expect(
    within(screen.getByRole("tabpanel")).getByText("Media contului: Indisponibil"),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: /Au potențial/ }));
  expect(
    within(screen.getByRole("tabpanel")).getByText("Media contului: Indisponibil"),
  ).toBeTruthy();

  const selectedPeriodRow = within(
    screen.getByRole("table", { name: "Comparația perioadelor" }),
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

  const notPromotedTab = screen.getByRole("tab", { name: /Insuficient promovate/ });
  expect(within(notPromotedTab).getByText("7 indisponibile")).toBeTruthy();
  fireEvent.click(notPromotedTab);
  expect(
    within(screen.getByRole("tabpanel")).getByText(
      "7 produse cu clasificare indisponibilă",
    ),
  ).toBeTruthy();
});

it("renders authoritative Romanian copy and correct singular and plural product forms", () => {
  render(<ReportingDashboard report={createReport()} />);

  expect(
    screen.getByRole("heading", {
      name: "Contul este sub pragul minim de profitabilitate în perioada selectată.",
    }),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Produse care consumă buget" })).toBeTruthy();
  expect(screen.getByText(/cheltuială măsurată/)).toBeTruthy();
  expect(screen.getAllByText("1 produs").length).toBeGreaterThan(0);
  expect(screen.getByText("1 produs valid")).toBeTruthy();
  expect(screen.queryByText("1 produse")).toBeNull();
  expect(screen.queryByText("1 produse valide")).toBeNull();

  const comparisonHeaders = within(
    screen.getByRole("table", { name: "Comparația perioadelor" }),
  ).getAllByRole("columnheader");
  expect(comparisonHeaders.map((header) => header.textContent)).toContain("Volum vanzari");
  expect(comparisonHeaders.map((header) => header.textContent)).toContain("Nr. vanzari");

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
  ).toContain("2 produse");
  expect(screen.getByText("2 produse valide")).toBeTruthy();
});
