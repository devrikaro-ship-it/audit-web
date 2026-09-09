import { NextResponse, type NextRequest } from "next/server";
import { dashCredentials } from "@/lib/dash-auth";
import { dashboardAccessOk, dashboardOrigin } from "@/lib/dashboard-session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/dashboard/login" || request.nextUrl.pathname === "/dashboard/login/submit") return NextResponse.next();
  if (!dashCredentials()) return new NextResponse("Dashboard temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (await dashboardAccessOk(request.headers)) return NextResponse.next();
  if (request.headers.has("authorization") || !["GET", "HEAD"].includes(request.method)) {
    return new NextResponse("Authentication required.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const origin = dashboardOrigin(request);
  if (!origin) return new NextResponse("Dashboard temporarily unavailable.", { status: 503 });
  const url = new URL("/dashboard/login", origin);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
