import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GadsLead } from "@/lib/gads-leads";
import type { GadsReportSnapshot } from "@/lib/gads-report-delivery";

const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(access.allowed ? { authorization: `Basic ${btoa("manager:local-test-pass")}` } : {}) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

let directory: string;
let ledger: string;

export function fixtureSnapshot(revenue = 600): GadsReportSnapshot {
  return {
    generatedAt: "2026-08-31T12:00:00Z", website: "https://fixture.example", accountName: "Fixture store",
    averageOrderValue: 100, goodsCost: 60, breakEvenCpa: 20, breakEvenRoas: 5,
    current: { spend: 100, revenue: 9999, orders: 10, cpa: 10, roas: 99.99 },
    optimized: { spend: 100, revenue: 9999, orders: 10, cpa: 10, roas: 99.99 },
    losses: [], opportunities: [],
    reportV2: {
      version: 2, currencyCode: "GBP",
      periods: { selected: { range: { from: "2026-08-01", to: "2026-08-31" }, spend: 100, salesVolume: revenue, numberOfSales: 10 }, previous: null, previousYear: null },
      products: [], productPopulationStatus: "COMPLETE", classificationDiagnostics: [],
    },
  };
}

async function record(id: string, customerId: string, createdAt: number, revenue: number, active?: boolean): Promise<GadsLead> {
  const { sealReportSnapshot } = await import("@/lib/gads-report-delivery");
  const snapshotPath = path.join(directory, "reports", `${id}.snapshot`);
  await writeFile(snapshotPath, sealReportSnapshot(fixtureSnapshot(revenue)));
  return { id, customerId, createdAt, nume: `Owner ${id}`, email: "same-owner@example.test", telefon: "123456789", customerName: `Store ${customerId}`, reportId: `report-${id}`, snapshotPath, reportToken: "private-report-token", portalToken: "private-portal-token", serviceReportsEnabled: active, breakEvenRoas: 100 };
}

beforeEach(async () => {
  vi.resetModules();
  access.allowed = true;
  directory = await mkdtemp(path.join(os.tmpdir(), "manager-control-"));
  ledger = path.join(directory, "gads-leads.json");
  await mkdir(path.join(directory, "reports"));
  vi.stubEnv("GADS_LEADS_FILE", ledger);
  vi.stubEnv("GADS_REPORTS_DIR", path.join(directory, "reports"));
  vi.stubEnv("DASH_USER", "manager");
  vi.stubEnv("DASH_PASS", "local-test-pass");
});

afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

it("groups registered reports by account and uses the latest signed measured period, not simulation or contact-only entries", async () => {
  const older = await record("older", "1111111111", 100, 300, false);
  const latest = await record("latest", "111-111-1111", 300, 600, true);
  const other = await record("other", "2222222222", 200, 300, false);
  const unregistered = { id: "contact-only", createdAt: 400, nume: "Do not list", email: "contact@example.test" };
  const contents = JSON.stringify([older, other, latest, unregistered]);
  await writeFile(ledger, contents);
  const Page = (await import("./page")).default;
  const html = renderToStaticMarkup(await Page());
  const document = new JSDOM(html).window.document;
  const rows = Array.from(document.querySelectorAll("tbody tr"));
  expect(rows).toHaveLength(2);
  expect(rows[0].textContent).toContain("Owner latest");
  expect(rows[0].textContent).toContain("Active");
  expect(rows[0].textContent).toContain("6.00×");
  expect(rows[0].textContent).toContain("5.00×");
  expect(rows[0].textContent).toContain("Above target");
  expect(rows[1].textContent).toContain("Inactive");
  expect(rows[1].textContent).toContain("Below target");
  expect(document.querySelector('a[href="/dashboard/google-ads/reports/latest"]')).not.toBeNull();
  expect(html).not.toMatch(/private-report-token|private-portal-token|Do not list|99\.99/);
  expect(await readFile(ledger, "utf8")).toBe(contents);
});

it("refuses manager access before reading a broken ledger, while valid access renders a truthful empty directory", async () => {
  await writeFile(ledger, "[]");
  const Page = (await import("./page")).default;
  const html = renderToStaticMarkup(await Page());
  expect(html).toContain("No saved reports yet");
  await writeFile(ledger, "invalid-json");
  access.allowed = false;
  await expect(Page()).rejects.toThrow("NOT_FOUND");
});
