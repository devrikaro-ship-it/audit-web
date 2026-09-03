import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const listPortalReports = vi.hoisted(() => vi.fn());
const readStoredReportSnapshot = vi.hoisted(() => vi.fn());
const openReportSnapshot = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gads-leads", () => ({ listPortalReports }));
vi.mock("@/lib/gads-report-snapshot", () => ({ readStoredReportSnapshot }));
vi.mock("@/lib/gads-report-delivery", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  openReportSnapshot,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import ClientReportPortal from "./page";

const productAnalysis = {
  breakEvenRoas: 5,
  months: 12,
  currentMonthlySpend: 1200,
  lossProductMonthlyCap: 10,
  economicBudgetLimit: 2400,
  losses: [],
  opportunities: [],
};

const snapshot = {
  generatedAt: "2026-08-27T08:00:00.000Z",
  website: "https://store.example",
  accountName: "Example Store",
  averageOrderValue: 500,
  goodsCost: 300,
  breakEvenCpa: 100,
  breakEvenRoas: 5,
  current: { spend: 1200, revenue: 3600, orders: 8, cpa: 150, roas: 3 },
  optimized: { spend: 1200, revenue: 6000, orders: 12, cpa: 100, roas: 5 },
  losses: [],
  opportunities: [],
  productAnalysis,
};

const v2Snapshot = {
  ...snapshot,
  accountName: "Current V2 Store",
  reportV2: {
    version: 2 as const,
    currencyCode: "EUR",
    periods: {
      selected: {
        range: { from: "2026-08-01", to: "2026-08-31" },
        spend: 1_200,
        salesVolume: 3_600,
        numberOfSales: 8,
      },
      previous: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        spend: 900,
        salesVolume: 4_500,
        numberOfSales: 10,
      },
      previousYear: null,
    },
    products: [{
      productId: "loss-product",
      title: "Current loss product",
      cost: 1_200,
      conversionValue: 3_600,
      conversions: 8,
      clicks: 120,
      impressions: 2_000,
      catalogEligible: true,
      sourceLabel: "LOSS_MAKER" as const,
    }],
    productPopulationStatus: "COMPLETE" as const,
    classificationDiagnostics: [],
  },
};

const olderV2Snapshot = {
  ...v2Snapshot,
  generatedAt: "2026-07-27T08:00:00.000Z",
  accountName: "Older allowed V2 Store",
  reportV2: {
    ...v2Snapshot.reportV2,
    products: [{
      ...v2Snapshot.reportV2.products[0],
      title: "Older allowed product",
    }],
    periods: {
      selected: {
        range: { from: "2026-07-01", to: "2026-07-31" },
        spend: 900,
        salesVolume: 4_500,
        numberOfSales: 10,
      },
      previous: null,
      previousYear: null,
    },
  },
};

const portalReports = [
  { id: "lead-1", createdAt: Date.parse(v2Snapshot.generatedAt), reportId: "report-1", reportToken: "report-token-1", snapshotPath: "/data/current.snapshot" },
  { id: "lead-2", createdAt: Date.parse(olderV2Snapshot.generatedAt), reportId: "report-2", reportToken: "report-token-2", snapshotPath: "/data/older.snapshot" },
];

beforeEach(() => {
  vi.clearAllMocks();
  listPortalReports.mockResolvedValue(portalReports);
  readStoredReportSnapshot.mockImplementation(async (path: string) => path);
  openReportSnapshot.mockImplementation((raw: string) => {
    if (raw === "/data/current.snapshot") return v2Snapshot;
    if (raw === "/data/older.snapshot") return olderV2Snapshot;
    return null;
  });
});

it("renders the selected signed report through the shared five-section V2 renderer without export output", async () => {
  const html = renderToStaticMarkup(await ClientReportPortal({ params: Promise.resolve({ token: "portal-token" }), searchParams: Promise.resolve({}) }));
  expect(html).toContain('data-report-dashboard="v2"');
  expect(Array.from(html.matchAll(/data-report-section="([^"]+)"/g), (match) => match[1])).toEqual([
    "brand-header",
    "account-summary",
    "primary-conclusions",
    "period-comparison",
    "product-actions",
  ]);
  expect(html).toContain("Current loss product");
  expect(html).toContain("1–31 august 2026");
  expect(html).toContain("EUR");
  expect(html).not.toContain("Profitability dashboard");
  expect(html).not.toContain("Monthly reports");
  expect(html).not.toContain("Open PDF");
  expect(html).not.toContain("application/pdf");
  expect(html).not.toContain("<iframe");
  expect(html).not.toContain('data-legacy-permanent-labels');
});

it("selects another report only when it belongs to the token-scoped portal population", async () => {
  const allowed = renderToStaticMarkup(await ClientReportPortal({ params: Promise.resolve({ token: "portal-token" }), searchParams: Promise.resolve({ report: "report-2" }) }));
  expect(allowed).toContain("Older allowed product");
  expect(allowed).toContain("1–31 iulie 2026");

  const html = renderToStaticMarkup(await ClientReportPortal({ params: Promise.resolve({ token: "portal-token" }), searchParams: Promise.resolve({ report: "foreign-report" }) }));
  expect(listPortalReports).toHaveBeenCalledWith("portal-token");
  expect(html).toContain("Current loss product");
  expect(html).not.toContain("Older allowed product");
  expect(html).not.toContain("foreign-report");
});

it("renders a legacy signed report with unavailable currency and comparison rows instead of zero values", async () => {
  const legacySnapshot = {
    ...snapshot,
    losses: [{
      productId: "legacy-excerpt",
      title: "Legacy excerpt without full metrics",
      cost: 400,
      revenue: 100,
      orders: 1,
    }],
  };
  listPortalReports.mockResolvedValue([{ ...portalReports[0], snapshotPath: "/data/legacy.snapshot" }]);
  openReportSnapshot.mockImplementation((raw: string) => raw === "/data/legacy.snapshot" ? legacySnapshot : null);

  const html = renderToStaticMarkup(await ClientReportPortal({ params: Promise.resolve({ token: "portal-token" }), searchParams: Promise.resolve({}) }));
  const comparisonRows = html.match(/<tr>.*?<\/tr>/g) ?? [];
  const previousRow = comparisonRows.find((row) => row.includes("Perioada anterioară")) ?? "";
  const previousYearRow = comparisonRows.find((row) => row.includes("Aceeași perioadă anul trecut")) ?? "";

  expect(html).toContain('data-report-dashboard="v2"');
  expect(html).toContain("Monedă indisponibilă");
  expect(previousRow.match(/Indisponibil/g)).toHaveLength(7);
  expect(previousYearRow.match(/Indisponibil/g)).toHaveLength(7);
  expect(previousRow).not.toMatch(/>0(?:[,.]0+)?</);
  expect(previousYearRow).not.toMatch(/>0(?:[,.]0+)?</);
  expect(html).not.toContain("RON");
  expect(html).not.toContain("Legacy excerpt without full metrics");
  expect(html).toContain("Date parțiale");
});
