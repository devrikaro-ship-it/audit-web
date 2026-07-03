import type { GoogleShoppingIntel } from "./css-detect";

export type StatusCheck = "ok" | "atentie" | "critic";
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
  conversie?: ConversieAudit;
  googleAds?: GoogleShoppingIntel; // CSS + peisaj Shopping (doar ecom, via BrightData)
  productSignal?: ProductSignal;   // semnal optimizare produse (carlig Catamo, doar ecom)
  ux?: UxAudit;                    // UX/UI pe tipuri de pagina (doar ecom)
};

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

// ── Conversie / bani pierduti (instrument de vanzare PPC) ──
export type Presence = "da" | "nu" | "necunoscut";
export type ConvZona = "Tracking & PPC" | "Incredere" | "Functii magazin" | "UX & Mobil" | "Cos & checkout";
export type MoneyLeak = {
  id: string;
  label: string;
  zona: ConvZona;
  present: Presence;
  pierdere: string; // ce te costa (benchmark de industrie)
  fix: string;
};
export type ConversieAudit = {
  isEcom: boolean;
  ruleazaReclame: Presence; // detectat tag Ads/Pixel
  scorPpc: number;          // 0-100 pregatire PPC
  leaks: MoneyLeak[];
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
  status: AuditStatus;
  createdAt: number;
  data?: AuditData;
  error?: string;
};
