// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import ReportingDashboard from "./ReportingDashboard";

const snapshot = {
  website: "https://store.example",
  accountName: "Example Store",
  averageOrderValue: 300,
  goodsCost: 180,
  breakEvenCpa: 100,
  breakEvenRoas: 5,
  current: {
    spend: 500,
    revenue: 1500,
    orders: 5,
    cpa: 100,
    roas: 3,
    clicks: 100,
    impressions: 5000,
  },
  optimized: { spend: 500, revenue: 3000, orders: 10, cpa: 50, roas: 6 },
  losses: [],
  opportunities: [],
  reportProducts: [
    {
      productId: "bad",
      title: "Budget burner",
      category: "Furniture",
      cost: 400,
      conversionValue: 400,
      conversions: 1,
      clicks: 80,
      impressions: 3000,
      catalogEligible: true,
    },
    {
      productId: "good",
      title: "Growth product",
      cost: 100,
      conversionValue: 1100,
      conversions: 4,
      clicks: 20,
      impressions: 2000,
      catalogEligible: true,
    },
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
  render(
    <ReportingDashboard
      snapshot={snapshot}
      analysis={analysis}
      updatedAt="2026-08-27T08:00:00Z"
    />,
  );
  expect(screen.getByText("Below break-even")).toBeTruthy();
  expect(screen.getAllByText("100").length).toBeGreaterThan(0);
  expect(screen.getByText("Budget burner")).toBeTruthy();
  expect(screen.getByText("Growth product")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "Growth" },
  });
  expect(screen.queryByText("Budget burner")).toBeNull();
  expect(screen.getByText("Growth product")).toBeTruthy();
});

it("keeps the simulated budget tool below the measured dashboard", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);

  const measuredTable = view.getByRole("region", {
    name: "All product performance",
  });
  const simulator = view.getByRole("region", {
    name: "Simularea alocării bugetului",
  });

  expect(
    measuredTable.compareDocumentPosition(simulator) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    view.getAllByText("Simulare viitoare", { selector: ".source.simulated" })
      .length,
  ).toBeGreaterThan(0);
});

it("shows product IDs and labels financial impact by evidence type", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const table = within(container).getByRole("region", {
    name: "All product performance",
  });

  expect(
    within(table).getByRole("columnheader", { name: "Item ID" }),
  ).toBeTruthy();
  expect(
    within(table).getByRole("columnheader", { name: "Financial impact" }),
  ).toBeTruthy();
  expect(within(table).getByText("Measured risk")).toBeTruthy();
});

it("starts in action priority order and sorts by every numeric table metric", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);
  const table = view.getByRole("region", { name: "All product performance" });
  const sort = view.getByLabelText("Sort products");

  expect(within(table).getAllByRole("row")[1].textContent).toContain(
    "Budget burner",
  );
  expect(
    within(sort)
      .getAllByRole("option")
      .map((option) => option.getAttribute("value")),
  ).toEqual([
    "priority",
    "impressions",
    "clicks",
    "cost",
    "conversions",
    "conversionRate",
    "clicksPerSale",
    "conversionValue",
    "cpa",
    "roas",
    "profitabilityGap",
    "financialImpact",
  ]);

  fireEvent.change(sort, { target: { value: "conversions" } });
  expect(within(table).getAllByRole("row")[1].textContent).toContain(
    "Growth product",
  );
});

it("offers only signed reporting periods and preserves the selected report", () => {
  const { container } = render(
    <ReportingDashboard
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
    />,
  );
  const view = within(container);

  expect(view.getAllByText(/August 2026/).length).toBeGreaterThan(0);
  expect(
    (view.getByLabelText("Reporting period") as HTMLSelectElement).value,
  ).toBe("august");
  expect(view.getByRole("button", { name: "Apply period" })).toBeTruthy();
  expect(view.queryByRole("option", { name: "June 2026" })).toBeNull();
});

it("proves every KPI, label filter, empty state, and scroll-table semantics", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);

  for (const value of ["500 RON", "1.500 RON", "100", "5", "5.00%", "3.00×"]) {
    expect(view.getAllByText(value).length).toBeGreaterThan(0);
  }
  const table = view.getByRole("region", { name: "All product performance" });
  expect(table.getAttribute("tabindex")).toBe("0");
  expect(
    within(table).getByRole("columnheader", { name: "Product" }),
  ).toBeTruthy();

  fireEvent.change(view.getByLabelText("Filter products"), {
    target: { value: "PERFORMER" },
  });
  expect(within(table).queryByText("Budget burner")).toBeNull();
  expect(within(table).getByText("Growth product")).toBeTruthy();

  fireEvent.change(view.getByLabelText("Search products"), {
    target: { value: "missing product" },
  });
  expect(
    within(table).getByText("No products match these filters."),
  ).toBeTruthy();
});

