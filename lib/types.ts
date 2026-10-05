export type StatusCheck = "ok" | "atentie" | "critic";
// The kind of site the audit judged. The scan's verdict and evidence are kept even when the visitor corrected it.
export type SiteKindSignal = { id: string; strength: string; sample: string };
export type SiteKindInfo = {
  type: "ecom" | "leads"; by: "scan" | "visitor";
  confidence: "high" | "medium" | "low" | null;
  evidence: { url: string | null; readChars: number; ecom: SiteKindSignal[]; leads: SiteKindSignal[] } | null;
};
export type ProgressStep = { id: string; state: "running" | "done" | "unmeasured"; result?: string };
export type AuditStatus = "pending" | "running" | "done" | "error";

export type CheckResult = { status: StatusCheck; value: string };

export type PageCheck = {
  id: string;
  label: string;
  correctCount: number;
  total: number;
  unit?: string;
  problema: string;
  fix: string;
};

export type AuditData = {
  url: string;
  domain: string;
  pagesAnalyzed: number;
  scor: number;
  avertisment?: string; // crawl partial blocat (anti-bot / pagina goala) — verificarile pot fi incomplete
  checksRezultate: Record<string, CheckResult>;
  seoChecks: PageCheck[];
  continutChecks: PageCheck[];
  keywordsChecks: PageCheck[];
  structuraChecks: PageCheck[];
  aiChecks?: PageCheck[];          // GEO / AI search: AI crawlers, llms.txt, entity links (older reports have none)
  isEcom?: boolean;
  siteKind?: SiteKindInfo;         // shop or lead site, who decided, and the scan's evidence (2026-09-25)
  leadPages?: { service: string[]; location: string[] }; // lead sites: the service and location pages read
  productSignal?: ProductSignal;   // product titles and descriptions, shown in the SEO rubric (shops only)
  ux?: UxAudit;                    // UX/UI by page type (shops only)
  seo?: SeoComponent[];            // Part 1: the ten SEO components (2026-09-24); absent on older reports
  uxStd?: SeoComponent[];          // Part 2 as ✓/✗ rows by group, both kinds (2026-09-25); absent on older reports
};

// A measured row: ok of total (total 0 = not measured); verify = observed but not confirmable ("de verificat").
// An AI-evaluated row (spec 2026-09-26 §4) also carries its grade and what the model saw, wrote and advised.
export type AiJudgement = { grade: "bun" | "de-reglat" | "rau"; seen: string; problem: string; fix: string };
export type SeoRow = { id: string; ok: number; total: number; verify?: boolean; ai?: AiJudgement; evaluated?: boolean };
export type SeoComponent = { id: string; rows: SeoRow[] };

// ── UX / UI — analiza pe tipuri de pagina (spec 3.3): viteza + home + categorie + produs + filtre ──
export type UxStatus = "bun" | "partial" | "slab" | "necunoscut";
export type UxField = {
  id: string;         // viteza | home | categorie | produs | filtre
  label: string;
  status: UxStatus;
  scor: number;       // 0-100 (irelevant cand status=necunoscut)
  gasit: string[];    // semnale prezente (limbaj client)
  lipsa: string[];    // semnale absente
  problema: string;   // ce inseamna pentru client
  fix: string;        // ce facem
};
export type UxAudit = {
  scor: number;       // media campurilor cu status != necunoscut
  fields: UxField[];  // 5, in ordinea din spec
};

// ── Semnal produse neoptimizate (instrument de vanzare — carlig Catamo) ──
// Constatare standard, mereu-prezenta pe ecom (ca segmentarea feed-ului).
// Cand avem pagini de produs verificate, o ancoram in numere reale; altfel ramane generica.
export type ProductSignal = {
  checked: number;      // pagini de produs verificate
  weakTitles: number;   // titluri scurte / generice
  missingMeta: number;  // fara meta description
  hasFeed: boolean;     // feed de produse public gasit
  headline: string;
  message: string;
};

export type AuditJob = {
  id: string;
  url: string;
  tipBusiness?: string;
  platforma?: string;
  nume?: string;
  email?: string;
  telefon?: string;
  probleme?: string[];
  finalizeRequested?: boolean; // the funnel sent the contact (finalize)
  siteKind?: "ecom" | "leads"; // the visitor's correction of the scanned kind
  replacedBy?: string;         // restarted with the visitor's kind: this run is never saved
  steps?: ProgressStep[];      // the waiting screen: the engine's steps as they run (spec 2026-09-25 §6)
  status: AuditStatus;
  createdAt: number;
  data?: AuditData;
  error?: string;
};
