import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { listLeads } from "@/lib/gads-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function equalToken(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const lead = (await listLeads()).find((item) => item.reportId === id);
  if (!lead?.pdfPath || !lead.reportToken || !equalToken(token, lead.reportToken)) return new Response("Report not found", { status: 404 });
  try {
    const pdf = await readFile(lead.pdfPath);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="google-ads-audit-${id}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Report not found", { status: 404 });
  }
}
