import { NextRequest } from "next/server";
import { passwordEnrollHandler } from "../../../../../../lib/client-auth/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return passwordEnrollHandler(request);
}
