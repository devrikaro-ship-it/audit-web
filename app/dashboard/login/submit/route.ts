import { NextRequest, NextResponse } from "next/server";
import { dashCredentials } from "@/lib/dash-auth";
import { createDashboardSession, dashboardCookieOptions, dashboardPasswordOk, dashboardReturnPath, DASHBOARD_COOKIE } from "@/lib/dashboard-session";

let attemptWindow = { startedAt: 0, count: 0 };

export async function POST(request: NextRequest) {
  const error = (message: string, status: number) => new NextResponse(message, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") return error("Request refused.", 403);
  if (!dashCredentials()) return error("Dashboard temporarily unavailable.", 503);
  if (Date.now() - attemptWindow.startedAt >= 60_000) attemptWindow = { startedAt: Date.now(), count: 0 };
  if (++attemptWindow.count > 20) return error("Too many attempts. Try again in a minute.", 429);
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return error("Invalid form.", 415);
  const reader = request.body?.getReader();
  if (!reader) return error("Invalid form.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return error("Form too large.", 413); }
      chunks.push(value);
    }
  } catch { return error("Invalid form.", 400); }
  const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const next = dashboardReturnPath(form.get("next"));
  if (!dashboardPasswordOk(form.get("username") || "", form.get("password") || "")) {
    const target = new URL("/dashboard/login", request.nextUrl.origin);
    target.searchParams.set("error", "invalid"); target.searchParams.set("next", next);
    const response = NextResponse.redirect(target, 303); response.headers.set("Cache-Control", "no-store"); return response;
  }
  try {
    const token = await createDashboardSession();
    const response = NextResponse.redirect(new URL(next, request.nextUrl.origin), 303);
    response.cookies.set(DASHBOARD_COOKIE, token, dashboardCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return error("Sign-in is temporarily unavailable. Try again later.", 503); }
}
