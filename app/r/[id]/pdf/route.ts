import type { NextRequest } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { getAudit } from "@/lib/leads-store";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

// Acelasi mecanism ca in skill-ul audit-devrika (html_to_pdf.py): Chrome/Chromium/Edge
// headless -> --print-to-pdf. Reutilizat aici peste raportul live, nu peste un HTML local.
function findChrome(): string | null {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

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

  const reportUrl = `${req.nextUrl.origin}/r/${id}?print=1`;
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
