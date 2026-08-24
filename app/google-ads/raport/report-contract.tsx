import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const reportContract = {
  pipeline: {
    fetchShoppingProducts: { role: "source", dependencies: [], availability: "required-primary-optional-secondary", failureVisibility: "explicit-primary-silent-secondary" },
    fetchTracking: { role: "source", dependencies: [], availability: "optional-with-fallback", failureVisibility: "explicit" },
    fetchStructura: { role: "source", dependencies: [], availability: "optional", failureVisibility: "silent" },
    fetchKeywordData: { role: "source", dependencies: [], availability: "optional", failureVisibility: "silent-with-specific-visibility-caveat" },
    fetchPmaxData: { role: "source", dependencies: [], availability: "optional", failureVisibility: "silent" },
    fetchShoppingData: { role: "source", dependencies: [], availability: "optional", failureVisibility: "silent" },
    fetchSearchData: { role: "source", dependencies: [], availability: "optional", failureVisibility: "silent" },
    citesteAn: { role: "source", dependencies: [], availability: "optional-with-fallback", failureVisibility: "server-log-only" },
    analizeazaCuvinte: { role: "analysis", dependencies: ["fetchKeywordData", "fetchShoppingProducts"], availability: "optional", failureVisibility: "not-applicable" },
    analizeazaPmax: { role: "analysis", dependencies: ["fetchPmaxData", "fetchStructura"], availability: "optional", failureVisibility: "not-applicable" },
    analizeazaSearch: { role: "analysis", dependencies: ["fetchSearchData"], availability: "optional", failureVisibility: "not-applicable" },
    analizeazaShopping: { role: "analysis", dependencies: ["fetchShoppingData", "fetchTracking"], availability: "optional", failureVisibility: "not-applicable" },
    audit: { role: "analysis", dependencies: ["fetchShoppingProducts"], availability: "required", failureVisibility: "not-applicable" },
    breakEvenRoas: { role: "analysis", dependencies: [], availability: "required", failureVisibility: "not-applicable" },
    bugetLunarDin: { role: "analysis", dependencies: ["citesteAn", "fetchStructura"], availability: "optional-with-fallback", failureVisibility: "not-applicable" },
    buildReport: { role: "analysis", dependencies: ["audit", "fetchTracking", "analizeazaCuvinte", "analizeazaPmax", "analizeazaShopping", "analizeazaSearch", "citesteAn"], availability: "required", failureVisibility: "not-applicable" },
    roasImbunatatit: { role: "analysis", dependencies: ["bugetLunarDin"], availability: "optional", failureVisibility: "not-applicable" },
    segmenteaza: { role: "analysis", dependencies: ["audit", "fetchTracking", "fetchShoppingProducts"], availability: "optional", failureVisibility: "not-applicable" },
  },
  surfaces: {
    "headline-summary": { rendering: "always-on-success", dependencies: [] },
    "catalog-map": { rendering: "conditional", dependencies: ["catalogCount"], guard: "catalogMap", predicate: "catalogCount>=1" },
    "account-settings": { rendering: "conditional", dependencies: ["repairPointCount"], guard: "accountSettings", predicate: "repairPointCount>=1" },
    "unsupported-conclusions": { rendering: "conditional", dependencies: ["quarantinedCount"], guard: "unsupportedConclusions", predicate: "quarantinedCount>=1" },
    "simulator-call-to-action": { rendering: "conditional", dependencies: ["hasStructure", "currentRoas"], guard: "simulator", predicate: "hasStructure&&currentRoas>0" },
    "contact-form": { rendering: "always-on-success", dependencies: [] },
    "honesty-and-caveats": { rendering: "always-on-success", dependencies: [] },
    "catalog-unavailable-recovery": { rendering: "alternative", dependencies: [] },
  },
} as const;

type PipelineId = keyof typeof reportContract.pipeline;
type SurfaceId = keyof typeof reportContract.surfaces;

export function runReportStep<T>(id: PipelineId, operation: () => T): T {
  void reportContract.pipeline[id];
  return operation();
}

export const reportGuards = {
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
