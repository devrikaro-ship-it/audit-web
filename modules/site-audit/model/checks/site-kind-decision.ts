import { SiteKindUnreadable, classifySiteKind } from "@/modules/site-audit/model/site-kind";
import type { SiteKind, SiteKindVerdict } from "@/modules/site-audit/model/site-kind";
import type { SiteKindInfo } from "@/modules/site-audit/model/types";

// The kind of site from the home page (lib/site-kind.ts); a visitor's choice wins. A home page too thin to read gives
// no scan verdict: then only a visitor's choice decides, else the old page-wide shop test does (null here).
export function decideSiteKind(homeHtml: string, url: string, visitor?: SiteKind): SiteKindInfo | null {
  let scan: SiteKindVerdict | null = null;
  try { scan = classifySiteKind(homeHtml, url); } catch (e) { if (!(e instanceof SiteKindUnreadable)) throw e; }
  if (visitor) return { type: visitor, by: "visitor", confidence: scan?.confidence ?? null, evidence: scan?.evidence ?? null };
  return scan ? { type: scan.type, by: "scan", confidence: scan.confidence, evidence: scan.evidence } : null;
}