it("uses a compact KPI grid instead of a horizontal KPI strip on mobile", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  expect(container.querySelector("style")?.textContent).toContain(
    ".kpis{grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}",
  );
});

it("matches the approved reporting artifact structure", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const artifact = container.querySelector("[data-report-dashboard='live']")!;
  const view = within(artifact as HTMLElement);

  expect(
    view.getByRole("navigation", { name: "Report navigation" }),
  ).toBeTruthy();
  expect(view.getByText("Ads reporting")).toBeTruthy();
  expect(view.getByRole("banner")).toBeTruthy();
  expect(
    view.getByRole("heading", { name: "Product profitability" }),
  ).toBeTruthy();
  expect(
    view.getByRole("region", { name: "Profitability targets" }),
  ).toBeTruthy();
  expect(
    view.getByRole("region", { name: "Account key performance indicators" }),
  ).toBeTruthy();
  expect(view.getByRole("tablist", { name: "Report views" })).toBeTruthy();
  expect(
    view.getByRole("region", { name: "Product performance table" }),
  ).toBeTruthy();
  expect(
    view.getByText(
      "Scroll horizontally for every column · product and item ID stay pinned",
    ),
  ).toBeTruthy();
});

it("uses artifact tabs as working product label filters", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);
  const table = view.getByRole("region", { name: "All product performance" });

  fireEvent.click(view.getByRole("tab", { name: /Losers/ }));
  expect(within(table).getByText("Budget burner")).toBeTruthy();
  expect(within(table).queryByText("Growth product")).toBeNull();
  expect(
    view.getByRole("tab", { name: /Losers/ }).getAttribute("aria-selected"),
  ).toBe("true");
});

it("keeps the artifact responsive shell and sticky product columns", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const css = container.querySelector("style")?.textContent ?? "";

  expect(css).toContain(
    ".reportApp{display:grid;grid-template-columns:232px minmax(0,1fr)",
  );
  expect(css).toContain(".reportTable .stickProduct{position:sticky;left:0");
  expect(css).toContain(
    "@media(max-width:1120px){.reportApp{grid-template-columns:1fr}",
  );
  expect(css).toContain(
    ".kpis{grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}",
  );
});

it("renders every approved major block in the exact artifact order", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const artifact = container.querySelector("[data-report-dashboard='live']")!;
  const orderedSections = Array.from(
    artifact.querySelectorAll("[data-dashboard-block]"),
  ).map((element) => element.getAttribute("data-dashboard-block"));

  expect(orderedSections).toEqual([
    "targets",
    "losers",
    "persistent-labels",
    "kpis",
    "budget-breakdown",
    "tabs",
    "products",
  ]);
});

it("aggregates real label financials without inventing KPI trends", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(
    container.querySelector("[data-report-dashboard='live']") as HTMLElement,
  );

  const losers = view.getByRole("region", { name: "Losers measured results" });
  expect(within(losers).getByText("400 RON")).toBeTruthy();
  expect(within(losers).getByText("−320 RON")).toBeTruthy();
  expect(
    view.getByRole("region", { name: "Permanent product label results" })
      .children.length,
  ).toBe(4);
  expect(
    view.getByRole("region", { name: "Real results by product label" }),
  ).toBeTruthy();
  expect(view.queryByText(/versus previous/i)).toBeNull();
  expect(container.querySelectorAll("[data-kpi-sparkline]").length).toBe(7);
});

it("uses only tabs as label filters and makes every table column sortable", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);
  const table = view.getByRole("region", { name: "All product performance" });

  expect(view.queryByRole("group", { name: "Filter by label" })).toBeNull();
  fireEvent.click(view.getByRole("tab", { name: /Winners/ }));
  expect(within(table).getByText("Growth product")).toBeTruthy();
  expect(within(table).queryByText("Budget burner")).toBeNull();

  fireEvent.click(
    within(table).getByRole("button", { name: "Sort by conversions" }),
  );
  expect(
    within(table).getByRole("columnheader", { name: /Conversions/ }).className,
  ).toContain("sorted");
  expect(
    within(table).getAllByRole("button", { name: /^Sort by / }),
  ).toHaveLength(14);
});

