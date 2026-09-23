import { NextResponse, type NextRequest } from "next/server";
import { dashCredentials } from "@/lib/dash-auth";
import { dashboardAccessOk, dashboardOrigin } from "@/lib/dashboard-session";
import { routeForHost } from "@/lib/host-routing";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const decision = routeForHost(host, request.nextUrl.pathname, request.nextUrl.search);
  if (decision.kind === "rewrite") return NextResponse.rewrite(new URL(decision.path, request.url));
  if (decision.kind === "redirect") return NextResponse.redirect(decision.location, 308);
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return NextResponse.next();

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

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
