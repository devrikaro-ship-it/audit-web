// One agency dashboard for every audit (operator, 2026-09-23): website audits and Google Ads reports as one list
// of prospects, each with a sales status the team moves through the Devrika selling process.
import type { StoredAudit } from "./leads-store";
import type { ManagerAccount } from "./gads-manager";

// Same stages as the team's selling process in the CRM (setter -> closer -> closing).
export const LEAD_STATUSES = [
  "De contactat", "Sunat - fara raspuns", "De revenit", "Meet programat", "Meet 1 tinut",
  "Audit programat", "Oferta trimisa", "Negociere", "Client", "Respins", "Necalificat",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const DEFAULT_STATUS: LeadStatus = "De contactat";

export type Canal = "Audit site" | "Audit Google Ads";
export type DashboardRow = {
  key: string;            // stable id for the status store: "site:<audit id>" | "gads:<account id>"
  createdAt: number;
  tip: "Prospect";
  status: LeadStatus;
  canal: Canal;
  site: string;
  nume: string;
  email: string;
  telefon: string;
  observatii: { rezultat: string; preocupare: string; raport: string };
};

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}

function fmtRoas(n: number | null): string { return n == null ? "—" : `${n.toFixed(2)}x`; }

export function buildRows(
  audits: StoredAudit[],
  accounts: ManagerAccount[],
  statuses: Record<string, string>,
  filter: "toate" | "site" | "gads" = "toate",
): DashboardRow[] {
  const statusOf = (key: string): LeadStatus => (isLeadStatus(statuses[key]) ? statuses[key] as LeadStatus : DEFAULT_STATUS);
  const site: DashboardRow[] = audits.map((a) => ({
    key: `site:${a.id}`,
    createdAt: a.createdAt,
    tip: "Prospect",
    status: statusOf(`site:${a.id}`),
    canal: "Audit site",
    site: a.domain || a.url,
    nume: a.nume ?? "",
    email: a.email ?? "",
    telefon: a.telefon ?? "",
    observatii: {
      rezultat: `Scor ${a.scor}/100`,
      preocupare: a.email || a.telefon ? (a.probleme ?? []).join(", ") : "Nu a lasat date de contact",
      raport: `/r/${a.id}`,
    },
  }));
  const gads: DashboardRow[] = accounts.map((c) => ({
    key: `gads:${c.id}`,
    createdAt: Date.parse(c.generatedAt) || 0,
    tip: "Prospect",
    status: statusOf(`gads:${c.id}`),
    canal: "Audit Google Ads",
    site: c.website || c.name,
    nume: c.contact.name,
    email: c.contact.email,
    telefon: c.contact.phone,
    observatii: {
      rezultat: `ROAS ${fmtRoas(c.roas)} (minim ${fmtRoas(c.minimumRoas)})${c.reportCount > 1 ? ` · ${c.reportCount} rapoarte` : ""}`,
      preocupare: "",
      raport: `/dashboard/google-ads/reports/${encodeURIComponent(c.id)}`,
    },
  }));
  const rows = filter === "site" ? site : filter === "gads" ? gads : [...site, ...gads];
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
