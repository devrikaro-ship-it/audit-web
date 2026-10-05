// The website audits as prospect rows of the agency dashboard (shared/audit-contract.ts).
import type { ProspectRow } from "@/shared/audit-contract";
import { href } from "@/shared/route-table";
import { SITE_KIND, SITE_KIND_BY } from "@/modules/site-audit/model/copy-registry";
import type { StoredAudit } from "@/modules/site-audit/model/data/audit-repository";

export const SITE_CHANNEL = "Audit site";

export function siteProspects(audits: StoredAudit[]): ProspectRow[] {
  return audits.map((a) => ({
    key: `site:${a.id}`,
    createdAt: a.createdAt,
    canal: SITE_CHANNEL,
    site: a.domain || a.url,
    nume: a.nume ?? "",
    email: a.email ?? "",
    telefon: a.telefon ?? "",
    observatii: {
      rezultat: `Scor ${a.scor}/100${a.data?.siteKind ? ` · ${SITE_KIND[a.data.siteKind.type]}, ${SITE_KIND_BY[a.data.siteKind.by]}` : ""}`,
      preocupare: a.email || a.telefon ? (a.probleme ?? []).join(", ") : "Nu a lasat date de contact",
      raport: href("siteReport", { id: a.id }),
    },
  }));
}
