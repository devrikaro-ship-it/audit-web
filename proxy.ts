import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { basicAuthOk, dashCredentials } from "@/lib/dash-auth";

// Protectie Basic Auth pe /dashboard (instrument intern Devrika).
// User/parola din env: DASH_USER / DASH_PASS. In productie sunt OBLIGATORII: fara ele
// dashboard-ul raspunde 503, ca sa nu existe niciodata o parola implicita intr-un repo public.
export function proxy(request: NextRequest) {
  const cred = dashCredentials();
  if (!cred) {
    return new NextResponse(
      "Dashboard indisponibil: DASH_USER si DASH_PASS nu sunt setate pe server.",
      { status: 503 }
    );
  }
  if (basicAuthOk(request.headers.get("authorization"), cred)) return NextResponse.next();
  return new NextResponse("Autentificare necesara", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Devrika Audit Dashboard"' },
  });
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
