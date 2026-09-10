import { NextRequest } from "next/server";
import { verifyOtpHandler } from "../../../../../../lib/client-auth/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return verifyOtpHandler(request);
}
