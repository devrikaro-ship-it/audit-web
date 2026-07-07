import { NextRequest, NextResponse } from "next/server";
import { startJob, finalizeJob, getJobView } from "@/lib/audit-store";
import { parseAuditRequest } from "@/lib/audit-request";

// Ruta e subtire: parseaza cererea (contract in lib/audit-request) -> operatii pe modulul
// de audit-job (lib/audit-store). Nicio logica de forma / coercitie / ciclu de viata aici.
export async function POST(req: NextRequest) {
  const cmd = parseAuditRequest(await req.json().catch(() => null));

  if (cmd.kind === "error") return NextResponse.json({ error: cmd.error }, { status: cmd.status });

  if (cmd.kind === "finalize") {
    const ok = await finalizeJob(cmd.id, cmd.input);
    return ok ? NextResponse.json({ id: cmd.id }) : NextResponse.json({ error: "Job negasit" }, { status: 404 });
  }

  const id = startJob(cmd.url, cmd.meta);
  return NextResponse.json({ id });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID lipsa" }, { status: 400 });
  const view = await getJobView(id);
  return view ? NextResponse.json(view) : NextResponse.json({ error: "Audit negasit" }, { status: 404 });
}
