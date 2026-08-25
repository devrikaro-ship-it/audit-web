export const googleAdsReadCategories = [
  "accessible-account-metadata",
  "selected-account-time-zone",
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
  "accessible-account-metadata": "conturile Google Ads accesibile, inclusiv identificatorul, numele, statutul de manager si moneda",
  "selected-account-time-zone": "fusul orar al contului ales",
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

export const googleAdsReadRegistry = {
  listAccounts: { module: "@/lib/gads-oauth", operation: "listAccounts", readCategories: ["accessible-account-metadata"] },
  fetchCustomerTimeZone: { module: "@/lib/gads-oauth", operation: "fetchCustomerTimeZone", readCategories: ["selected-account-time-zone"] },
  fetchShoppingProducts: { module: "@/lib/gads-intake", operation: "fetchShoppingProducts", readCategories: ["shopping-product-performance"] },
  fetchTracking: { module: "@/lib/gads-tracking", operation: "fetchTracking", readCategories: ["conversion-tracking"] },
  fetchStructura: { module: "@/lib/gads-structure", operation: "fetchStructura", readCategories: ["campaign-structure"] },
  fetchKeywordData: { module: "@/lib/gads-keywords", operation: "fetchKeywordData", readCategories: ["negative-keywords", "search-terms"] },
  fetchPmaxData: { module: "@/lib/gads-pmax", operation: "fetchPmaxData", readCategories: ["performance-max"] },
  fetchShoppingData: { module: "@/lib/gads-shopping", operation: "fetchShoppingData", readCategories: ["shopping-campaigns"] },
  fetchSearchData: { module: "@/lib/gads-search", operation: "fetchSearchData", readCategories: ["search-campaigns"] },
  citesteAn: { module: "@/lib/gads-an", operation: "citesteAn", readCategories: ["annual-account-totals"] },
  readPurchaseBaseline: { module: "@/lib/gads-an", operation: "readPurchaseBaseline", readCategories: ["annual-account-totals"] },
} as const satisfies Record<string, { module: string; operation: string; readCategories: readonly GoogleAdsReadCategory[] }>;

export type GoogleAdsReadId = keyof typeof googleAdsReadRegistry;

export function runGoogleAdsRead<T>(id: GoogleAdsReadId, operation: () => T): T {
  void googleAdsReadRegistry[id];
  return operation();
}

export const registeredGoogleAdsReadCategories = Object.fromEntries(
  Object.entries(googleAdsReadRegistry).map(([id, entry]) => [id, entry.readCategories]),
) as unknown as Record<GoogleAdsReadId, readonly GoogleAdsReadCategory[]>;

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

validateGoogleAdsReadCoverage(registeredGoogleAdsReadCategories);
