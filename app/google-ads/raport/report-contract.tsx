import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const reportContract = {
  pipeline: {
    fetchShoppingProducts: { role: "source", module: "@/lib/gads-intake", operation: "fetchShoppingProducts", dependencies: [], availability: "required-primary-optional-secondary", failureVisibility: "explicit-primary-silent-secondary" },
    fetchTracking: { role: "source", module: "@/lib/gads-tracking", operation: "fetchTracking", dependencies: [], availability: "optional-with-fallback", failureVisibility: "explicit" },
    fetchStructura: { role: "source", module: "@/lib/gads-structure", operation: "fetchStructura", dependencies: [], availability: "optional", failureVisibility: "silent" },
    fetchKeywordData: { role: "source", module: "@/lib/gads-keywords", operation: "fetchKeywordData", dependencies: [], availability: "optional", failureVisibility: "silent-with-specific-visibility-caveat" },
    fetchPmaxData: { role: "source", module: "@/lib/gads-pmax", operation: "fetchPmaxData", dependencies: [], availability: "optional", failureVisibility: "silent" },
    fetchShoppingData: { role: "source", module: "@/lib/gads-shopping", operation: "fetchShoppingData", dependencies: [], availability: "optional", failureVisibility: "silent" },
    fetchSearchData: { role: "source", module: "@/lib/gads-search", operation: "fetchSearchData", dependencies: [], availability: "optional", failureVisibility: "silent" },
    citesteAn: { role: "source", module: "@/lib/gads-an", operation: "citesteAn", dependencies: [], availability: "optional-with-fallback", failureVisibility: "server-log-only" },
    analizeazaCuvinte: { role: "analysis", module: "@/lib/gads-keywords", operation: "analizeazaCuvinte", dependencies: ["fetchKeywordData", "fetchShoppingProducts"], availability: "optional", failureVisibility: "not-applicable" },
    analizeazaPmax: { role: "analysis", module: "@/lib/gads-pmax", operation: "analizeazaPmax", dependencies: ["fetchPmaxData", "fetchStructura"], availability: "optional", failureVisibility: "not-applicable" },
    analizeazaSearch: { role: "analysis", module: "@/lib/gads-search", operation: "analizeazaSearch", dependencies: ["fetchSearchData"], availability: "optional", failureVisibility: "not-applicable" },
    analizeazaShopping: { role: "analysis", module: "@/lib/gads-shopping", operation: "analizeazaShopping", dependencies: ["fetchShoppingData", "fetchTracking"], availability: "optional", failureVisibility: "not-applicable" },
    audit: { role: "analysis", module: "@/lib/gads-audit", operation: "audit", dependencies: ["fetchShoppingProducts"], availability: "required", failureVisibility: "not-applicable" },
    breakEvenRoas: { role: "analysis", module: "@/lib/gads-audit", operation: "breakEvenRoas", dependencies: [], availability: "required", failureVisibility: "not-applicable" },
    bugetLunarDin: { role: "analysis", module: "@/lib/gads-an", operation: "bugetLunarDin", dependencies: ["citesteAn", "fetchStructura"], availability: "optional-with-fallback", failureVisibility: "not-applicable" },
    buildReport: { role: "analysis", module: "@/lib/gads-findings", operation: "buildReport", dependencies: ["audit", "fetchTracking", "analizeazaCuvinte", "analizeazaPmax", "analizeazaShopping", "analizeazaSearch", "citesteAn"], availability: "required", failureVisibility: "not-applicable" },
    roasImbunatatit: { role: "analysis", module: "@/lib/calc", operation: "roasImbunatatit", dependencies: ["bugetLunarDin"], availability: "optional", failureVisibility: "not-applicable" },
    segmenteaza: { role: "analysis", module: "@/lib/gads-findings", operation: "segmenteaza", dependencies: ["audit", "fetchTracking", "fetchShoppingProducts"], availability: "optional", failureVisibility: "not-applicable" },
  },
  surfaces: {
    "navigation": { rendering: "always-on-success", dependencies: [], effect: "Keeps the report navigation visible on every successful report." },
    "demo-banner": { rendering: "conditional", dependencies: ["isDemo"], projection: ["demo"], guard: "demoBanner", predicate: "isDemo", effect: "Labels simulated demo data when demo mode is active." },
    "headline-summary": { rendering: "always-on-success", dependencies: [], effect: "Shows the account, evidence window, headline, and summary after the primary report input succeeds." },
    "money-findings": { rendering: "always-on-success", dependencies: [], effect: "Shows every non-quarantined finding, including MEASURED, ESTIMATE, and SIMULATION tiers." },
    "catalog-map": { rendering: "conditional", dependencies: ["catalogCount"], projection: ["hartiCatalog.length"], guard: "catalogMap", predicate: "catalogCount>=1", effect: "Shows catalog performance when at least one secondary short-window catalog read succeeds." },
    "account-settings": { rendering: "conditional", dependencies: ["repairPointCount"], projection: ["rep.puncte.length"], guard: "accountSettings", predicate: "repairPointCount>=1", effect: "Shows repair points when the combined report contains at least one account-setting finding." },
    "unsupported-conclusions": { rendering: "conditional", dependencies: ["quarantinedCount"], projection: ["nejudecabile.length"], guard: "unsupportedConclusions", predicate: "quarantinedCount>=1", effect: "Shows conclusions quarantined by tracking or another evidence gate." },
    "simulator-call-to-action": { rendering: "conditional", dependencies: ["hasStructure", "currentRoas"], projection: ["Boolean(structura)", "structura?.roasCont??0"], guard: "simulator", predicate: "hasStructure&&currentRoas>0", effect: "Offers the separate simulator when structure and current account return are available." },
    "contact-form": { rendering: "always-on-success", dependencies: [], effect: "Shows the contact path after findings on every successful report." },
    "honesty-and-caveats": { rendering: "always-on-success", dependencies: [], effect: "Defines evidence labels and lists the caveats the current report actually produces." },
    "catalog-unavailable-recovery": { rendering: "alternative", dependencies: [], effect: "Replaces the report when the primary catalog read fails." },
  },
} as const;

type PipelineId = keyof typeof reportContract.pipeline;
type SurfaceId = keyof typeof reportContract.surfaces;

export function runReportStep<T>(id: PipelineId, operation: () => T): T {
  void reportContract.pipeline[id];
  return operation();
}

export const reportGuards = {
  demoBanner: (isDemo: boolean) => isDemo,
  catalogMap: (catalogCount: number) => catalogCount >= 1,
  accountSettings: (repairPointCount: number) => repairPointCount >= 1,
  unsupportedConclusions: (quarantinedCount: number) => quarantinedCount >= 1,
  simulator: (hasStructure: boolean, currentRoas: number) => hasStructure && currentRoas > 0,
};

export function ReportSurface({ id, when = true, children, ...props }: {
  id: SurfaceId;
  when?: boolean;
  children: ReactNode;
} & ComponentPropsWithoutRef<"div">) {
  void reportContract.surfaces[id];
  if (!when) return null;
  return <div data-report-surface={id} {...props}>{children}</div>;
}
