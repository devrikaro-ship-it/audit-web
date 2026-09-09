import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const requireManagerAccess = vi.hoisted(() => vi.fn());
const registeredReports = vi.hoisted(() => vi.fn());
const readManagerReport = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({ source: undefined as unknown }));

vi.mock("@/lib/gads-manager", () => ({
  requireManagerAccess,
  registeredReports,
  readManagerReport,
  managerAccountKey: (lead: { customerId: string }) => lead.customerId,
}));
vi.mock("@/app/google-ads/raport/ReportingDashboard", () => ({
  default: ({ sourceSnapshot }: { sourceSnapshot?: unknown }) => {
    captured.source = sourceSnapshot;
    return <div data-report-dashboard="v2" />;
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

import ManagerReportPage from "./page";

const lead = {
  id: "lead-1",
  customerId: "customer-1",
  customerName: "Fitness Store",
  createdAt: Date.parse("2026-09-09T08:00:00.000Z"),
  reportId: "report-1",
};

const productAnalysis = {
  breakEvenRoas: 5,
  months: 12,
  currentMonthlySpend: 120,
  lossProductMonthlyCap: 10,
  economicBudgetLimit: 240,
  losses: [],
  opportunities: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  captured.source = undefined;
  requireManagerAccess.mockResolvedValue(undefined);
  registeredReports.mockResolvedValue([lead]);
  readManagerReport.mockResolvedValue({
    report: {},
    snapshot: {
      generatedAt: "2026-09-09T08:00:00.000Z",
      evidenceMonths: 12,
      website: "https://private.example",
      refreshToken: "must-not-cross-the-client-boundary",
      accountName: "Fitness Store",
      averageOrderValue: 100,
      goodsCost: 40,
      breakEvenCpa: 75,
      breakEvenRoas: 5,
      current: { spend: 120, revenue: 300, orders: 2, cpa: 60, roas: 2.5 },
      optimized: { spend: 120, revenue: 900, orders: 6, cpa: 20, roas: 7.5 },
      losses: [],
      opportunities: [],
      productAnalysis,
      reportV2: { currencyCode: "EUR" },
    },
  });
});

it("passes only the explicit before-and-after source into the manager renderer", async () => {
  const html = renderToStaticMarkup(await ManagerReportPage({
    params: Promise.resolve({ id: lead.id }),
    searchParams: Promise.resolve({}),
  }));

  expect(html).toContain('data-report-dashboard="v2"');
  expect(captured.source).toEqual({
    currencyCode: "EUR",
    evidenceMonths: 12,
    minimumRoasTarget: 5,
    maximumCpaTarget: 75,
    current: { spend: 120, revenue: 300, orders: 2, cpa: 60, roas: 2.5 },
    optimized: { spend: 120, revenue: 900, orders: 6, cpa: 20, roas: 7.5 },
    productAnalysis,
  });
  expect(captured.source).not.toHaveProperty("website");
  expect(captured.source).not.toHaveProperty("refreshToken");
});
