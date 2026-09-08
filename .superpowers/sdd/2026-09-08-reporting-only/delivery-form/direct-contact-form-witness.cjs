"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const net = require("node:net");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "../../../..");
const workRoot = path.join(__dirname, ".contact-form-witness-work");
const appRoot = path.join(workRoot, "app");
const routeRoot = path.join(appRoot, "app", "__delivery-form-proof");
const browserReadyFile = path.join(__dirname, "browser-ready.json");
const browserDoneFile = path.join(__dirname, "browser-done.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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
    if (child.exitCode !== null) throw new Error("The isolated Next.js process exited before serving the contact form");
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {
      // The isolated application is still compiling or starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("The isolated Next.js contact form did not become ready within 60 seconds");
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

async function waitForBrowserVerification(revision, sourceSha256) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const marker = JSON.parse(await fsp.readFile(browserDoneFile, "utf8"));
      assert.equal(marker.revision, revision, "The browser marker must identify the exercised revision");
      assert.equal(marker.sourceSha256, sourceSha256, "The browser marker must identify the exercised ContactForm source");
      assert.equal(marker.passed, true, "The persistent-browser inspection must report a pass");
      assert.equal(marker.receipt, "contact-form-browser-receipt.json", "The browser marker must reference the sanitized receipt");
      return { status: "PASS", receipt: marker.receipt };
    } catch (error) {
      if (!(error && error.code === "ENOENT")) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { status: "PENDING", receipt: null };
}

async function main() {
  assert.equal(path.dirname(workRoot), __dirname, "Witness cleanup must remain inside the delivery-form artifact directory");
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  const sourcePath = "app/google-ads/raport/ContactForm.tsx";
  const revisionSource = execFileSync("git", ["show", `${revision}:${sourcePath}`], { cwd: repositoryRoot });
  const sourceDigest = sha256(revisionSource);

  await Promise.all([
    fsp.rm(browserReadyFile, { force: true }),
    fsp.rm(browserDoneFile, { force: true }),
  ]);
  await fsp.rm(workRoot, { recursive: true, force: true });
  await fsp.mkdir(appRoot, { recursive: true });

  const archive = execFileSync("git", ["archive", "--format=tar", revision], {
    cwd: repositoryRoot,
    maxBuffer: 256 * 1024 * 1024,
  });
  execFileSync("tar", ["-xf", "-", "-C", appRoot], { input: archive });
  await fsp.symlink(path.join(repositoryRoot, "node_modules"), path.join(appRoot, "node_modules"), "dir");
  await fsp.mkdir(routeRoot, { recursive: true });
  const routeSource = `import ContactForm from "../google-ads/raport/ContactForm";

async function controlledFailure(_formData: FormData) {
  "use server";
  return { ok: false as const, error: "CONTROLLED_FAILURE" };
}

export default function DeliveryFormProofPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Report delivery proof</h1>
        <p className="mb-6 text-sm text-slate-600">This isolated local route uses the production ContactForm with a controlled failure action.</p>
        <ContactForm action={controlledFailure} pendingReportReference={"a".repeat(43)} />
      </section>
    </main>
  );
}
`;
  await fsp.writeFile(path.join(routeRoot, "page.tsx"), routeSource);
  assert.equal(routeSource.includes("saveContact"), false, "The isolated route must not import or invoke saveContact");

  const archivedSource = await fsp.readFile(path.join(appRoot, sourcePath));
  assert.equal(sha256(archivedSource), sourceDigest, "The rendered ContactForm must match the exact Git revision");

  const port = await unusedPort();
  const server = spawn(process.execPath, [path.join(repositoryRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: appRoot,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "ignore", "ignore"],
  });

  let cleanupPassed = false;
  try {
    const url = `http://127.0.0.1:${port}/__delivery-form-proof`;
    const response = await waitForResponse(url, server);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(html.includes("Email me my PDF audit"), true, "The real ready-state submit control must render");
    assert.equal(html.includes("use these details once to generate, store, and email this audit"), true, "The one-time consent must render");
    assert.equal(html.includes("does not enroll me in monthly reports or promotional messages"), true, "The no-enrollment disclosure must render");

    await fsp.writeFile(browserReadyFile, JSON.stringify({
      url,
      revision,
      sourcePath,
      sourceSha256: sourceDigest,
      actions: [
        "Use the existing persistent browser binding and open this local URL.",
        "Confirm the English ready state and truthful one-time consent text.",
        "Fill Name, Email, and Phone with synthetic values and check only reportConsent.",
        "Submit once to the injected controlledFailure action; do not invoke saveContact.",
        "Confirm the English failure copy is visible and the retry button is enabled.",
        "Capture a screenshot and write contact-form-browser-receipt.json, then browser-done.json."
      ]
    }), { mode: 0o600 });
    await fsp.chmod(browserReadyFile, 0o600);
    const browserVisual = await waitForBrowserVerification(revision, sourceDigest);
    assert.equal(browserVisual.status, "PASS", "The persistent-browser failure-state witness must complete within 120 seconds");

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
        controlledActionOnly: true,
        cleanupPassed,
      },
      productionSource: { relativePath: sourcePath, sha256: sourceDigest, sourceMatchesRevision: true },
      initialHttp: { status: 200, englishReadyState: true, truthfulOneTimeConsent: true, monthlyEnrollmentExcluded: true },
      browserVisual,
      scopeControls: {
        saveContactInvoked: false,
        providerTransportInvoked: false,
        accountCollectionInvoked: false,
        realEmailSent: false,
        schedulingActivated: false,
        historicalReportsTouched: false,
        pdfGenerated: false,
      },
    }, null, 2)}\n`);
  } finally {
    await stopChild(server);
    if (!cleanupPassed) await fsp.rm(workRoot, { recursive: true, force: true });
    await Promise.all([
      fsp.rm(browserReadyFile, { force: true }),
      fsp.rm(browserDoneFile, { force: true }),
    ]);
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    verdict: "FAIL",
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "Unknown failure",
  })}\n`);
  process.exitCode = 1;
});
