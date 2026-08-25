import { beforeEach, describe, expect, it } from "vitest";
import { openReportSnapshot, renderReportHtml, sealReportSnapshot, type GadsReportSnapshot } from "./gads-report-delivery";

const snapshot: GadsReportSnapshot = {
  website: "https://fitn4ss.ro/",
  accountName: "Fitn4ss",
  averageOrderValue: 500,
  goodsCost: 300,
  breakEvenCpa: 100,
  breakEvenRoas: 5,
  current: { spend: 1000, revenue: 3200, orders: 8, cpa: 125, roas: 3.2 },
  optimized: { spend: 1000, revenue: 5800, orders: 12, cpa: 83.33, roas: 5.8 },
  losses: [{ productId: "loss", title: "Loss product", cost: 700, revenue: 700, orders: 1, cpa: 700, roas: 1, amount: 560 }],
  opportunities: [{ productId: "win", title: "Winning product", cost: 100, revenue: 1200, orders: 3, cpa: 33.33, roas: 12, amount: 1680 }],
};

describe("stored Google Ads report delivery", () => {
  beforeEach(() => { process.env.GADS_REPORT_SIGNING_SECRET = "test-report-secret"; });

  it("opens an unchanged signed snapshot and refuses modified content", () => {
    const signed = sealReportSnapshot(snapshot);
    expect(openReportSnapshot(signed)).toEqual(snapshot);
    const [payload, signature] = signed.split(".");
    const changed = Buffer.from(JSON.stringify({ ...snapshot, breakEvenRoas: 1 })).toString("base64url");
    expect(openReportSnapshot(`${changed}.${signature}`)).toBeNull();
    expect(openReportSnapshot(`${payload}.invalid`)).toBeNull();
  });

  it("renders measured and simulated values with their status labels", () => {
    const html = renderReportHtml(snapshot);
    expect(html).toContain("Measured from Google Ads");
    expect(html).toContain("Future simulation, not a promise");
    expect(html).toContain("Loss product");
    expect(html).toContain("Winning product");
    expect(html).toContain("20% estimated CSS CPC reduction");
    expect(html).not.toContain("Profit after advertising");
  });
});
