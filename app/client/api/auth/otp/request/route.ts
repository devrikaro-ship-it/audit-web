import { NextRequest } from "next/server";
import { requestOtpHandler } from "../../../../../../lib/client-auth/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return requestOtpHandler(request);
}
