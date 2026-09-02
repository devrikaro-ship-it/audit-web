"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  classifyReportProducts,
  type ProductPerformanceLabel,
} from "@/lib/gads-product-classification";
import type { GadsReportSnapshot } from "@/lib/gads-report-delivery";
import type { ProductAnalysis } from "@/lib/gads-product-simulation";
import ProfitabilitySimulator from "./ProfitabilitySimulator";

const money = (value: number) =>
  `${Math.round(value).toLocaleString("ro-RO")} RON`;
const number = (value: number) => Math.round(value).toLocaleString("ro-RO");
const ratio = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(2)}×`;
const percent = (value: number | null) =>
  value === null ? "—" : `${(value * 100).toFixed(2)}%`;
const signedMoney = (value: number) =>
  `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;
const categoryText = (category?: string) => {
  if (!category) return "Category unavailable";
  const rawGoogleCategory = category.match(
    /^productCategoryConstants\/(?:LEVEL\d+~)?(.+)$/,
  );
  return rawGoogleCategory
    ? `Google category ${rawGoogleCategory[1]}`
    : category;
};
const productThumbnail = (title: string) => {
  const initial = title.trim().charAt(0).toUpperCase() || "P";
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#eef3fb"/><circle cx="32" cy="26" r="15" fill="#d8e4f6"/><path d="M15 55c4-12 12-18 17-18s13 6 17 18" fill="#c2d4ee"/><text x="32" y="33" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#0b57d0">${initial}</text></svg>`,
  )}`;
};
const labelText: Record<ProductPerformanceLabel, string> = {
  LOSS_MAKER: "Loss maker",
  NOT_PROMOTED: "Not promoted",
  UNDERPROMOTED_POTENTIAL: "Underpromoted potential",
  PERFORMER: "Performer",
  INSUFFICIENT_DATA: "Insufficient data",
};
const labelCardText: Record<
  ProductPerformanceLabel,
  { title: string; description: string }
> = {
  LOSS_MAKER: {
    title: "Losers",
    description: "Products losing money in ads",
  },
  NOT_PROMOTED: {
    title: "Unpromoted",
    description: "Products without enough promotion data",
  },
  UNDERPROMOTED_POTENTIAL: {
    title: "Opportunities",
    description: "High-profit products with too little traffic",
  },
  PERFORMER: {
    title: "Winners",
    description: "Products that are profitable",
  },
  INSUFFICIENT_DATA: {
    title: "Insufficient data",
    description: "Products without enough evidence to classify",
  },
};
const tabs: { value: ProductPerformanceLabel | "ALL"; label: string }[] = [
  { value: "ALL", label: "All products" },
  { value: "LOSS_MAKER", label: "Losers" },
  { value: "UNDERPROMOTED_POTENTIAL", label: "Opportunities" },
  { value: "NOT_PROMOTED", label: "Unpromoted" },
  { value: "PERFORMER", label: "Winners" },
];
type SortMetric =
  | "priority"
  | "title"
  | "productId"
  | "label"
  | "impressions"
  | "clicks"
  | "cost"
  | "conversions"
  | "conversionRate"
  | "clicksPerSale"
  | "conversionValue"
  | "cpa"
  | "roas"
  | "profitabilityGap"
  | "financialImpact";
type PeriodSelector = {
  action: string;
  selected: string;
  options: { value: string; label: string }[];
};
const sortOptions: { value: SortMetric; label: string }[] = [
  ["priority", "Sort by action priority"],
  ["impressions", "Sort by impressions"],
  ["clicks", "Sort by clicks"],
  ["cost", "Sort by cost"],
  ["conversions", "Sort by conversions"],
  ["conversionRate", "Sort by conversion rate"],
  ["clicksPerSale", "Sort by clicks per sale"],
  ["conversionValue", "Sort by sales"],
  ["cpa", "Sort by CPA"],
  ["roas", "Sort by ROAS"],
  ["profitabilityGap", "Sort by ROAS gap"],
  ["financialImpact", "Sort by financial impact"],
].map(([value, label]) => ({ value: value as SortMetric, label }));

export default function ReportingDashboard({
  snapshot,
  analysis,
  updatedAt,
  periodLabel = "12 months",
  periodSelector,
  demo = false,
}: {
  snapshot: GadsReportSnapshot;
  analysis: ProductAnalysis;
  updatedAt?: string;
  periodLabel?: string;
  periodSelector?: PeriodSelector;
  demo?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState<ProductPerformanceLabel | "ALL">("ALL");
  const [sort, setSort] = useState<SortMetric>("priority");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const products = useMemo(() => {
    const legacy = snapshot.productAnalysis
      ? [
          ...snapshot.productAnalysis.losses,
          ...snapshot.productAnalysis.opportunities,
        ]
      : [];
    return classifyReportProducts(
      snapshot.reportProducts ?? legacy,
      snapshot.breakEvenRoas,
      snapshot.evidenceMonths ?? 1,
    );
  }, [snapshot]);
  const visible = useMemo(
    () =>
      products
        .filter(
          (row) =>
            (label === "ALL" || row.label === label) &&
            `${row.title} ${row.productId}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => {
          if (sort === "priority") return 0;
          const left = a[sort];
          const right = b[sort];
          const compared =
            typeof left === "string" && typeof right === "string"
              ? left.localeCompare(right)
              : Number(left ?? -Infinity) - Number(right ?? -Infinity);
          return sortDirection === "asc" ? compared : -compared;
        }),
    [products, query, label, sort, sortDirection],
  );
  const clicks = snapshot.current.clicks;
  const conversionRate =
    clicks && clicks > 0 ? snapshot.current.orders / clicks : null;
  const profitable = snapshot.current.roas >= snapshot.breakEvenRoas;
  const counts = Object.fromEntries(
    tabs.map((tab) => [
      tab.value,
      tab.value === "ALL"
        ? products.length
        : products.filter((row) => row.label === tab.value).length,
    ]),
  );
  const shownCost = visible.reduce((sum, row) => sum + row.cost, 0);
  const shownSales = visible.reduce((sum, row) => sum + row.conversionValue, 0);
  const shownConversions = visible.reduce(
    (sum, row) => sum + row.conversions,
    0,
  );
  const grossMargin = snapshot.breakEvenRoas > 0 ? 1 / snapshot.breakEvenRoas : 0;
  const shownProfit = shownSales * grossMargin - shownCost;
  const labelRows = (value: ProductPerformanceLabel) =>
    products.filter((row) => row.label === value);
  const labelTotals = (value: ProductPerformanceLabel) => {
    const rows = labelRows(value);
    const cost = rows.reduce((sum, row) => sum + row.cost, 0);
    const sales = rows.reduce((sum, row) => sum + row.conversionValue, 0);
    const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);
    const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    return {
      rows,
      cost,
      sales,
      conversions,
      clicks,
      roas: cost > 0 ? sales / cost : null,
      profit: sales * grossMargin - cost,
    };
  };
  const losers = labelTotals("LOSS_MAKER");
  const lossProduced = losers.rows.reduce(
    (sum, row) => sum + (row.financialImpact ?? 0),
    0,
  );
  const setTableSort = (metric: SortMetric) => {
    if (metric === sort)
      setSortDirection((value) => (value === "desc" ? "asc" : "desc"));
    else {
      setSort(metric);
      setSortDirection(
        metric === "title" || metric === "productId" || metric === "label"
          ? "asc"
          : "desc",
      );
    }
  };
  const exportCsv = () => {
    const fields = [
      "Product",
      "Item ID",
      "Label",
      "Impressions",
      "Clicks",
      "Budget",
      "Sales count",
      "Revenue",
      "CPA",
      "ROAS",
    ];
    const rows = visible.map((row) => [
      row.title,
      row.productId,
      labelText[row.label],
      row.impressions,
      row.clicks,
      row.cost,
      row.conversions,
      row.conversionValue,
      row.cpa ?? "",
      row.roas,
    ]);
    const csv = [fields, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "google-ads-product-profitability.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="reportArtifact" data-report-dashboard="live">
        <div className="reportApp">
          <nav className="reportRail" aria-label="Report navigation">
            <div className="brand">
              <span className="brandMark">D</span>
              <div>
                <b>DEVRIKA</b>
                <small>Ads reporting</small>
              </div>
            </div>
            <div className="railGroup">
              <span>Report</span>
              <button type="button" className="navItem active">
                ▥ <span>Your data</span>
              </button>
              <button type="button" className="navItem">
                ↗ <span>Optimization potential</span>
              </button>
            </div>
            <div className="railFoot">
              <div className="accountCard">
                <b>{snapshot.accountName}</b>
                <span>{snapshot.website}</span>
                <em>Read-only report</em>
              </div>
            </div>
          </nav>
          <div className="reportMain">
            <header className="reportTopbar">
              <div className="crumbs">
                <b>{snapshot.accountName}</b>
                <span>›</span>
                <span>Shopping &amp; Performance Max</span>
                <span>›</span>
                <span>Product profitability</span>
              </div>
              <div className="topbarSpacer" />
              <div className="topbarActions">
                {periodSelector ? (
                  <form
                    action={periodSelector.action}
                    method="get"
                    className="periodForm"
                  >
                    <label className="topChip" htmlFor="reporting-period">
                      ▣{" "}
                      <select
                        id="reporting-period"
                        name="report"
                        aria-label="Reporting period"
                        defaultValue={periodSelector.selected}
                      >
                        {periodSelector.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="applyButton" type="submit">
                      Apply period
                    </button>
                  </form>
                ) : (
                  <span className="topChip">
                    ▣ <b>{periodLabel}</b>
                  </span>
                )}
                <span className="topChip">
                  <i className="liveDot" />
                  Google Ads data ·{" "}
                  <b>
                    {updatedAt
                      ? new Date(updatedAt).toLocaleString("ro-RO")
                      : "Current report"}
                  </b>
                </span>
                <button
                  className="exportButton"
                  type="button"
                  onClick={exportCsv}
                >
                  Export CSV
                </button>
                <a className="actionButton" href="#optimization-plan">
                  Get the action plan
                </a>
              </div>
            </header>
            {demo && (
              <div
                className="demoBar"
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "8px 24px",
                  borderBottom: "1px solid #f0dfb4",
                  background: "#fff8e8",
                  color: "#7a5a10",
                  fontSize: 11.5,
                }}
              >
                <b>MOD DEMO</b> — figures below are simulated and do not come
                from a live account.
              </div>
            )}
            <main className="reportPage">
              <div className="pageHead">
                <div>
                  <h1>Product profitability</h1>
                  <p>
                    Performance measured directly from your connected Google Ads
                    account, for the selected reporting period.
                  </p>
                </div>
                <div className="meta">
                  Currency <b>RON</b>
                  <span>Read-only audit · {periodLabel}</span>
                </div>
              </div>
              <section
                className="statusBand"
                aria-label="Profitability targets"
                data-dashboard-block="targets"
              >
                <div className="targetIntro">
                  <span className="targetIcon">◎</span>
                  <div>
                    <strong>Your profitability targets</strong>
                    <span>
                      Calculated from the business data confirmed during your
                      scan.
                    </span>
                  </div>
                </div>
                <Target
                  label="Max CPA"
                  value={money(snapshot.breakEvenCpa)}
                  note="Maximum cost for one sale"
                />
                <Target
                  label="Min ROAS"
                  value={ratio(snapshot.breakEvenRoas)}
                  note="Minimum return required for profitability"
                />
              </section>
              <section
                className="losersBand"
                aria-label="Losers measured results"
                data-dashboard-block="losers"
              >
                <div className="losersIntro">
                  <i />
                  <div>
                    <strong>Losers</strong>
                    <span>
                      Products spending below your profitability threshold.
                    </span>
                    {!profitable && <b>Below break-even</b>}
                  </div>
                </div>
                <ResultMetric
                  label="Products"
                  value={number(losers.rows.length)}
                />
                <ResultMetric
                  label="Budget consumed"
                  value={money(losers.cost)}
                />
                <ResultMetric
                  label="Loss produced"
                  value={
                    lossProduced > 0 ? `−${money(lossProduced)}` : money(0)
                  }
                />
              </section>
              <section
                className="persistentLabels"
                aria-label="Permanent product label results"
                data-dashboard-block="persistent-labels"
              >
                {(
                  [
                    "LOSS_MAKER",
                    "UNDERPROMOTED_POTENTIAL",
                    "NOT_PROMOTED",
                    "PERFORMER",
                  ] as ProductPerformanceLabel[]
                ).map((value) => (
                  <LabelCard
                    key={value}
                    label={value}
                    totals={labelTotals(value)}
                  />
                ))}
              </section>
              <section
                className="kpis"
                aria-label="Account key performance indicators"
                data-dashboard-block="kpis"
              >
                <Kpi
                  label="Cost"
                  value={money(snapshot.current.spend)}
                  detail="Measured spend"
                />
                <Kpi
                  label="Sales"
                  value={money(snapshot.current.revenue)}
                  detail="Conversion value"
                />
                <Kpi
                  label="Clicks"
                  value={clicks === undefined ? "—" : number(clicks)}
                  detail="Paid traffic"
                />
                <Kpi
                  label="Conversions"
                  value={number(snapshot.current.orders)}
                  detail="Store orders"
                />
                <Kpi
                  label="Conv. rate"
                  value={percent(conversionRate)}
                  detail="Orders / clicks"
                />
                <Kpi
                  label="Cost / conv."
                  value={
                    snapshot.current.cpa === null
                      ? "—"
                      : money(snapshot.current.cpa)
                  }
                  detail={`Max ${money(snapshot.breakEvenCpa)}`}
                />
                <Kpi
                  label="ROAS"
                  value={ratio(snapshot.current.roas)}
                  detail={`${profitable ? "Above" : "Below"} ${ratio(snapshot.breakEvenRoas)} minimum`}
                  accent={profitable ? "good" : "bad"}
                />
              </section>
              <section
                className="breakdownPanel"
                aria-label="Real results by product label"
                data-dashboard-block="budget-breakdown"
              >
                <div className="panelHead">
                  <div>
                    <h2>Where your advertising budget went</h2>
                    <p>
                      Real Google Ads results grouped by product label for the
                      selected reporting period.
                    </p>
                  </div>
                  <em>● Real data · Google Ads</em>
                </div>
                <div className="financialGrid">
                  {(
                    [
                      "LOSS_MAKER",
                      "UNDERPROMOTED_POTENTIAL",
                      "NOT_PROMOTED",
                      "PERFORMER",
                    ] as ProductPerformanceLabel[]
                  ).map((value) => (
                    <FinancialCard
                      key={value}
                      label={value}
                      totals={labelTotals(value)}
                    />
                  ))}
                </div>
              </section>
              <div
                className="reportTabs"
                role="tablist"
                aria-label="Report views"
                data-dashboard-block="tabs"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={label === tab.value}
                    onClick={() => setLabel(tab.value)}
                  >
                    {tab.label} <span>{counts[tab.value]}</span>
                  </button>
                ))}
              </div>
              <section
                className="productPanel"
                aria-label="Product performance table"
                data-dashboard-block="products"
              >
                <div className="panelHead">
                  <div>
                    <h2>
                      Products <span>— {products.length}</span>
                    </h2>
                    <p>
                      Every product in the report population. Exactly one label
                      per product.
                    </p>
                  </div>
                  <em>● Real data · Google Ads</em>
                </div>
                <div
                  className="categorySummary"
                  role="region"
                  aria-label="Product summary"
                >
                  <Summary
                    label="Products"
                    value={`${number(visible.length)} products`}
                  />
                  <Summary label="Budget" value={money(shownCost)} />
                  <Summary
                    label="Sales count"
                    value={`${number(shownConversions)} sales`}
                  />
                  <Summary label="Revenue" value={money(shownSales)} />
                  <Summary
                    label="Avg CPA"
                    value={
                      shownConversions > 0
                        ? money(shownCost / shownConversions)
                        : "—"
                    }
                  />
                  <Summary
                    label="ROAS"
                    value={shownCost ? ratio(shownSales / shownCost) : "—"}
                  />
                  <Summary
                    label="Profit / loss"
                    value={signedMoney(shownProfit)}
                  />
                </div>
                <div className="toolbar">
                  <label className="searchBox">
                    <span>⌕</span>
                    <input
                      aria-label="Search products"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search product or item ID"
                    />
                  </label>
                  <label className="srOnly">
                    Filter products
                    <select
                      aria-label="Filter products"
                      value={label}
                      onChange={(event) =>
                        setLabel(
                          event.target.value as ProductPerformanceLabel | "ALL",
                        )
                      }
                    >
                      <option value="ALL">All labels</option>
                      {Object.entries(labelText).map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="toolbarRight">
                    <label className="selectWrap">
                      Sort
                      <select
                        aria-label="Sort products"
                        value={sort}
                        onChange={(event) =>
                          setTableSort(event.target.value as SortMetric)
                        }
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span>
                      <b>{visible.length}</b> shown
                    </span>
                  </div>
                </div>
                <div
                  className="reportTable"
                  role="region"
                  aria-label="All product performance"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        <SortHeader
                          metric="title"
                          label="Product"
                          active={sort}
                          direction={sortDirection}
                          onSort={setTableSort}
                          className="stickProduct"
                        />
                        <SortHeader
                          metric="productId"
                          label="Item ID"
                          active={sort}
                          direction={sortDirection}
                          onSort={setTableSort}
                          className="stickId"
                        />
                        <SortHeader
                          metric="label"
                          label="Label"
                          active={sort}
                          direction={sortDirection}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="impressions"
                          label="Impressions"
                          active={sort}
                          direction={sortDirection}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="clicks"
                          label="Clicks"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="cost"
                          label="Cost"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="conversions"
                          label="Conversions"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="conversionRate"
                          label="Conv. rate"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="clicksPerSale"
                          label="Clicks / sale"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="conversionValue"
                          label="Sales"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="cpa"
                          label="CPA"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="roas"
                          label="ROAS"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="profitabilityGap"
                          label="ROAS gap"
                          active={sort}
                          onSort={setTableSort}
                        />
                        <SortHeader
                          metric="financialImpact"
                          label="Financial impact"
                          active={sort}
                          onSort={setTableSort}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row, index) => (
                        <tr
                          key={row.productId}
                          className={index % 2 ? "zebra" : ""}
                        >
                          <td className="stickProduct">
                            <div className="productCell">
                              <Image
                                data-product-thumbnail
                                src={productThumbnail(row.title)}
                                alt=""
                                width={36}
                                height={36}
                                unoptimized
                                loading="lazy"
                              />
                              <div>
                                <strong>{row.title}</strong>
                                <small>
                                  {categoryText(
                                    (
                                      row as typeof row & {
                                        category?: string;
                                      }
                                    ).category,
                                  )} · Price unavailable
                                </small>
                              </div>
                            </div>
                          </td>
                          <td className="stickId">
                            <code>{row.productId}</code>
                            <button
                              type="button"
                              className="copyId"
                              aria-label={`Copy item ID ${row.productId}`}
                              onClick={() =>
                                void navigator.clipboard?.writeText(
                                  row.productId,
                                )
                              }
                            >
                              □
                            </button>
                          </td>
                          <td>
                            <span className={`productLabel ${row.label}`}>
                              <i />
                              {labelText[row.label]}
                            </span>
                          </td>
                          <td>{number(row.impressions)}</td>
                          <td>{number(row.clicks)}</td>
                          <td>{money(row.cost)}</td>
                          <td>{number(row.conversions)}</td>
                          <td>{percent(row.conversionRate)}</td>
                          <td>
                            {row.clicksPerSale === null
                              ? "—"
                              : row.clicksPerSale.toFixed(1)}
                          </td>
                          <td>{money(row.conversionValue)}</td>
                          <td>{row.cpa === null ? "—" : money(row.cpa)}</td>
                          <td
                            className={
                              row.profitabilityGap >= 0
                                ? "positive"
                                : "negative"
                            }
                          >
                            <span className="roasCell">
                              <span className="roasBar" data-roas-bar>
                                <i
                                  className={
                                    row.profitabilityGap >= 0 ? "ok" : "no"
                                  }
                                  style={{
                                    width: `${Math.min(100, Math.max(0, (row.roas / Math.max(snapshot.breakEvenRoas * 1.5, 1)) * 100))}%`,
                                  }}
                                />
                                <b
                                  style={{
                                    left: `${Math.min(100, 100 / 1.5)}%`,
                                  }}
                                />
                              </span>
                              {ratio(row.roas)}
                            </span>
                          </td>
                          <td
                            className={
                              row.profitabilityGap >= 0
                                ? "positive"
                                : "negative"
                            }
                          >
                            {row.profitabilityGap >= 0 ? "+" : ""}
                            {row.profitabilityGap.toFixed(2)}×
                          </td>
                          <td>
                            {row.financialImpact === null ? (
                              "—"
                            ) : (
                              <span
                                className={`impact ${row.financialImpactKind === "MEASURED_RISK" ? "risk" : "opportunity"}`}
                              >
                                <strong>{money(row.financialImpact)}</strong>
                                <small>
                                  {row.financialImpactKind === "MEASURED_RISK"
                                    ? "Measured risk"
                                    : "Estimated opportunity"}
                                </small>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty">
                      <b>No products match these filters.</b>
                      <span>Clear the search or select a different label.</span>
                    </div>
                  )}
                </div>
                <footer className="tableFoot" aria-label="Product totals">
                  <div>
                    <span data-total>
                      Filtered cost <b>{money(shownCost)}</b>
                    </span>
                    <span data-total>
                      Filtered sales <b>{money(shownSales)}</b>
                    </span>
                    <span data-total>
                      Filtered clicks <b>{number(visible.reduce((sum, row) => sum + row.clicks, 0))}</b>
                    </span>
                    <span data-total>
                      Filtered conversions <b>{number(shownConversions)}</b>
                    </span>
                    <span data-total>
                      Filtered ROAS{" "}
                      <b>{shownCost ? ratio(shownSales / shownCost) : "—"}</b>
                    </span>
                  </div>
                  <span>
                    Scroll horizontally for every column · product and item ID
                    stay pinned
                  </span>
                </footer>
              </section>
            </main>
          </div>
        </div>
        <style>{dashboardCss}</style>
      </div>
      <div className="simulatorFrame" id="optimization-plan">
        <ProfitabilitySimulator
          analysis={analysis}
          averageOrderValue={snapshot.averageOrderValue}
          snapshot={snapshot}
        />
      </div>
    </>
  );
}

