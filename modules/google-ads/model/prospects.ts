// The Google Ads audits as prospect rows of the agency dashboard (shared/audit-contract.ts).
import type { ProspectRow } from "@/shared/audit-contract";
import { href } from "@/shared/route-table";
import type { ManagerAccount } from "@/modules/google-ads/controller/manager";

export const GADS_CHANNEL = "Audit Google Ads";

function fmtRoas(n: number | null): string { return n == null ? "—" : `${n.toFixed(2)}x`; }

export function gadsProspects(accounts: ManagerAccount[]): ProspectRow[] {
  return accounts.map((c) => ({
    key: `gads:${c.id}`,
    createdAt: Date.parse(c.generatedAt) || 0,
    canal: GADS_CHANNEL,
    site: c.website || c.name,
    nume: c.contact.name,
    email: c.contact.email,
    telefon: c.contact.phone,
    observatii: {
      rezultat: `ROAS ${fmtRoas(c.roas)} (minim ${fmtRoas(c.minimumRoas)})${c.reportCount > 1 ? ` · ${c.reportCount} rapoarte` : ""}`,
      preocupare: "",
      raport: href("dashboardGadsReport", { id: c.id }),
    },
  }));
}
