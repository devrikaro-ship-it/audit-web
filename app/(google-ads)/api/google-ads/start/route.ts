import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { authUrl, missingConfig } from "@/lib/gads-oauth";
import { demoOn, DEMO_REFRESH_TOKEN } from "@/lib/gads-demo";
import { seal, SESSION_COOKIE, cookieOptions } from "@/lib/gads-session";
import { publicUrl } from "@/lib/public-url";
import { encodeOAuthState, normalizeStoreWebsite } from "@/lib/gads-website";

// Porneste consimtamantul Google. `state` = nonce pus si in cookie, verificat la intoarcere:
// fara el, oricine poate trimite victima pe un callback fabricat (CSRF pe login).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const website = normalizeStoreWebsite(req.nextUrl.searchParams.get("website"));
  if (!website) {
    return NextResponse.redirect(publicUrl(req, "/google-ads/connect?eroare=website"));
  }
  if (demoOn()) {
    // Demo: nu atingem Google deloc. Sesiunea primeste un token care nu exista nicaieri,
    // iar paginile de mai departe stiu sa citeasca date simulate in locul contului real.
    const res = NextResponse.redirect(publicUrl(req, "/google-ads/conturi"));
    res.cookies.set(SESSION_COOKIE, seal({ refreshToken: DEMO_REFRESH_TOKEN, website }), cookieOptions());
    return res;
  }

  const missing = missingConfig();
  if (missing.length) {
    // Mai bine o pagina care spune ce lipseste decat un 500 pe care nu-l intelege nimeni.
    return NextResponse.redirect(
      publicUrl(req, `/google-ads/connect?eroare=config&lipsa=${missing.join(",")}`)
    );
  }
  const state = encodeOAuthState(randomBytes(16).toString("base64url"), website);
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("gads_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minute: cat sa apuce sa citeasca ecranul Google
  });
  return res;
}
