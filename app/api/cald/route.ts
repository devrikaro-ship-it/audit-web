import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { saveWarmReport, getWarmReport, listWarmReports, type WarmReport } from "@/lib/warm-report";

export const runtime = "nodejs";

// Scrierea e interna (skill-ul audit-devrika trimite raportul). Daca CALD_TOKEN e setat,
// cere-l ca Bearer; altfel (dev local) lasa deschis.
function authorized(req: NextRequest): boolean {
  const token = process.env.CALD_TOKEN;
  if (!token) return true;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Partial<WarmReport> | null;
  if (!body || !body.slug || !body.client || !body.verdict || !Array.isArray(body.channels)) {
    return NextResponse.json({ error: "Lipsesc campuri obligatorii (slug, client, verdict, channels)" }, { status: 400 });
  }

  const rec: WarmReport = {
    ...body,
    slug: body.slug,
    client: body.client,
    verdict: body.verdict,
    channels: body.channels,
    date: body.date ?? new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
    createdAt: body.createdAt ?? Date.now(),
  } as WarmReport;

  await saveWarmReport(rec);
  return NextResponse.json({ ok: true, slug: rec.slug, url: `/cald/${rec.slug}` });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    const list = await listWarmReports();
    return NextResponse.json(list.map(r => ({ slug: r.slug, client: r.client, domain: r.domain, date: r.date, vertical: r.vertical, verdict: r.verdict, createdAt: r.createdAt })));
  }
  const rec = await getWarmReport(slug);
  if (!rec) return NextResponse.json({ error: "Raport negasit" }, { status: 404 });
  return NextResponse.json(rec);
}
