import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protectie Basic Auth pe /dashboard (instrument intern Devrika).
// User/parola din env: DASH_USER / DASH_PASS (default doar pt local).
export function proxy(request: NextRequest) {
  const user = process.env.DASH_USER || "devrika";
  const pass = process.env.DASH_PASS || "audit-local";
  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [u, p] = atob(header.slice(6)).split(":");
      if (u === user && p === pass) return NextResponse.next();
    } catch { /* fallthrough -> 401 */ }
  }
  return new NextResponse("Autentificare necesara", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Devrika Audit Dashboard"' },
  });
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
