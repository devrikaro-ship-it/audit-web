import { randomUUID } from "crypto";
import type { AuditJob } from "./types";
import type { StartMeta, FinalizeInput } from "./audit-request";
import { runAudit } from "./audit-engine";
import { computeRoiSim } from "./roi-sim";
import { saveAudit, getAudit } from "./leads-store";

// Modul care detine CICLUL DE VIATA al unui audit-job, in spatele a 3 operatii:
// startJob (creeaza + ruleaza in fundal), finalizeJob (contact + inputuri -> roiSim + persista),
// getJobView (memorie viu sau store durabil). Race-ul audit/finalize + calculul roiSim +
// persistenta traiesc AICI, nu in ruta. Map-ul in-memory e implementarea privata.

declare global {
  var __auditStore: Map<string, AuditJob> | undefined;
}
if (!global.__auditStore) global.__auditStore = new Map<string, AuditJob>();
const store = global.__auditStore;

const update = (id: string, u: Partial<AuditJob>) => {
  const job = store.get(id);
  if (job) store.set(id, { ...job, ...u });
};

export type JobView = { id: string; url: string; status: AuditJob["status"]; data: AuditJob["data"] | null; error: string | null };

// Porneste auditul de la URL si il ruleaza in fundal. Returneaza id-ul imediat.
export function startJob(url: string, meta: StartMeta = {}): string {
  const id = randomUUID();
  store.set(id, { id, url, ...meta, status: "pending", createdAt: Date.now() });
  (async () => {
    try {
      const data = await runAudit(url);
      update(id, { status: "done", data });
      await tryFinalize(id);
    } catch (err) {
      update(id, { status: "error", error: err instanceof Error ? err.message : "Eroare necunoscuta" });
    }
  })();
  return id;
}

// Contactul + inputurile de simulare (dupa cele 5 intrebari). Idempotent la race cu auditul.
export async function finalizeJob(id: string, input: FinalizeInput): Promise<boolean> {
  if (!store.has(id)) return false;
  update(id, { ...input, finalizeRequested: true });
  await tryFinalize(id);
  return true;
}

export async function getJobView(id: string): Promise<JobView | null> {
  const job = store.get(id);
  if (job) return { id: job.id, url: job.url, status: job.status, data: job.data ?? null, error: job.error ?? null };
  const stored = await getAudit(id);
  if (stored) return { id: stored.id, url: stored.url, status: "done", data: stored.data, error: null };
  return null;
}

// Calculeaza roiSim (cand avem inputuri + date) si persista durabil o singura data,
// cand auditul e gata SI funnel-ul a trimis finalize. Ruleaza dupa ambele evenimente.
async function tryFinalize(id: string): Promise<void> {
  const job = store.get(id);
  if (!job || !job.data) return;

  if (!job.data.roiSim && job.aov && job.adBudget && job.data.conversie?.isEcom) {
    const roiSim = computeRoiSim(
      { adBudget: job.adBudget, aov: job.aov, convRatePct: job.convRate ?? null, currency: job.currency ?? "RON" },
      {
        uxWeak: job.data.ux ? job.data.ux.scor < 55 : true,
        trackingWeak: (job.data.conversie?.scorPpc ?? 0) < 60,
        hasPartnerCss: job.data.googleAds?.css.status === "third_party_css",
      },
    ) ?? undefined;
    if (roiSim) { job.data.roiSim = roiSim; update(id, { data: job.data }); }
  }

  if (job.finalizeRequested && !job.saved) {
    update(id, { saved: true });
    await saveAudit({
      id, url: job.url, domain: job.data.domain, scor: job.data.scor, createdAt: job.createdAt,
      nume: job.nume, email: job.email, telefon: job.telefon,
      tipBusiness: job.tipBusiness, platforma: job.platforma, probleme: job.probleme, data: job.data,
    });
  }
}
