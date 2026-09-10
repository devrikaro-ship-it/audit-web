import { NextRequest } from "next/server";
import { bootstrapHandler } from "../../../../../lib/client-auth/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return bootstrapHandler(request);
}
