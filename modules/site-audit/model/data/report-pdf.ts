// Prints a report page to PDF once it is really ready: the slides are on the page (the report renders after a client
// fetch) and every web font has loaded. Chrome's --print-to-pdf with a virtual time budget printed whenever the
// budget ran out, and production PDFs came out in fallback fonts (docs/dev/mistakes.md, 2026-09-24).
export async function printReportPdf(chromePath: string, url: string, timeoutMs = 40000): Promise<Buffer> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
    await page.waitForSelector(".deck .slide", { timeout: timeoutMs });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}
