// Curated reading profiles, one file per platform. Adding a platform = adding a file here, not editing the engine.
// Signals are lowercase substrings matched against a URL's path and query (host removed).

import type { Platform } from "../site-signals";
import generic from "./generic.json";
import gomag from "./gomag.json";
import magento from "./magento.json";
import merchantpro from "./merchantpro.json";
import opencart from "./opencart.json";
import prestashop from "./prestashop.json";
import shopify from "./shopify.json";
import woocommerce from "./woocommerce.json";

export type SitemapKind = "product" | "category" | "mixed" | "other" | "skip";

export type TypicalProblem = { id: string; detectedBy: string; explanation: string; service: string; source: string };

export type PlatformProfile = {
  platform: string;
  testStore: string | null;
  concurrency: number;
  sitemapEntryPoints: string[];
  sitemapSignals: Record<SitemapKind, string[]>;
  urlSignals: { skip: string[]; product: string[]; category: string[] };
  languageSitemaps: boolean;
  traps: string[];
  typicalProblems: TypicalProblem[];
};

export const PROFILES: PlatformProfile[] = [woocommerce, shopify, merchantpro, gomag, prestashop, opencart, magento, generic];
export const GENERIC_PROFILE: PlatformProfile = generic;

export function profileFor(platform: Platform | null | undefined): PlatformProfile {
  return PROFILES.find((p) => p.platform === platform) ?? GENERIC_PROFILE;
}
