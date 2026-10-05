// One agency dashboard for every audit (operator, 2026-09-23): website audits and Google Ads reports as one list
// of prospects, each with a sales status the team moves through the Devrika selling process.
import type { ProspectRow } from "@/shared/audit-contract";

// Same stages as the team's selling process in the CRM (setter -> closer -> closing).
export const LEAD_STATUSES = [
  "De contactat", "Sunat - fara raspuns", "De revenit", "Meet programat", "Meet 1 tinut",
  "Audit programat", "Oferta trimisa", "Negociere", "Client", "Respins", "Necalificat",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const DEFAULT_STATUS: LeadStatus = "De contactat";

export type DashboardRow = ProspectRow & { tip: "Prospect"; status: LeadStatus };

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}

// The rows of every audit module (each one's prospects, in the modules' order), with the team's sales status; one
// filter id keeps a single module's rows, newest first.
export function buildRows(
  groups: { filter: string; rows: ProspectRow[] }[],
  statuses: Record<string, string>,
  filter = "toate",
): DashboardRow[] {
  const statusOf = (key: string): LeadStatus => (isLeadStatus(statuses[key]) ? statuses[key] as LeadStatus : DEFAULT_STATUS);
  const rows = groups.filter((g) => filter === "toate" || g.filter === filter).flatMap((g) => g.rows)
    .map((r) => ({ ...r, tip: "Prospect" as const, status: statusOf(r.key) }));
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export function dashboardKpis(rows: DashboardRow[], now: number): { n: number; l: string }[] {
  const week = now - 7 * 24 * 3600 * 1000;
  const reachable = (r: DashboardRow) => !!(r.email || r.telefon);
  return [
    { n: rows.length, l: "audituri in total" },
    { n: rows.filter(reachable).length, l: "cu date de contact" },
    { n: rows.filter((r) => r.createdAt >= week).length, l: "in ultimele 7 zile" },
    { n: rows.filter((r) => r.status === DEFAULT_STATUS && reachable(r)).length, l: "de contactat" },
  ];
}
