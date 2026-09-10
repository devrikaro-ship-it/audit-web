import { NextRequest } from "next/server";
import { passwordLoginHandler } from "../../../../../../lib/client-auth/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return passwordLoginHandler(request);
}
