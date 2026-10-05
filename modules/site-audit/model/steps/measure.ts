// Step "viteza": PageSpeed on phone and desktop, server response time and the product feed; the AI evaluation of one
// page per type starts here and runs alongside.
import { PROGRESS, UNAVAILABLE, WORD, fill } from "@/modules/site-audit/model/copy-registry";
import { detectEcom } from "@/modules/site-audit/model/site-signals";
import type { SeoRow } from "@/modules/site-audit/model/types";
import type { PageData, PSIResult } from "@/modules/site-audit/model/data/net";
import type { PageKind } from "@/modules/site-audit/model/data/design-eval";
import type { Home } from "./read-home";
import type { Read } from "./read-pages";
import type { AuditIO, StepReport } from "./io";

export type Measured = {
  homepageData: PageData; isEcom: boolean; mobile: PSIResult | null; desktop: PSIResult | null; ttfbMs: number | null;
  hasProductFeed: boolean; designEval: Promise<Map<PageKind, SeoRow[]> | null>;
};

export async function measure(home: Home, read: Read, io: AuditIO, step: StepReport): Promise<Measured> {
  const { origin, homepage, siteKind } = home;
  const { pages, analyzedPages, leadPages, products, categories } = read;
  step("viteza", "running");
  const homepageData = analyzedPages[0] ?? pages[0] ?? { url: homepage, html: "", status: 0, headers: {}, ok: false };

  const isEcom = siteKind ? siteKind.type === "ecom" : detectEcom(analyzedPages.map((p) => p.html).join("\n").toLowerCase());
  // Part 2's AI evaluation (spec 2026-09-26): one page per type photographed and judged while PageSpeed runs.
  const contactPage = analyzedPages.find((p) => { try { return /contact/i.test(new URL(p.url).pathname); } catch { return false; } })?.url;
  const designEval = io.evaluateDesign(isEcom ? "ecom" : "leads",
    isEcom ? { home: homepageData.url, categorie: categories[0], produs: products[0] } : { home: homepageData.url, serviciu: leadPages?.service[0], contact: contactPage },
    isEcom || !!leadPages).catch(() => null);

  // Phase 3: PSI + TTFB + feed produse (parallel, homepage/origin only)
  const [mobileResult, desktopResult, ttfbResult, feedResult] = await Promise.allSettled([
    io.fetchPSI(origin, "mobile"),
    io.fetchPSI(origin, "desktop"),
    io.measureTTFB(origin),
    io.probeProductFeed(origin),
  ]);
  const mobile = mobileResult.status === "fulfilled" ? mobileResult.value : null;
  const desktop = desktopResult.status === "fulfilled" ? desktopResult.value : null;
  const ttfbMs = ttfbResult.status === "fulfilled" ? ttfbResult.value : null;
  const hasProductFeed = feedResult.status === "fulfilled" ? feedResult.value : false;
  if (mobile?.lcp && mobile.lcp !== UNAVAILABLE) step("viteza", "done", fill(PROGRESS.lcp, { s: mobile.lcp }));
  else step("viteza", "unmeasured", WORD.verify);
  return { homepageData, isEcom, mobile, desktop, ttfbMs, hasProductFeed, designEval };
}
