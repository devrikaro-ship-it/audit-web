import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, detectEcom, detectHtmlTracking, detectCurrency } from "@/lib/site-signals";

// Scan rapid (~2-5s) din HTML brut — pentru cardul "Uite ce am gasit" din funnel (spec §11.2).
// NU e detectia completa: tracking-ul aici e din cod, nu runtime; detectia grea (BrightData)
// ruleaza separat in audit. Rol: efect "deja imi cunoaste magazinul", nu verdict final.
// Amprenta (platforma/ecom/tracking) vine din lib/site-signals — aceeasi ca in audit.

function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).origin; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const origin = normalizeUrl(body.url ?? "");
  if (!origin) return NextResponse.json({ error: "URL invalid" }, { status: 400 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  let html = "";
  try {
    const res = await fetch(origin, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DevrikaAudit/1.0)" },
    });
    html = await res.text();
  } catch {
    // best-effort: raspundem cu ce stim, nu blocam funnel-ul
    return NextResponse.json({ origin, reachable: false, platform: null, isEcom: null, tracking: {} });
  } finally {
    clearTimeout(timer);
  }

  const head = html.slice(0, 400000);
  const platform = detectPlatform(head);
  const isEcom = detectEcom(head, platform);
  const tracking = detectHtmlTracking(head);
  const currency = detectCurrency(head, origin);

  return NextResponse.json({ origin, reachable: true, platform, isEcom, tracking, currency });
}
