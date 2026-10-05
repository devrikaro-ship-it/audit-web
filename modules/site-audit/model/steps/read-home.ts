// Step "citire": the home page, read directly or through the real browser when the server is refused, then the
// platform profile (curated + learned), the language and the kind of site.
import { PROGRESS, SITE_KIND, fill } from "@/modules/site-audit/model/copy-registry";
import { computeLearning, effectiveProfile } from "@/modules/site-audit/model/learning";
import { PROFILES, profileFor, type PlatformProfile } from "@/modules/site-audit/model/platform-knowledge";
import { looksBlocked, openWithRetry } from "@/modules/site-audit/model/read-strategy";
import { detectPlatform } from "@/modules/site-audit/model/site-signals";
import { decideSiteKind } from "@/modules/site-audit/model/checks/site-kind-decision";
import type { SiteKind } from "@/modules/site-audit/model/site-kind";
import type { SiteKindInfo } from "@/modules/site-audit/model/types";
import type { PageData } from "@/modules/site-audit/model/data/net";
import type { PageFetcher } from "@/modules/site-audit/model/data/browser-fetch";
import type { AuditIO, StepReport } from "./io";

// Reads through the browser once it is open (a shop that blocks the server's datacenter IP), directly before.
export type Reader = {
  readText: (u: string) => Promise<string>;
  readPage: (u: string) => Promise<PageData>;
  openFetcher: () => Promise<PageFetcher | null>;
  browser: () => PageFetcher | null;
};

export type Home = {
  origin: string; domain: string; homepage: string; homeDirect: PageData; homeHtmlEarly: string;
  profile: PlatformProfile; language: string | null; platformName: string | null;
  siteKind: SiteKindInfo | null; leads: boolean; reader: Reader;
};

export async function readHome(rawUrl: string, kind: SiteKind | undefined, io: AuditIO, step: StepReport): Promise<Home> {
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  url = url.replace(/\/$/, "");
  const origin = new URL(url).origin;
  const domain = new URL(url).hostname;

  // Phase 1: platform first (its profile says how to read the site), then robots.txt + sitemap -> pages that sell
  const homepage = origin + "/";
  step("citire", "running");
  const homeDirect = await io.fetchPage(homepage);
  let browserFetcher: PageFetcher | null = null;
  const openFetcher = async () => {
    if (!browserFetcher) browserFetcher = await openWithRetry(() => io.openBrowser(origin));
    return browserFetcher;
  };
  if (looksBlocked(homeDirect.ok, homeDirect.html)) await openFetcher();
  const reader: Reader = {
    readText: (u) => (browserFetcher ? browserFetcher.fetchText(u) : io.fetchText(u)),
    readPage: (u) => (browserFetcher ? browserFetcher.fetchPage(u) : io.fetchPage(u)),
    openFetcher,
    browser: () => browserFetcher,
  };
  const homeHtmlEarly = browserFetcher ? (browserFetcher as PageFetcher).homeHtml : homeDirect.html;
  // Curated profile + what the audits learned and passed the safety gate (model/learning.ts).
  const learning = computeLearning(await io.readObservations(), PROFILES, await io.readApprovals());
  const profile = effectiveProfile(profileFor(detectPlatform(homeHtmlEarly.slice(0, 400000))), learning);
  const language = homeHtmlEarly.match(/<html[^>]*\blang=["']?([a-z]{2})/i)?.[1]?.toLowerCase() ?? null;
  const platformName = detectPlatform(homeHtmlEarly.slice(0, 400000));
  // The kind of site decides which pages are read: a shop's categories and products, or a lead site's services and
  // locations (spec 2026-09-25 §2).
  const siteKind = decideSiteKind(homeHtmlEarly, homepage, kind);
  const leads = siteKind?.type === "leads";
  step("citire", "done", siteKind ? fill(PROGRESS.platformKind, { platform: platformName ?? PROGRESS.anySite, kind: SITE_KIND[siteKind.type].toLowerCase() }) : platformName ?? PROGRESS.anySite);
  return { origin, domain, homepage, homeDirect, homeHtmlEarly, profile, language, platformName, siteKind, leads, reader };
}
