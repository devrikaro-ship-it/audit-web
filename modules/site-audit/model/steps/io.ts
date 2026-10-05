// The outside world of one audit, passed into the steps (spec 2026-10-05 §8): every read of the audited site, of
// PageSpeed, of the browser, of Claude and of the knowledge base goes through here, so the steps stay pure and a
// recorded audit can be replayed.
import type { ProgressStepId } from "@/modules/site-audit/model/copy-registry";
import type { Observation } from "@/modules/site-audit/model/observations";
import type { SeoProbes } from "@/modules/site-audit/model/seo-components";
import type { SeoRow } from "@/modules/site-audit/model/types";
import type { PageData, PSIResult } from "@/modules/site-audit/model/data/net";
import type { PageFetcher } from "@/modules/site-audit/model/data/browser-fetch";
import type { Kind, PageKind } from "@/modules/site-audit/model/data/design-eval";

export type AuditIO = {
  fetchPage: (url: string) => Promise<PageData>;
  fetchText: (url: string) => Promise<string>;
  openBrowser: (origin: string) => Promise<PageFetcher | null>;
  readObservations: () => Promise<Observation[]>;
  readApprovals: () => Promise<string[]>;
  appendObservation: (o: Observation) => Promise<void>;
  fetchPSI: (url: string, strategy: "mobile" | "desktop") => Promise<PSIResult | null>;
  measureTTFB: (url: string) => Promise<number | null>;
  probeProductFeed: (origin: string) => Promise<boolean>;
  runSeoProbes: (origin: string, listed: string[], category: string | null, sitemapXml: string) => Promise<SeoProbes>;
  evaluateDesign: (kind: Kind, targets: Partial<Record<PageKind, string>>, withClient: boolean) => Promise<Map<PageKind, SeoRow[]> | null>;
  now: () => number;
};

// The waiting screen's steps (spec 2026-09-25 §6), reported as the engine runs them, each with what it measured.
export type StepReport = (id: ProgressStepId, state: "running" | "done" | "unmeasured", result?: string) => void;
