// Contractul cererii /api/audit — SURSA UNICA a formei payload-ului.
// Inainte, forma era negociata implicit intre funnel (3 forme: start/finalize/legacy) si
// ruta (detectie din prezenta campurilor). Aici traieste o data: tipul wire + parserul.
// Pur (fara retea, fara audit-store runtime) -> testabil si sigur de importat din client.

// ── Inputurile pe care le consuma modulul de job (audit-store) ──
export type StartMeta = {
  tipBusiness?: string; platforma?: string;
  nume?: string; email?: string; telefon?: string; probleme?: string[];
  finalizeRequested?: boolean;
};
export type FinalizeInput = {
  nume?: string; email?: string; telefon?: string; probleme?: string[];
};

// ── Forma pe fir (ce trimite clientul) ──
export type AuditRequestBody =
  | { phase: "start"; url: string; tipBusiness?: string; platforma?: string }
  | { phase: "finalize"; id: string; nume?: string; email?: string; telefon?: string; probleme?: string[] }
  | { phase?: undefined; url: string; tipBusiness?: string; platforma?: string; nume?: string; email?: string; telefon?: string; probleme?: string[] };

// ── Comanda parsata (ce executa ruta) ──
export type ParsedRequest =
  | { kind: "start"; url: string; meta: StartMeta }
  | { kind: "finalize"; id: string; input: FinalizeInput }
  | { kind: "error"; status: number; error: string };

export function parseAuditRequest(body: unknown): ParsedRequest {
  if (!body || typeof body !== "object") return { kind: "error", status: 400, error: "Body invalid" };
  const b = body as Record<string, unknown>;

  if (b.phase === "finalize") {
    if (typeof b.id !== "string" || !b.id) return { kind: "error", status: 400, error: "id lipsa" };
    return {
      kind: "finalize", id: b.id,
      input: {
        nume: b.nume as string, email: b.email as string, telefon: b.telefon as string, probleme: b.probleme as string[],
      },
    };
  }

  // start sau legacy single-submit: ambele pornesc auditul de la URL.
  if (typeof b.url !== "string" || !b.url) return { kind: "error", status: 400, error: "URL invalid" };
  const hasContact = !!(b.nume || b.email || b.telefon);
  return {
    kind: "start", url: b.url,
    meta: {
      tipBusiness: b.tipBusiness as string, platforma: b.platforma as string,
      nume: b.nume as string, email: b.email as string, telefon: b.telefon as string, probleme: b.probleme as string[],
      finalizeRequested: hasContact, // legacy = contactul vine odata cu URL-ul
    },
  };
}
