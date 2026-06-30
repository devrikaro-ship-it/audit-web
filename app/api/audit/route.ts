import { NextRequest, NextResponse } from "next/server";
import { createJob, getJob, setJobResult, setJobError } from "@/lib/audit-store";
import { runAudit } from "@/lib/audit-engine";
import { saveAudit, getAudit } from "@/lib/leads-store";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, tipBusiness, platforma, nume, email, telefon, probleme } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL invalid" }, { status: 400 });
  }

  const id = randomUUID();
  createJob(id, url, { tipBusiness, platforma, nume, email, telefon, probleme });

  // Run audit asynchronously (fire-and-forget)
  (async () => {
    try {
      const data = await runAudit(url);
      setJobResult(id, data);
      // persista auditul finalizat + contactul (durabil, pt dashboard + link permanent)
      const job = getJob(id);
      await saveAudit({
        id, url, domain: data.domain, scor: data.scor, createdAt: job?.createdAt ?? Date.now(),
        nume, email, telefon, tipBusiness, platforma, probleme, data,
      });
    } catch (err) {
      setJobError(id, err instanceof Error ? err.message : "Eroare necunoscuta");
    }
  })();

  return NextResponse.json({ id });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID lipsa" }, { status: 400 });

  // intai job-ul viu (in memorie), apoi store-ul durabil (dupa redeploy)
  const job = getJob(id);
  if (job) {
    return NextResponse.json({ id: job.id, url: job.url, status: job.status, data: job.data ?? null, error: job.error ?? null });
  }
  const stored = await getAudit(id);
  if (stored) {
    return NextResponse.json({ id: stored.id, url: stored.url, status: "done", data: stored.data, error: null });
  }
  return NextResponse.json({ error: "Audit negasit" }, { status: 404 });
}
