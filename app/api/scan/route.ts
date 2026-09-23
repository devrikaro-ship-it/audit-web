import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, detectEcom } from "@/lib/site-signals";

// Quick scan (~2-5 s) of the raw homepage for the funnel's "here is what we found" card: platform and whether it
// is a shop. The full audit runs separately. Detection comes from lib/site-signals, the same as the audit.

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
    return NextResponse.json({ origin, reachable: false, platform: null, isEcom: null });
  } finally {
    clearTimeout(timer);
  }

  const head = html.slice(0, 400000);
  const platform = detectPlatform(head);
  const isEcom = detectEcom(head, platform);

  return NextResponse.json({ origin, reachable: true, platform, isEcom });
}
