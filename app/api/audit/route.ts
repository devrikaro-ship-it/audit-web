import { NextRequest, NextResponse } from "next/server";
import { createJob, getJob, setJobResult, setJobError } from "@/lib/audit-store";
import { runAudit } from "@/lib/audit-engine";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, tipBusiness, platforma } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL invalid" }, { status: 400 });
  }

  const id = randomUUID();
  createJob(id, url, tipBusiness, platforma);

  // Run audit asynchronously (fire-and-forget)
  (async () => {
    try {
      const data = await runAudit(url);
      setJobResult(id, data);
    } catch (err) {
      setJobError(id, err instanceof Error ? err.message : "Eroare necunoscuta");
    }
  })();

  return NextResponse.json({ id });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID lipsa" }, { status: 400 });

  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Audit negasit" }, { status: 404 });

  return NextResponse.json({
    id: job.id,
    url: job.url,
    status: job.status,
    data: job.data ?? null,
    error: job.error ?? null,
  });
}
