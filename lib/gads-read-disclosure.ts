export const googleAdsReadCategories = [
  "shopping-product-performance",
  "conversion-tracking",
  "campaign-structure",
  "performance-max",
  "shopping-campaigns",
  "search-campaigns",
  "negative-keywords",
  "search-terms",
  "annual-account-totals",
] as const;

export type GoogleAdsReadCategory = typeof googleAdsReadCategories[number];

// LANG: pending full translation to EN
const localizedReadCategoryLabels: Readonly<Record<GoogleAdsReadCategory, string>> = Object.freeze({
  "shopping-product-performance": "produsele si performanta lor in Shopping",
  "conversion-tracking": "configurarea conversiilor",
  "campaign-structure": "structura campaniilor",
  "performance-max": "campaniile Performance Max",
  "shopping-campaigns": "campaniile Shopping",
  "search-campaigns": "campaniile Search",
  "negative-keywords": "cuvintele cheie negative",
  "search-terms": "termenii de cautare",
  "annual-account-totals": "totalurile contului din ultimele 365 de zile",
});

export function projectGoogleAdsReadCategories(categories: readonly GoogleAdsReadCategory[]): string {
  const labels = categories.map((category) => localizedReadCategoryLabels[category]);
  if (labels.some((label) => !label)) throw new Error("Unknown Google Ads read category");
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} si ${labels.at(-1)}`;
}

export function validateGoogleAdsReadCoverage(sourceCategories: Readonly<Record<string, readonly GoogleAdsReadCategory[]>>): void {
  const covered = new Set<GoogleAdsReadCategory>();
  for (const [source, categories] of Object.entries(sourceCategories)) {
    if (categories.length === 0) throw new Error(`Google Ads source has no disclosed read category: ${source}`);
    for (const category of categories) covered.add(category);
  }
  const missing = googleAdsReadCategories.filter((category) => !covered.has(category));
  if (missing.length) throw new Error(`Google Ads read disclosure is missing categories: ${missing.join(", ")}`);
}