it("matches the artifact product row details", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);
  const row = within(
    view.getByRole("region", { name: "All product performance" }),
  ).getAllByRole("row")[1];

  expect(
    within(row).getByRole("button", { name: "Copy item ID bad" }),
  ).toBeTruthy();
  expect(row.querySelector("[data-product-thumbnail]")).toBeTruthy();
  expect(row.querySelector("[data-roas-bar]")).toBeTruthy();
});

it("keeps the demo disclosure inside the shell below the top bar", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} demo />,
  );
  const shell = container.querySelector(".reportMain")!;
  const topbar = shell.querySelector(".reportTopbar")!;
  const banner = within(shell as HTMLElement)
    .getByText(/figures below are simulated/)
    .closest(".demoBar")!;

  expect(
    topbar.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    container
      .querySelector(".reportApp")
      ?.firstElementChild?.classList.contains("reportRail"),
  ).toBe(true);
});

it("matches the artifact topbar actions and retains them with breadcrumbs on mobile", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const topbar = container.querySelector(".reportTopbar") as HTMLElement;

  expect(
    within(topbar).getByRole("button", { name: "Export CSV" }),
  ).toBeTruthy();
  expect(
    within(topbar).getByRole("link", { name: "Get the action plan" }),
  ).toBeTruthy();
  const css = container.querySelector("style")?.textContent ?? "";
  expect(css).not.toContain(".crumbs{display:none}");
  expect(css).toContain(".topbarActions");
});

it("uses exact measured losers, summary, footer, and product metadata fields", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const view = within(container);
  const losers = view.getByRole("region", { name: "Losers measured results" });
  for (const label of ["Products", "Budget consumed", "Loss produced"]) {
    expect(within(losers).getByText(label)).toBeTruthy();
  }

  const summary = view.getByRole("region", { name: "Product summary" });
  expect(
    Array.from(summary.children).map(
      (element) => element.firstElementChild?.textContent,
    ),
  ).toEqual([
    "Products",
    "Budget",
    "Sales count",
    "Revenue",
    "Avg CPA",
    "ROAS",
    "Profit / loss",
  ]);

  const footer = view.getByRole("contentinfo", { name: "Product totals" });
  expect(footer.querySelectorAll("[data-total]")).toHaveLength(5);
  const firstRow = view
    .getByRole("region", { name: "All product performance" })
    .querySelector("tbody tr")!;
  expect(firstRow.textContent).toContain("Furniture");
  expect(firstRow.textContent).toContain("Price unavailable");
});

it("keeps KPI trend containers measurable when trend history is unavailable", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const kpis = within(container).getByRole("region", {
    name: "Account key performance indicators",
  });
  expect(kpis.querySelectorAll("[data-kpi-trend='unavailable']")).toHaveLength(
    7,
  );
  const css = container.querySelector("style")?.textContent ?? "";
  expect(css).toContain("min-height:104px");
  expect(css).toContain(".kpiTrend");
  expect(css).toContain(".reportTable .stickId{position:sticky");
});

it("keeps sortable metric headers exposed beside both sticky columns on mobile", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const css = container.querySelector("style")?.textContent ?? "";

  expect(css).toContain(
    "@media(max-width:720px){.reportTable{--sticky-product-width:112px;--sticky-id-width:56px}",
  );
  expect(css).toContain(
    ".reportTable .stickId{left:var(--sticky-product-width);width:var(--sticky-id-width)",
  );
  expect(css).toContain(
    ".reportTable .stickProduct{width:var(--sticky-product-width);max-width:var(--sticky-product-width)}",
  );
  expect(css).toContain(
    "width:var(--sticky-id-width);max-width:var(--sticky-id-width)",
  );
});

it("derives profit and loss everywhere from the break-even ROAS margin", () => {
  const marginSnapshot = {
    ...snapshot,
    breakEvenRoas: 20,
    reportProducts: [
      {
        productId: "margin-loss",
        title: "Margin loss",
        category: "Furniture",
        cost: 2355,
        conversionValue: 8125,
        conversions: 10,
        clicks: 100,
        impressions: 1000,
        catalogEligible: true,
      },
    ],
  };
  const { container } = render(
    <ReportingDashboard snapshot={marginSnapshot} analysis={analysis} />,
  );
  const view = within(container);

  expect(
    within(view.getByRole("region", { name: "Product summary" })).getByText(
      "−1.949 RON",
    ),
  ).toBeTruthy();
  expect(
    within(
      view.getByRole("region", { name: "Permanent product label results" }),
    ).getByText("−1.949 RON"),
  ).toBeTruthy();
  expect(
    within(
      view.getByRole("region", { name: "Real results by product label" }),
    ).getByText("−1.949 RON"),
  ).toBeTruthy();
});

