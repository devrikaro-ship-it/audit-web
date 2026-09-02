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

beforeEach(() => {
  vi.clearAllMocks();
  listPortalReports.mockResolvedValue([{ id: "lead-1", createdAt: 1, reportId: "report-1", reportToken: "report-token", snapshotPath: "/data/report.snapshot" }]);
  readStoredReportSnapshot.mockResolvedValue("signed-report");
  openReportSnapshot.mockReturnValue(snapshot);
});

it("renders the complete selected report inside the client portal without a PDF link", async () => {
  const html = renderToStaticMarkup(await ClientReportPortal({ params: Promise.resolve({ token: "portal-token" }), searchParams: Promise.resolve({}) }));
  expect(html).toContain('data-report-dashboard="live"');
  expect(html).toContain('aria-label="All product performance"');
  expect(html).toContain("Current live report");
  expect(html).toContain("August 2026");
  expect(html).toContain("12-month average");
  expect(html).not.toContain("1-month average");
  expect(html).not.toContain("January 1970");
  expect(html).not.toContain("Open PDF");
  expect(html).not.toContain("application/pdf");
  expect(html).not.toContain("<iframe");
});

it("cannot select a report outside the token-scoped portal population", async () => {
  const html = renderToStaticMarkup(await ClientReportPortal({ params: Promise.resolve({ token: "portal-token" }), searchParams: Promise.resolve({ report: "foreign-report" }) }));
  expect(listPortalReports).toHaveBeenCalledWith("portal-token");
  expect(html).toContain("Example Store");
  expect(html).not.toContain("foreign-report");
});
