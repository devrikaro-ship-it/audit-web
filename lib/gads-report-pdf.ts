import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export function resolveChromePath(): string | null {
  const pathCandidates = (process.env.PATH || "")
    .split(path.delimiter)
    .flatMap((directory) => ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map((name) => path.join(directory, name)));
  const candidates = [
    process.env.CHROME_PATH,
    ...pathCandidates,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
  ].filter((value): value is string => Boolean(value));
  return candidates.find(existsSync) ?? null;
}

function reportsDirectory(): string {
  return process.env.GADS_REPORTS_DIR || path.join(path.dirname(process.env.GADS_LEADS_FILE || path.join(process.cwd(), "data", "gads-leads.json")), "gads-reports");
}

export async function generateStoredReportPdf(reportId: string, html: string): Promise<{ path: string; buffer: Buffer }> {
  if (!/^[a-zA-Z0-9-]+$/.test(reportId)) throw new Error("Invalid report id");
  const chrome = resolveChromePath();
  if (!chrome) throw new Error("Chrome is not available");
  const directory = reportsDirectory();
  await mkdir(directory, { recursive: true });
  const htmlPath = path.join(tmpdir(), `gads-report-${reportId}.html`);
  const pdfPath = path.join(directory, `${reportId}.pdf`);
  const chromeProfile = await mkdtemp(path.join(tmpdir(), "gads-pdf-chrome-"));
  await writeFile(htmlPath, html, "utf8");
  try {
    await execFileAsync(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer", `--user-data-dir=${chromeProfile}`, `--print-to-pdf=${pdfPath}`, new URL(`file://${htmlPath}`).toString()], { timeout: 45000 });
    return { path: pdfPath, buffer: await readFile(pdfPath) };
  } finally {
    await unlink(htmlPath).catch(() => undefined);
    await rm(chromeProfile, { recursive: true, force: true }).catch(() => undefined);
  }
}
