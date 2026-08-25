import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateStoredReportPdf } from "./gads-report-pdf";
import { renderReportHtml, type GadsReportSnapshot } from "./gads-report-delivery";

const run = process.env.RUN_PDF_INTEGRATION === "1" ? describe : describe.skip;

run("real PDF generation", () => {
  it("stores a readable PDF generated from the report snapshot", async () => {
    process.env.GADS_REPORTS_DIR = await mkdtemp(path.join(tmpdir(), "gads-pdf-test-"));
    const snapshot: GadsReportSnapshot = {
      website: "https://fitn4ss.ro/", accountName: "Fitn4ss", averageOrderValue: 500, goodsCost: 300, breakEvenCpa: 100, breakEvenRoas: 5,
      current: { spend: 1000, revenue: 3200, orders: 8, cpa: 125, roas: 3.2 }, optimized: { spend: 1000, revenue: 5800, orders: 12, cpa: 83.33, roas: 5.8 },
      losses: [{ productId: "loss", title: "Loss product", cost: 700, revenue: 700, orders: 1, cpa: 700, roas: 1, amount: 560 }],
      opportunities: [{ productId: "win", title: "Winning product", cost: 100, revenue: 1200, orders: 3, cpa: 33.33, roas: 12, amount: 1680 }],
    };
    const generated = await generateStoredReportPdf("integration-report", renderReportHtml(snapshot));
    expect((await readFile(generated.path)).subarray(0, 5).toString()).toBe("%PDF-");
    expect(generated.buffer.length).toBeGreaterThan(10_000);
  }, 60_000);
});
