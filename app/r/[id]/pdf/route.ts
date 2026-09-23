import type { NextRequest } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getAudit } from "@/lib/leads-store";
import { findChrome, internalReportUrl } from "@/lib/find-chrome";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const stored = await getAudit(id);
  if (!stored) {
    return new Response("Raport negasit sau expirat.", { status: 404 });
  }

  const chrome = findChrome();
  if (!chrome) {
    return new Response("Chrome/Chromium negasit pe server. Seteaza CHROME_PATH.", { status: 500 });
  }

  // Chrome reads the report from inside the container over plain HTTP on the app's own port. The public origin
  // behind the proxy is https://localhost:3000 here, which Chrome cannot open (the first production PDFs were a
  // printed ERR_SSL_PROTOCOL_ERROR page).
  const reportUrl = internalReportUrl(id, process.env.PORT, req.nextUrl.port);
  const probe = await fetch(reportUrl).catch(() => null);
  if (!probe || !probe.ok) {
    return new Response("Raportul nu a putut fi pregatit pentru PDF. Incearca din nou.", { status: 502 });
  }
  const outPath = join(tmpdir(), `audit-${id}-${randomUUID()}.pdf`);

  try {
    await execFileAsync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-pdf-header-footer",
      "--virtual-time-budget=15000",
      `--print-to-pdf=${outPath}`,
      reportUrl,
    ], { timeout: 45000 });

    const pdf = await readFile(outPath);
    const safeDomain = (stored.domain || "audit").replace(/[^a-z0-9.-]/gi, "_");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="audit-${safeDomain}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Nu s-a putut genera PDF-ul.", { status: 500 });
  } finally {
    unlink(outPath).catch(() => {});
  }
}