function Target({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="targetCard">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function Kpi({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "good" | "bad";
}) {
  return (
    <div className={`kpi ${accent ? `accent${accent}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <div className="kpiTrend" data-kpi-trend="unavailable">
        <span>Unavailable</span>
      </div>
      <svg
        data-kpi-sparkline="unavailable"
        viewBox="0 0 42 12"
        aria-hidden="true"
      >
        <path d="M1 6 L41 6" />
      </svg>
    </div>
  );
}
type LabelTotals = {
  rows: unknown[];
  cost: number;
  sales: number;
  conversions: number;
  clicks: number;
  roas: number | null;
  profit: number;
};
function ResultMetric({
  label,
  value,
  labelMetric = false,
}: {
  label: string;
  value: string;
  labelMetric?: boolean;
}) {
  return (
    <div className="resultMetric" data-label-metric={labelMetric || undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function LabelCard({
  label,
  totals,
}: {
  label: ProductPerformanceLabel;
  totals: LabelTotals;
}) {
  const copy = labelCardText[label];
  return (
    <article className={`labelCard ${label}`}>
      <div className="labelIntro">
        <i />
        <div>
          <strong>{copy.title}</strong>
          <span className="labelDescription">{copy.description}</span>
        </div>
      </div>
      <div className="labelNumbers">
        <ResultMetric
          label="Products"
          value={number(totals.rows.length)}
          labelMetric
        />
        <ResultMetric label="Spend" value={money(totals.cost)} labelMetric />
        <ResultMetric
          label="Profit / Loss"
          value={signedMoney(totals.profit)}
          labelMetric
        />
      </div>
    </article>
  );
}
function FinancialCard({
  label,
  totals,
}: {
  label: ProductPerformanceLabel;
  totals: LabelTotals;
}) {
  return (
    <article className="financialCard">
      <div className="financialHead">
        <span className={`productLabel ${label}`}>
          <i />
          {labelText[label]}
        </span>
        <small>{totals.rows.length} products</small>
      </div>
      <div className="financialMetrics">
        <ResultMetric label="Budget" value={money(totals.cost)} />
        <ResultMetric label="Sales" value={number(totals.conversions)} />
        <ResultMetric label="Revenue" value={money(totals.sales)} />
        <ResultMetric
          label="Avg CPA"
          value={
            totals.conversions > 0
              ? money(totals.cost / totals.conversions)
              : "—"
          }
        />
        <ResultMetric label="ROAS" value={ratio(totals.roas)} />
        <ResultMetric
          label="Profit / Loss"
          value={signedMoney(totals.profit)}
        />
      </div>
    </article>
  );
}
function SortHeader({
  metric,
  label,
  active,
  direction,
  onSort,
  className,
}: {
  metric: SortMetric;
  label: string;
  active: SortMetric;
  direction?: "asc" | "desc";
  onSort: (metric: SortMetric) => void;
  className?: string;
}) {
  return (
    <th
      className={`${className ?? ""} ${active === metric ? "sorted" : ""}`.trim()}
      aria-label={label}
      aria-sort={
        active === metric
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(metric)}
        aria-label={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <span>{active === metric && direction === "asc" ? "▴" : "▾"}</span>
      </button>
    </th>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const dashboardCss = `.srOnly{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.reportArtifact{overflow-x:hidden}
.reportArtifact{--rail:#f8fafd;--railHi:#c2e7ff;--canvas:#f1f3f4;--surface2:#f8fafd;--surface3:#f1f3f4;--line:#dadce0;--lineSoft:#e8eaed;--ink:#202124;--ink2:#3c4043;--ink3:#5f6368;--blue:#1a73e8;--blue2:#0b57d0;--blueSoft:#e7effc;--green:#106b41;--greenSoft:#e3f5ea;--red:#c02617;--redSoft:#fdeae7;--amber:#96590a;--amberSoft:#fdf1dc;color:var(--ink);background:var(--canvas);font-family:"Google Sans",Roboto,Arial,sans-serif;font-size:13px;line-height:1.45;min-height:100vh}.reportArtifact *{box-sizing:border-box}.reportApp{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh}.reportRail{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:18px;padding:18px 14px;background:var(--rail);border-right:1px solid var(--line);color:var(--ink2)}.brand{display:flex;align-items:center;gap:10px;padding:2px 6px}.brandMark{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:var(--blue);color:#fff;font-size:15px;font-weight:800}.brand b{display:block;font-size:14px;letter-spacing:.14em}.brand small{display:block;color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase}.railGroup>span{display:block;padding:0 10px 6px;color:var(--ink3);font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.navItem{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:20px;background:transparent;color:var(--ink2);font:inherit;text-align:left}.navItem.active{background:var(--railHi);color:#001d35;font-weight:600}.railFoot{margin-top:auto;border-top:1px solid var(--line);padding-top:14px}.accountCard{padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff}.accountCard b,.accountCard span{display:block}.accountCard span{color:var(--ink3);font-size:10.5px;overflow:hidden;text-overflow:ellipsis}.accountCard em{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid #a8c7fa;border-radius:999px;background:#e8f0fe;color:var(--blue2);font-size:9.5px;font-style:normal;font-weight:800;text-transform:uppercase}.reportMain{min-width:0}.reportTopbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:14px;padding:11px 24px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.94);backdrop-filter:saturate(1.4) blur(8px)}.crumbs{display:flex;align-items:center;gap:8px;color:var(--ink3);font-size:12px;white-space:nowrap}.crumbs b{color:var(--ink)}.topbarSpacer{margin-left:auto}.topbarActions{display:flex;align-items:center;gap:8px;min-width:max-content}.topChip{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#fff;white-space:nowrap}.topChip select{max-width:160px;border:0;background:transparent;font:inherit;font-weight:600}.periodForm{display:flex;gap:6px}.applyButton,.exportButton,.actionButton{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font:inherit;font-weight:600;text-decoration:none;white-space:nowrap}.applyButton,.actionButton{border-color:var(--blue2);background:var(--blue2);color:#fff}.liveDot{width:7px;height:7px;border-radius:50%;background:#22a06b;box-shadow:0 0 0 3px rgba(34,160,107,.16)}.reportPage{width:100%;max-width:1720px;padding:22px 24px 64px}.pageHead{display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:16px}.pageHead h1{margin:0;font-size:24px}.pageHead p{margin:5px 0 0;color:var(--ink2);font-size:12.5px}.meta{margin-left:auto;color:var(--ink3);font-size:11px;text-align:right}.meta b,.meta span{display:block;color:var(--ink)}.statusBand{display:grid;grid-template-columns:minmax(320px,1fr) minmax(220px,.55fr) minmax(220px,.55fr);gap:1px;margin-bottom:14px;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:var(--line)}.statusBand>div{padding:18px 20px;background:#fff}.statusMain{display:flex;align-items:center;gap:14px}.targetIcon{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:var(--blueSoft);color:var(--blue2);font-size:25px}.statusMain.good .targetIcon{background:var(--greenSoft);color:var(--green)}.statusMain strong{display:block;color:var(--red);font-size:16px}.statusMain.good strong{color:var(--green)}.statusMain span{display:block;color:var(--ink3);font-size:12px}.targetCard span{color:var(--ink3);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.targetCard strong{display:block;margin-top:5px;color:var(--blue2);font-size:28px}.targetCard small{display:block;color:var(--ink3);font-size:11px}.kpis{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;margin-bottom:18px;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:var(--line)}.kpi{position:relative;min-width:0;min-height:104px;padding:14px 16px 12px;background:#fff}.kpi>span{display:block;color:var(--ink3);font-size:10.5px;font-weight:700;text-transform:uppercase}.kpi>strong{display:block;margin-top:6px;font-size:22px;white-space:nowrap}.kpi>small{display:block;margin-top:6px;color:var(--ink3);font-size:11px}.kpiTrend{display:flex;align-items:center;min-height:20px;margin-top:5px}.kpiTrend span{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:var(--surface3);color:var(--ink3);font-size:9px}.kpi.accentgood{box-shadow:inset 0 -3px 0 #1f9e63}.kpi.accentbad{box-shadow:inset 0 -3px 0 #d9483a}.reportTabs{display:inline-flex;margin-bottom:14px;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:#fff}.reportTabs button{height:40px;padding:0 20px;border:0;border-right:1px solid var(--line);background:#fff;font:inherit;font-weight:600}.reportTabs button[aria-selected=true]{background:var(--blue);color:#fff}.reportTabs button span{opacity:.7}.productPanel{overflow:hidden;border:1px solid var(--line);border-radius:16px;background:#fff}.panelHead{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;padding:16px 18px 12px;border-bottom:1px solid var(--lineSoft)}.panelHead h2{margin:0;font-size:17px}.panelHead h2 span{color:#a8b1c2}.panelHead p{margin:4px 0 0;color:var(--ink2);font-size:12px}.panelHead em{margin-left:auto;padding:3px 8px;border-radius:999px;background:var(--blueSoft);color:var(--blue2);font-size:10px;font-style:normal}.categorySummary{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;border-bottom:1px solid var(--line);background:var(--lineSoft)}.categorySummary>div{min-width:0;padding:11px 16px;background:#fff}.categorySummary span{display:block;color:var(--ink3);font-size:9.5px;font-weight:700;text-transform:uppercase}.categorySummary strong{display:block;margin-top:5px;overflow:hidden;font-size:17px;text-overflow:ellipsis;white-space:nowrap}.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 18px;border-bottom:1px solid var(--lineSoft);background:var(--surface2)}.searchBox{position:relative}.searchBox span{position:absolute;left:10px;top:5px;font-size:20px}.searchBox input{width:270px;height:34px;padding:0 12px 0 32px;border:1px solid var(--line);border-radius:8px;font:inherit}.selectWrap{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink3)}.selectWrap select{max-width:210px;border:0;background:transparent;color:var(--ink);font:inherit;font-weight:600}.toolbarRight{display:flex;align-items:center;gap:10px;margin-left:auto;color:var(--ink3)}.reportTable{position:relative;max-height:620px;overflow:auto;background:#fff}.reportTable table{width:100%;min-width:1560px;border-collapse:separate;border-spacing:0;font-size:12px}.reportTable th,.reportTable td{height:50px;padding:0 12px;border-bottom:1px solid var(--lineSoft);background:#fff;text-align:right;white-space:nowrap}.reportTable th{position:sticky;top:0;z-index:20;height:40px;background:var(--surface3);color:var(--ink2);font-size:10px;text-transform:uppercase}.reportTable tr:hover td{background:#f6f9ff}.reportTable tr.zebra td{background:#fcfdff}.reportTable .stickProduct{position:sticky;left:0;z-index:15;text-align:left}.reportTable .stickId{position:sticky;left:296px;z-index:15;text-align:left}.reportTable th.stickProduct,.reportTable th.stickId{z-index:30;background:var(--surface3)}.reportTable .stickId:after{content:"";position:absolute;top:0;right:-10px;bottom:0;width:10px;background:linear-gradient(90deg,rgba(19,26,43,.10),transparent)}.productCell{display:flex;align-items:center;gap:10px;width:272px}.productCell>span{width:36px;height:36px;display:grid;flex:0 0 36px;place-items:center;border:1px solid var(--line);border-radius:8px;background:var(--surface3);color:var(--ink3);font-size:10px;font-weight:700}.productCell strong,.productCell small{display:block;max-width:214px;overflow:hidden;text-align:left;text-overflow:ellipsis}.productCell small{color:var(--ink3);font-size:9.5px}.productLabel{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:10.5px;font-weight:700}.productLabel i{width:7px;height:7px;border-radius:2px}.LOSS_MAKER{background:var(--redSoft);color:var(--red)}.LOSS_MAKER i{background:#d9483a}.NOT_PROMOTED{background:#eef0f4;color:#4a5568}.NOT_PROMOTED i{background:#8a94a6}.UNDERPROMOTED_POTENTIAL{background:var(--amberSoft);color:var(--amber)}.UNDERPROMOTED_POTENTIAL i{background:#e0a02c}.PERFORMER{background:var(--greenSoft);color:var(--green)}.PERFORMER i{background:#1f9e63}.INSUFFICIENT_DATA{background:#eef2fb;color:#4b5b7a}.INSUFFICIENT_DATA i{background:#93a2c0}.positive{color:var(--green);font-weight:700}.negative{color:var(--red);font-weight:700}.impact{display:inline-flex;padding:3px 8px;border-radius:7px}.impact strong,.impact small{display:block}.impact small{font-size:9px}.impact.risk{background:var(--redSoft);color:var(--red)}.impact.opportunity{background:var(--greenSoft);color:var(--green)}.empty{padding:56px;text-align:center}.empty b,.empty span{display:block}.tableFoot{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:11px 18px;border-top:1px solid var(--line);background:var(--surface2);color:var(--ink3)}.tableFoot>div{display:flex;gap:18px;flex-wrap:wrap}.tableFoot b{color:var(--ink)}.simulatorFrame{background:#f1f3f4;padding:0 24px 64px}
 .targetIntro{display:flex;align-items:center;gap:14px}.targetIntro strong{display:block;font-size:16px}.targetIntro span{display:block;color:var(--ink3);font-size:12px}.losersBand{display:grid;grid-template-columns:minmax(230px,1.25fr) repeat(3,minmax(120px,.65fr));margin-bottom:8px;overflow:hidden;border:1px solid #f2c7c3;border-radius:18px;background:#fff}.losersIntro{display:flex;align-items:center;gap:11px;padding:15px 18px}.losersIntro>i{width:11px;height:11px;border-radius:50%;background:#d9483a}.losersIntro strong,.losersIntro span{display:block}.losersIntro strong{font-size:16px;color:var(--red)}.losersIntro span{color:var(--ink3);font-size:11px}.resultMetric{display:flex;flex-direction:column;justify-content:center;padding:13px 15px;border-left:1px solid var(--lineSoft)}.resultMetric span{color:var(--ink3);font-size:9.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.resultMetric strong{margin-top:5px;font-size:17px}.persistentLabels{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:14px;padding:8px 0;background:var(--canvas)}.labelCard{min-height:114px;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:#fff}.labelIntro{display:flex;align-items:center;gap:8px;min-height:48px;padding:8px 11px}.labelIntro>i{width:9px;height:9px;flex:0 0 9px;border-radius:50%}.labelIntro strong,.labelDescription{display:block}.labelIntro strong{font-size:11px}.labelDescription{margin-top:2px;color:var(--ink3);font-size:9.5px;line-height:1.2}.labelNumbers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--lineSoft)}.labelNumbers .resultMetric{min-width:0;padding:8px 7px;border-left:1px solid var(--lineSoft)}.labelNumbers .resultMetric:first-child{border-left:0}.labelNumbers .resultMetric span{font-size:7.5px;white-space:nowrap}.labelNumbers .resultMetric strong{margin-top:3px;overflow:hidden;font-size:10.5px;text-overflow:ellipsis;white-space:nowrap}.labelCard.LOSS_MAKER .labelIntro>i{background:#d9483a}.labelCard.UNDERPROMOTED_POTENTIAL .labelIntro>i{background:#e0a02c}.labelCard.NOT_PROMOTED .labelIntro>i{background:#8a94a6}.labelCard.PERFORMER .labelIntro>i{background:#1f9e63}.breakdownPanel{margin-bottom:14px;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:#fff}.financialGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:14px 18px 18px}.financialCard{overflow:hidden;border:1px solid var(--line);border-radius:14px}.financialHead{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;background:var(--surface2)}.financialHead small{color:var(--ink3)}.financialMetrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-top:1px solid var(--lineSoft)}.financialMetrics .resultMetric{min-width:0;padding:8px;border-left:1px solid var(--lineSoft)}.financialMetrics .resultMetric:first-child{border-left:0}.financialMetrics .resultMetric span{font-size:8px}.financialMetrics .resultMetric strong{overflow:hidden;font-size:10.5px;text-overflow:ellipsis;white-space:nowrap}.kpi svg{position:absolute;right:10px;top:11px;width:42px;height:12px;opacity:.45}.kpi svg path{fill:none;stroke:#7c8ba1;stroke-width:1.3}.filterChips{display:flex;gap:6px;flex-wrap:wrap}.filterChips button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:#fff;font:inherit;font-size:11px}.filterChips button[aria-pressed=true]{border-color:var(--ink);background:var(--ink);color:#fff}.filterChips i{width:7px;height:7px;border-radius:2px}.filterChips i.LOSS_MAKER{background:#d9483a}.filterChips i.UNDERPROMOTED_POTENTIAL{background:#e0a02c}.filterChips i.NOT_PROMOTED{background:#8a94a6}.filterChips i.PERFORMER{background:#1f9e63}.filterChips i.INSUFFICIENT_DATA{background:#93a2c0}.reportTable th button{display:flex;align-items:center;justify-content:flex-end;gap:5px;width:100%;height:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-weight:700;text-transform:uppercase}.reportTable th.sorted{background:#e6eefb;color:var(--blue2)}.copyId{margin-left:5px;border:0;background:transparent;color:var(--ink3);cursor:pointer}.roasCell{display:flex;align-items:center;justify-content:flex-end;gap:8px}.roasBar{position:relative;width:56px;height:6px;overflow:hidden;border-radius:999px;background:var(--surface3)}.roasBar i{position:absolute;inset:0 auto 0 0;border-radius:999px}.roasBar i.ok{background:#1f9e63}.roasBar i.no{background:#d9483a}.roasBar b{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ink);opacity:.55}
.productCell>img{width:36px;height:36px;display:block;flex:0 0 36px;border:1px solid var(--line);border-radius:8px;object-fit:cover;background:var(--surface3)}
@media(min-width:1121px){.crumbs{max-width:320px;overflow:hidden}}
@media(max-width:1400px){.kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.categorySummary{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:1120px){.reportApp{grid-template-columns:1fr}.reportRail{position:static;height:auto;flex-direction:row;align-items:center;overflow:auto}.reportRail .railGroup,.reportRail .railFoot{display:none}.statusBand{grid-template-columns:1fr}.reportTopbar{align-items:flex-start;overflow:auto}.crumbs{flex:0 0 auto}.topbarActions{flex:0 0 auto}}
@media(max-width:720px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}.reportPage{padding:16px 14px 48px}.categorySummary,.persistentLabels{grid-template-columns:repeat(2,minmax(0,1fr))}.financialGrid{grid-template-columns:1fr;padding:12px}.losersBand{grid-template-columns:1fr 1fr}.losersIntro{grid-column:1/-1}.losersBand>.resultMetric{border-top:1px solid var(--lineSoft);border-left:0}.reportTabs{display:flex;overflow:auto}.reportTabs button{flex:0 0 auto;padding:0 15px}.searchBox{flex:1 1 100%}.searchBox input{width:100%}.toolbarRight{width:100%;margin-left:0;justify-content:space-between}.simulatorFrame{padding:0;scroll-margin-top:12px}}
`;
