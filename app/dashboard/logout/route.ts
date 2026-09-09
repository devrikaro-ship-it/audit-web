import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_COOKIE, dashboardCookieOptions, revokeDashboardSession } from "@/lib/dashboard-session";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse("Request refused.", { status: 403 });
  try { await revokeDashboardSession(request.cookies.get(DASHBOARD_COOKIE)?.value); }
  catch { return new NextResponse("Sign-out is temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const response = NextResponse.redirect(new URL("/dashboard/login", request.nextUrl.origin), 303);
  response.cookies.set(DASHBOARD_COOKIE, "", { ...dashboardCookieOptions(), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