it("uses the artifact label card structures and exact financial metrics", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const labels = container.querySelectorAll(".labelCard");
  expect(labels).toHaveLength(4);
  for (const card of labels) {
    expect(card.querySelector(".labelDescription")?.textContent).toBeTruthy();
    expect(
      Array.from(card.querySelectorAll("[data-label-metric]")).map(
        (metric) => metric.firstElementChild?.textContent,
      ),
    ).toEqual(["Products", "Spend", "Profit / Loss"]);
  }

  const financialCards = container.querySelectorAll(".financialCard");
  expect(financialCards).toHaveLength(4);
  for (const card of financialCards) {
    expect(
      Array.from(card.querySelectorAll(".resultMetric")).map(
        (metric) => metric.firstElementChild?.textContent,
      ),
    ).toEqual([
      "Budget",
      "Sales",
      "Revenue",
      "Avg CPA",
      "ROAS",
      "Profit / Loss",
    ]);
  }
});

it("keeps artifact card titles, order, and compact desktop and mobile layout", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );

  expect(
    Array.from(container.querySelectorAll(".labelCard .labelIntro strong")).map(
      (title) => title.textContent,
    ),
  ).toEqual(["Winners", "Opportunities", "Unpromoted", "Losers"]);
  expect(
    Array.from(container.querySelectorAll(".financialCard .financialHead .productLabel")).map(
      (title) => title.textContent?.trim(),
    ),
  ).toEqual(["Winners", "Opportunities", "Losers", "Unpromoted"]);

  const persistentCard = container.querySelector<HTMLElement>(".labelCard")!;
  const persistentIntro = persistentCard.querySelector<HTMLElement>(
    ".labelIntro",
  )!;
  const persistentMetric = persistentCard.querySelector<HTMLElement>(
    ".labelNumbers .resultMetric",
  )!;
  const financialCard = container.querySelector<HTMLElement>(".financialCard")!;
  const financialHead = financialCard.querySelector<HTMLElement>(
    ".financialHead",
  )!;
  const financialMetric = financialCard.querySelector<HTMLElement>(
    ".financialMetrics .resultMetric",
  )!;

  expect(window.getComputedStyle(persistentCard).minHeight).toBe("85px");
  expect(window.getComputedStyle(persistentIntro).minHeight).toBe("40px");
  expect(window.getComputedStyle(persistentMetric).paddingTop).toBe("6px");
  expect(window.getComputedStyle(financialHead).paddingTop).toBe("6px");
  expect(window.getComputedStyle(financialMetric).paddingTop).toBe("9px");
  expect(container.querySelector("style")?.textContent).toMatch(
    /@media\(max-width:720px\)\{[\s\S]*?\.labelCard\{min-height:100px\}/,
  );
});

it("matches the artifact footer and normalizes raw Google category metadata", () => {
  const rawCategorySnapshot = {
    ...snapshot,
    reportProducts: [
      {
        ...snapshot.reportProducts[0],
        category: "productCategoryConstants/LEVEL1~436",
      },
    ],
  };
  const { container } = render(
    <ReportingDashboard snapshot={rawCategorySnapshot} analysis={analysis} />,
  );
  const view = within(container);
  const footer = view.getByRole("contentinfo", { name: "Product totals" });
  expect(
    Array.from(footer.querySelectorAll("[data-total]")).map(
      (metric) => metric.childNodes[0]?.textContent?.trim(),
    ),
  ).toEqual([
    "Filtered cost",
    "Filtered sales",
    "Filtered clicks",
    "Filtered conversions",
    "Filtered ROAS",
  ]);
  const row = view
    .getByRole("region", { name: "All product performance" })
    .querySelector("tbody tr")!;
  expect(row.querySelector("img[data-product-thumbnail]")).toBeTruthy();
  expect(row.textContent).toContain("Google category 436");
  expect(row.textContent).toContain("Price unavailable");
  expect(row.textContent?.match(/margin-loss/g) ?? []).toHaveLength(0);
  expect(row.textContent?.match(/bad/g) ?? []).toHaveLength(1);
});

it("links the action button to the real optimization plan section", () => {
  const { container } = render(
    <ReportingDashboard snapshot={snapshot} analysis={analysis} />,
  );
  const link = within(container).getByRole("link", {
    name: "Get the action plan",
  });
  expect(link.getAttribute("href")).toBe("#optimization-plan");
  expect(container.querySelector("#optimization-plan")).toBeTruthy();
  expect(
    container.querySelector("#optimization-plan input[type='range']"),
  ).toBeTruthy();
});
