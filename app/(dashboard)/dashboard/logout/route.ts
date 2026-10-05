import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_COOKIE, dashboardCookieOptions, dashboardOrigin, revokeDashboardSession } from "@/lib/dashboard-session";

export async function POST(request: NextRequest) {
  const origin = dashboardOrigin(request);
  if (!origin) return new NextResponse("Dashboard temporarily unavailable.", { status: 503 });
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse("Request refused.", { status: 403 });
  try { await revokeDashboardSession(request.cookies.get(DASHBOARD_COOKIE)?.value); }
  catch { return new NextResponse("Sign-out is temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const response = NextResponse.redirect(new URL("/dashboard/login", origin), 303);
  response.cookies.set(DASHBOARD_COOKIE, "", { ...dashboardCookieOptions(), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
