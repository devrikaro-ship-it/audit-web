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
