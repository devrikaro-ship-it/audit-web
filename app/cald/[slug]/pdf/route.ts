import type { NextRequest } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getWarmReport } from "@/lib/warm-report";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

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

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const rec = await getWarmReport(slug);
  if (!rec) return new Response("Raport negasit.", { status: 404 });

  const chrome = findChrome();
  if (!chrome) return new Response("Chrome/Chromium negasit. Seteaza CHROME_PATH.", { status: 500 });

  const reportUrl = `${req.nextUrl.origin}/cald/${slug}?print=1`;
  const outPath = join(tmpdir(), `cald-${slug}-${randomUUID()}.pdf`);

  try {
    await execFileAsync(chrome, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
      "--virtual-time-budget=15000", `--print-to-pdf=${outPath}`, reportUrl,
    ], { timeout: 45000 });

    const pdf = await readFile(outPath);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="audit-cont-${slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Nu s-a putut genera PDF-ul.", { status: 500 });
  } finally {
    unlink(outPath).catch(() => {});
  }
}
