"use strict";

const assert = require("node:assert/strict");
const { createHash, createHmac, randomBytes } = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const net = require("node:net");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "../../../..");
const workRoot = path.join(__dirname, ".witness-work");
const appRoot = path.join(workRoot, "app");
const dataRoot = path.join(workRoot, "data");
const reportsRoot = path.join(dataRoot, "reports");
const leadsFile = path.join(dataRoot, "gads-leads.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertContains(value, expected, message) {
  assert.equal(value.includes(expected), true, message);
}

function assertExcludes(value, forbidden, message) {
  assert.equal(value.includes(forbidden), false, message);
}

function seal(snapshot, secret) {
  const payload = Buffer.from(JSON.stringify(snapshot)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function snapshot({ generatedAt, currencyCode, range, title, spend, salesVolume, numberOfSales }) {
  return {
    generatedAt,
    evidenceMonths: 3,
    website: "https://synthetic-portal.invalid",
    accountName: `Synthetic ${currencyCode} portal account`,
    averageOrderValue: 120,
    goodsCost: 50,
    breakEvenCpa: 70,
    breakEvenRoas: 1.72,
    current: { spend, revenue: salesVolume, orders: numberOfSales, cpa: spend / numberOfSales, roas: salesVolume / spend },
    optimized: { spend, revenue: salesVolume, orders: numberOfSales, cpa: spend / numberOfSales, roas: salesVolume / spend },
    losses: [],
    opportunities: [],
    reportV2: {
      version: 2,
      currencyCode,
      periods: {
        selected: { range, spend, salesVolume, numberOfSales },
        previous: null,
        previousYear: null,
      },
      products: [{
        productId: `synthetic-${currencyCode.toLowerCase()}-product`,
        title,
        cost: spend,
        conversionValue: salesVolume,
        conversions: numberOfSales,
        clicks: 96,
        impressions: 2_400,
        catalogEligible: true,
        sourceLabel: "LOSS_MAKER",
      }],
      productPopulationStatus: "COMPLETE",
      classificationDiagnostics: [],
    },
  };
}

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForResponse(url, child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("The isolated Next.js process exited before serving the portal");
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {
      // Compilation and server startup are still in progress.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("The isolated Next.js portal did not become ready within 60 seconds");
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function main() {
  assert.equal(path.dirname(workRoot), __dirname, "Witness cleanup must remain inside the portal artifact directory");
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--short"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  assert.equal(status, "", "The direct witness requires a clean exact revision");

  await fsp.rm(workRoot, { recursive: true, force: true });
  await fsp.mkdir(appRoot, { recursive: true });
  await fsp.mkdir(reportsRoot, { recursive: true });

  const archive = execFileSync("git", ["archive", "--format=tar", revision], {
    cwd: repositoryRoot,
    maxBuffer: 256 * 1024 * 1024,
  });
  execFileSync("tar", ["-xf", "-", "-C", appRoot], { input: archive });
  await fsp.symlink(path.join(repositoryRoot, "node_modules"), path.join(appRoot, "node_modules"), "dir");

  const signingSecret = randomBytes(32).toString("base64url");
  const portalToken = randomBytes(24).toString("base64url");
  const tamperedPortalToken = randomBytes(24).toString("base64url");
  const unknownPortalToken = randomBytes(24).toString("base64url");
  const latest = snapshot({
    generatedAt: "2026-08-27T08:00:00.000Z",
    currencyCode: "GBP",
    range: { from: "2026-08-01", to: "2026-08-31" },
    title: "Synthetic <latest> & escaped product",
    spend: 1_540,
    salesVolume: 1_900,
    numberOfSales: 20,
  });
  const older = snapshot({
    generatedAt: "2026-07-27T08:00:00.000Z",
    currencyCode: "USD",
    range: { from: "2026-07-01", to: "2026-07-31" },
    title: "Synthetic selected USD product",
    spend: 910,
    salesVolume: 850,
    numberOfSales: 10,
  });
  const latestPath = path.join(reportsRoot, "portal-latest.snapshot");
  const olderPath = path.join(reportsRoot, "portal-older.snapshot");
  const tamperedPath = path.join(reportsRoot, "portal-tampered.snapshot");
  const latestSigned = seal(latest, signingSecret);
  const olderSigned = seal(older, signingSecret);
  const [tamperedPayload, tamperedSignature] = latestSigned.split(".");
  const tampered = JSON.parse(Buffer.from(tamperedPayload, "base64url").toString("utf8"));
  tampered.reportV2.currencyCode = "EUR";
  const changedPayload = Buffer.from(JSON.stringify(tampered)).toString("base64url");
  await Promise.all([
    fsp.writeFile(latestPath, latestSigned, { mode: 0o600 }),
    fsp.writeFile(olderPath, olderSigned, { mode: 0o600 }),
    fsp.writeFile(tamperedPath, `${changedPayload}.${tamperedSignature}`, { mode: 0o600 }),
  ]);
  const leads = [
    { id: "synthetic-latest", createdAt: Date.parse(latest.generatedAt), nume: "Synthetic", email: "synthetic@invalid.example", reportId: "report-latest", reportToken: randomBytes(24).toString("base64url"), portalToken, snapshotPath: latestPath },
    { id: "synthetic-older", createdAt: Date.parse(older.generatedAt), nume: "Synthetic", email: "synthetic@invalid.example", reportId: "report-older", reportToken: randomBytes(24).toString("base64url"), portalToken, snapshotPath: olderPath },
    { id: "synthetic-tampered", createdAt: Date.parse(latest.generatedAt), nume: "Synthetic", email: "synthetic@invalid.example", reportId: "report-tampered", reportToken: randomBytes(24).toString("base64url"), portalToken: tamperedPortalToken, snapshotPath: tamperedPath },
  ];
  await fsp.writeFile(leadsFile, JSON.stringify(leads), { mode: 0o600 });

  const port = await unusedPort();
  const server = spawn(process.execPath, [path.join(repositoryRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: appRoot,
    env: {
      ...process.env,
      GADS_LEADS_FILE: leadsFile,
      GADS_REPORTS_DIR: reportsRoot,
      GADS_REPORT_SIGNING_SECRET: signingSecret,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "ignore", "ignore"],
  });

  let cleanupPassed = false;
  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    const latestResponse = await waitForResponse(`${baseUrl}/google-ads/portal/${encodeURIComponent(portalToken)}`, server);
    const latestHtml = await latestResponse.text();
    assert.equal(latestResponse.status, 200);
    assertContains(latestHtml, "Report generated in August 2026", "The latest selector must use an English month and year");
    assertContains(latestHtml, "August 1–31, 2026", "The latest selected period must use an English date range");
    assertContains(latestHtml, "Synthetic &lt;latest&gt; &amp; escaped product", "The latest product title must remain HTML-escaped");
    assertContains(latestHtml, "£1,540", "The latest signed GBP spend must be preserved");
    assertExcludes(latestHtml, "Raport generat la", "The latest response must not retain the Romanian selector label");
    assertExcludes(latestHtml, "1–31 august 2026", "The latest response must not retain a Romanian date range");

    const selectedResponse = await fetch(`${baseUrl}/google-ads/portal/${encodeURIComponent(portalToken)}?report=report-older`);
    const selectedHtml = await selectedResponse.text();
    assert.equal(selectedResponse.status, 200);
    assertContains(selectedHtml, "Report generated in July 2026", "The selected older report must use an English month and year");
    assertContains(selectedHtml, "July 1–31, 2026", "The selected older report must use an English date range");
    assertContains(selectedHtml, "Synthetic selected USD product", "The selected older report must render its own product");
    assertContains(selectedHtml, "$910", "The selected older report must preserve its signed USD spend");
    assertExcludes(selectedHtml, "Synthetic &lt;latest&gt; &amp; escaped product", "The selected older report must not render latest-report product data");

    const foreignSelectionResponse = await fetch(`${baseUrl}/google-ads/portal/${encodeURIComponent(portalToken)}?report=foreign-report`);
    const foreignSelectionHtml = await foreignSelectionResponse.text();
    assert.equal(foreignSelectionResponse.status, 200);
    assertContains(foreignSelectionHtml, "Synthetic &lt;latest&gt; &amp; escaped product", "A foreign report selection must fall back to the token-scoped latest report");
    assertContains(foreignSelectionHtml, '<option value="report-latest" selected="">', "A foreign report selection must leave the token-scoped latest option selected");
    assertExcludes(foreignSelectionHtml, '<option value="foreign-report"', "A foreign report identifier must not become a selectable portal report");
    assertExcludes(foreignSelectionHtml, "Synthetic selected USD product", "A foreign report selection must not expose another token-scoped period by accident");

    const unknownResponse = await fetch(`${baseUrl}/google-ads/portal/${encodeURIComponent(unknownPortalToken)}`);
    assert.equal(unknownResponse.status, 404);
    const tamperedResponse = await fetch(`${baseUrl}/google-ads/portal/${encodeURIComponent(tamperedPortalToken)}`);
    assert.equal(tamperedResponse.status, 404);

    const sourcePath = "app/google-ads/portal/[token]/page.tsx";
    const archivedSource = await fsp.readFile(path.join(appRoot, sourcePath));
    const revisionSource = execFileSync("git", ["show", `${revision}:${sourcePath}`], { cwd: repositoryRoot });
    assert.equal(sha256(archivedSource), sha256(revisionSource));

    await stopChild(server);
    await fsp.rm(workRoot, { recursive: true, force: true });
    cleanupPassed = !fs.existsSync(workRoot);
    assert.equal(cleanupPassed, true);

    process.stdout.write(`${JSON.stringify({
      verdict: "PASS",
      revision,
      environmentIdentity: {
        target: "local isolated Next.js HTTP process",
        isFixture: false,
        syntheticInput: true,
        taskOwnedStorage: true,
        cleanupPassed,
      },
      observedResponse: {
        authorizedLatest: { status: 200, englishSelector: true, englishDate: true, currencyCode: "GBP", signedValuesPreserved: true, escapingPreserved: true },
        authorizedSelectedReport: { status: 200, englishSelector: true, englishDate: true, currencyCode: "USD", signedValuesPreserved: true },
        foreignReportSelection: { status: 200, fellBackToTokenScopedLatest: true },
        unknownPortalToken: { status: 404 },
        tamperedStoredSnapshot: { status: 404 },
      },
      scopeControls: {
        historicalReportsTouched: false,
        realAccountsUsed: false,
        realEmailSent: false,
        schedulingActivated: false,
        contactFormSubmitted: false,
        pdfGenerated: false,
        accessTokensOrSigningMaterialPrinted: false,
      },
      productionSource: { relativePath: sourcePath, sha256: sha256(revisionSource), sourceMatchesRevision: true },
    }, null, 2)}\n`);
  } finally {
    await stopChild(server);
    if (!cleanupPassed) await fsp.rm(workRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    verdict: "FAIL",
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message.replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]") : "Unknown failure",
  })}\n`);
  process.exitCode = 1;
});
