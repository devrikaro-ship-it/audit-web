import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { exchangeCode } from "@/lib/gads-oauth";
import { seal, SESSION_COOKIE, cookieOptions } from "@/lib/gads-session";
import { publicUrl } from "@/lib/public-url";
import { decodeOAuthState } from "@/lib/gads-website";

// Intoarcerea de la Google. Verifica state-ul, schimba codul pe refresh token, il pune in
// cookie-ul semnat si trimite omul mai departe la alegerea contului.

export const dynamic = "force-dynamic";

function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL(publicUrl(req, "/google-ads/connect"));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // Omul a apasat "Anuleaza" pe ecranul Google — nu e o eroare, e o decizie.
  const denied = sp.get("error");
  if (denied) return back(req, { eroare: denied === "access_denied" ? "anulat" : "google" });

  const code = sp.get("code");
  const state = sp.get("state") ?? "";
  const expected = req.cookies.get("gads_state")?.value ?? "";
  const a = Buffer.from(state);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return back(req, { eroare: "state" });
  }
  const intake = decodeOAuthState(state);
  if (!intake) return back(req, { eroare: "state" });
  if (!code) return back(req, { eroare: "fara_cod" });

  try {
    const { refreshToken } = await exchangeCode(code);
    const res = NextResponse.redirect(publicUrl(req, "/google-ads/conturi"));
    res.cookies.set(SESSION_COOKIE, seal({ refreshToken, website: intake.website }), cookieOptions());
    res.cookies.delete("gads_state");
    return res;
  } catch {
    return back(req, { eroare: "schimb" });
  }
}
