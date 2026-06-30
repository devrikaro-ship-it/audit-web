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
  checksRezultate: Record<string, CheckResult>;
  seoChecks: PageCheck[];
  continutChecks: PageCheck[];
  keywordsChecks: PageCheck[];
  structuraChecks: PageCheck[];
};

export type AuditJob = {
  id: string;
  url: string;
  tipBusiness?: string;
  platforma?: string;
  status: AuditStatus;
  createdAt: number;
  data?: AuditData;
  error?: string;
};
