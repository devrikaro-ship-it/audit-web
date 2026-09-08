import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { generateStoredReportPdf } from "./gads-report-pdf";
import type { GadsReportSnapshot, GadsReportSnapshotV2 } from "./gads-report-delivery";

const execFileAsync = promisify(execFile);
const initialReportsDirectory = process.env.GADS_REPORTS_DIR;

const reportV2: GadsReportSnapshotV2 = {
  version: 2,
  currencyCode: "GBP",
  periods: {
    selected: {
      range: { from: "2026-08-01", to: "2026-08-31" },
      spend: 987_654,
      salesVolume: 1_975_308,
      numberOfSales: 42,
    },
    previous: null,
    previousYear: null,
  },
  products: [{
    productId: "loss",
    title: "Loss product",
    cost: 700,
    conversionValue: 700,
    conversions: 1,
    clicks: 80,
    impressions: 2_000,
    catalogEligible: true,
    sourceLabel: "LOSS_MAKER",
  }],
  productPopulationStatus: "COMPLETE",
  classificationDiagnostics: [],
};

const snapshot: GadsReportSnapshot = {
  website: "https://example.test/report",
  accountName: "Acme & Sons",
  averageOrderValue: 500,
  goodsCost: 300,
  breakEvenCpa: 100,
  breakEvenRoas: 5,
  current: { spend: 1_000, revenue: 3_200, orders: 8, cpa: 125, roas: 3.2 },
  optimized: { spend: 1_000, revenue: 5_800, orders: 12, cpa: 83.33, roas: 5.8 },
  losses: [{ productId: "loss", title: "Loss <Alpha>", cost: 700, revenue: 700, orders: 1, cpa: 700, roas: 1, amount: 560 }],
  opportunities: [{ productId: "win", title: "Winning & Growing", cost: 100, revenue: 1_200, orders: 3, cpa: 33.33, roas: 12, amount: 1_680 }],
  campaigns: [{ name: "PMax <UK> & Brand", channel: "PERFORMANCE_MAX", spend: 900, revenue: 2_700, roas: 3, status: "ENABLED" }],
  reportV2,
};

type PdfProbe = {
  pageCount: number;
  pages: Array<{ text: string; width: number; height: number; png: string }>;
};

async function reportsDirectory(): Promise<string> {
  const evidenceDirectory = process.env.GADS_PDF_EVIDENCE_DIR;
  if (evidenceDirectory) {
    await mkdir(evidenceDirectory, { recursive: true });
    return evidenceDirectory;
  }
  return mkdtemp(path.join(tmpdir(), "gads-pdf-test-"));
}

