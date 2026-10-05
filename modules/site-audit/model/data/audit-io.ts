// The real outside world of an audit (spec 2026-10-05 §8): the network seam, the remote browser, PageSpeed, Claude
// and the knowledge base on the data volume.
import { fetchPSI, fetchPage, fetchText, measureTTFB, probeProductFeed } from "@/modules/site-audit/model/data/net";
import { openBrowserFetcher } from "@/modules/site-audit/model/data/browser-fetch";
import { readApprovals } from "@/modules/site-audit/model/data/learning";
import { appendObservation, readObservations } from "@/modules/site-audit/model/data/observations";
import { runSeoProbes } from "@/modules/site-audit/model/data/seo-probes";
import { evalClient, evaluateDesign } from "@/modules/site-audit/model/data/design-eval";
import { findChrome } from "@/modules/site-audit/model/data/find-chrome";
import type { AuditIO } from "@/modules/site-audit/model/steps/io";

export const realAuditIO: AuditIO = {
  fetchPage,
  fetchText,
  openBrowser: (origin) => openBrowserFetcher(origin),
  readObservations: () => readObservations(),
  readApprovals: () => readApprovals(),
  appendObservation: (o) => appendObservation(o),
  fetchPSI,
  measureTTFB,
  probeProductFeed,
  runSeoProbes: (origin, listed, category, sitemapXml) => runSeoProbes(origin, listed, category, sitemapXml),
  evaluateDesign: (kind, targets, withClient) => evaluateDesign(kind, targets, { client: withClient ? evalClient() : null, chrome: findChrome() }),
  now: () => Date.now(),
};