async function probePdf(pdfPath: string, outputPrefix: string): Promise<PdfProbe> {
  const script = [
    "import fitz, json, sys",
    "document = fitz.open(sys.argv[1])",
    "pages = []",
    "for index, page in enumerate(document):",
    "    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)",
    "    output = f'{sys.argv[2]}-page-{index + 1}.png'",
    "    pixmap.save(output)",
    "    pages.append({'text': page.get_text('text'), 'width': pixmap.width, 'height': pixmap.height, 'png': output})",
    "print(json.dumps({'pageCount': len(document), 'pages': pages}))",
  ].join("\n");
  const { stdout } = await execFileAsync("python3", ["-c", script, pdfPath, outputPrefix], { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout) as PdfProbe;
}

function normalizedText(probe: PdfProbe): string {
  return probe.pages.map(({ text }) => text).join("\n").replaceAll(/\s+/g, " ").trim();
}

afterEach(() => {
  if (initialReportsDirectory === undefined) delete process.env.GADS_REPORTS_DIR;
  else process.env.GADS_REPORTS_DIR = initialReportsDirectory;
});

describe("real PDF generation", () => {
  it("renders English account-currency content from the stored report without substituting selected-period totals", async () => {
    process.env.GADS_REPORTS_DIR = await reportsDirectory();
    const generated = await generateStoredReportPdf("non-ron-v2", snapshot);
    const probe = await probePdf(generated.path, path.join(process.env.GADS_REPORTS_DIR, "non-ron-v2"));
    const text = normalizedText(probe);

    expect((await readFile(generated.path)).subarray(0, 5).toString()).toBe("%PDF-");
    expect(generated.buffer.length).toBeGreaterThan(4_000);
    expect(text).toContain("Acme & Sons");
    expect(text).toContain("Loss <Alpha>");
    expect(text).toContain("Winning & Growing");
    expect(text).toContain("PMax <UK> & Brand");
    expect(text).toContain("1,000 GBP");
    expect(text).toContain("125 GBP");
    expect(text).toContain("2,700 GBP");
    expect(text).not.toContain("987,654 GBP");
    expect(text).toContain("CURRENT - MEASURED");
    expect(text).toContain("OPTIMIZED + CSS - SIMULATION");
    expect(text).toContain("How campaigns are organized now");
    expect(text).toContain("How the account should be organized");
    expect(text).toContain("FUTURE SIMULATION - NOT A PROMISE");
    const campaignPage = probe.pages.find(({ text: pageText }) => pageText.includes("PMax <UK> & Brand"));
    expect(campaignPage).toBeDefined();
    const campaignText = campaignPage!.text.replaceAll(/\s+/g, " ").trim();
    expect(campaignText).toContain("CAMPAIGN PERFORMANCE");
    expect(campaignText).toContain("PMax <UK> & Brand");
    expect(campaignText).toContain("900 GBP");
    expect(campaignText).toContain("2,700 GBP");
    expect(campaignText).toContain("3x");
    expect(campaignText).not.toMatch(/MONTHLY[- ]NORMALIZED|LAST 30 DAYS|30-DAY/i);
    expect(text).toContain("MONTHLY AVERAGES - RANKED BY COST");
    expect(text).toContain("MONTHLY AVERAGES - RANKED BY OPPORTUNITY");
    expect(text).not.toContain("stored monthly-normalized");
    expect(text).not.toContain("RON");
    expect(text).not.toMatch(/CAMPANIE|VANZARI|Cum sunt|Masurat|Recomandare|Doar cautarile|Produsele/);
    expect(probe.pageCount).toBeGreaterThan(0);
    for (const page of probe.pages) {
      expect(page.width).toBeGreaterThan(800);
      expect(page.height).toBeGreaterThan(1_100);
      expect((await readFile(page.png)).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
  }, 60_000);

  it("renders unknown legacy currency explicitly instead of inventing RON", async () => {
    process.env.GADS_REPORTS_DIR = await reportsDirectory();
    const legacySnapshot = { ...snapshot, reportV2: undefined };
    const generated = await generateStoredReportPdf("legacy-unknown-currency", legacySnapshot);
    const probe = await probePdf(generated.path, path.join(process.env.GADS_REPORTS_DIR, "legacy-unknown-currency"));
    const text = normalizedText(probe);

    expect(text).toContain("1,000 currency units");
    expect(text).toContain("125 currency units");
    expect(text).not.toContain("RON");
  }, 60_000);

  it("returns the original PDF bytes when the same report is generated again", async () => {
    process.env.GADS_REPORTS_DIR = await reportsDirectory();
    const first = await generateStoredReportPdf("immutable-report", snapshot);
    const changedSnapshot: GadsReportSnapshot = {
      ...snapshot,
      accountName: "Changed account",
      current: { ...snapshot.current, spend: 999_999 },
      reportV2: { ...reportV2, currencyCode: "USD" },
    };
    const second = await generateStoredReportPdf("immutable-report", changedSnapshot);

    expect(second.path).toBe(first.path);
    expect(second.buffer).toEqual(first.buffer);
    expect(await readFile(second.path)).toEqual(first.buffer);
  }, 60_000);
});
