// Intake converts the connected account's Shopping catalog into audit-engine rows.
//
// Two queries are required: `shopping_product` with metrics returns only products with
// activity because Google omits all-zero rows. Without the catalog query, inactive products
// would be structurally invisible and the report would always count zero Zombies.
//   1. CATALOG      — no segments.date or metrics -> complete list, including unsold products
//   2. PERFORMANCE  — metrics over the latest 365 days -> products with activity
// Join by item ID; catalog products absent from performance are Zombies (0/0/0).
//
// Both queries were verified against a real account (puria, 2026-08-06). Industry uses
// `category_level1` (Google taxonomy ID, for example productCategoryConstants/LEVEL1~1),
// not `product_type_level1`, which is merchant-authored free text and cannot support a
// language-independent general rule.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";
import type { Product } from "./gads-audit";

/** The primary evidence window contains the latest 365 account-calendar dates. */
export const WINDOW_DAYS = 365;

export function formatAuditWindowLabel(days: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "day",
    unitDisplay: "long",
  }).format(days);
}

/** Legacy Romanian label retained for the excluded collaboration page. */
export const AUDIT_WINDOW_LABEL = `${WINDOW_DAYS} de zile`;

/** English label for public reporting surfaces. */
export const AUDIT_WINDOW_LABEL_ENGLISH = formatAuditWindowLabel(WINDOW_DAYS);

/**
 * Supported catalog-map windows. Short windows answer whether a product sold recently;
 * the 365-day window serves the audit.
 */
export const FERESTRE = [
  { zile: 30, eticheta: "30 days" },
  { zile: 90, eticheta: "3 months" },
  { zile: 180, eticheta: "6 months" },
  { zile: WINDOW_DAYS, eticheta: AUDIT_WINDOW_LABEL_ENGLISH },
] as const;

export type PerfRow = {
  itemId: string;
  title?: string;
  costMicros: number;
  conversionsValue: number;
  impressions: number;
  /** Clicks determine whether a product received enough traffic to be evaluated. */
  clicks: number;
  /** Sale count is separate from value: "sold anything" and "sold enough" are different
   * questions, and the first separates Sidekicks from Zombies. */
  conversions: number;
};

export type CatalogRow = { itemId: string; title?: string; category?: string };

/**
 * Pure response-to-engine-row mapping plus the catalog/performance join.
 * No network access so fixtures can test the transformation.
 *
 * @returns `products` and `catalogComplete`; false means the catalog could not be read,
 *          so the Zombie count is unreliable and the report must omit it.
 */
export function buildProducts(
  perfRows: PerfRow[],
  catalogRows: CatalogRow[] | null
): { products: Product[]; catalogComplete: boolean } {
  const products: Product[] = [];
  const seen = new Set<string>();
  const typeById = new Map<string, string | undefined>();
  for (const c of catalogRows ?? []) typeById.set(c.itemId, c.category);

  for (const r of perfRows) {
    seen.add(r.itemId);
    products.push({
      productId: r.itemId,
      title: r.title || r.itemId,
      cost: r.costMicros / 1_000_000,
      conversionValue: Number(r.conversionsValue) || 0,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
      conversions: Number(r.conversions) || 0,
      category: typeById.get(r.itemId),
    });
  }

  if (catalogRows === null) return { products, catalogComplete: false };

  for (const c of catalogRows) {
    if (seen.has(c.itemId)) continue;
    products.push({
      productId: c.itemId,
      title: c.title || c.itemId,
      cost: 0,
      conversionValue: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      category: c.category,
    });
  }
  return { products, catalogComplete: true };
}

/** Inclusive GAQL window containing exactly `zile` dates in the customer account calendar. */
export function dateRange(
  today: Date,
  zile: number,
  customerTimeZone: string
): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone: customerTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(today);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const accountDate = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  const from = new Date(accountDate);
  from.setUTCDate(from.getUTCDate() - (zile - 1));
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(accountDate) };
}

export function catalogQuery(): string {
  return `SELECT shopping_product.item_id, shopping_product.title,
          shopping_product.category_level1
          FROM shopping_product`;
}

export function perfQuery(from: string, to: string): string {
  return `SELECT shopping_product.item_id, shopping_product.title,
          metrics.impressions, metrics.clicks, metrics.cost_micros,
          metrics.conversions, metrics.conversions_value
          FROM shopping_product
          WHERE segments.date BETWEEN '${from}' AND '${to}'`;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function requireExactRange(range: { from: string; to: string }): void {
  if (!validIsoDate(range.from) || !validIsoDate(range.to) || range.from > range.to) {
    throw new RangeError("Invalid report date range");
  }
}

// REST responses use camelCase and encode large numbers as strings, so normalize them here.
type RawRow = {
  shoppingProduct?: { itemId?: string; title?: string; categoryLevel1?: string };
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    costMicros?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
  };
};

/**
 * Fetches the account's real catalog. If the catalog query fails, return the performance
 * rows with `catalogComplete=false`, allowing the report to show Villains while honestly
 * omitting Zombies instead of failing completely.
 */
export async function fetchShoppingProducts(
  customerId: string,
  auth: GoogleAdsAuth,
  customerTimeZone: string,
  today = new Date(),
  zile = WINDOW_DAYS
): Promise<{ products: Product[]; catalogComplete: boolean }> {
  const range = dateRange(today, zile, customerTimeZone);
  return fetchShoppingProductsForRange(customerId, auth, customerTimeZone, range);
}

export async function fetchShoppingProductsForRange(
  customerId: string,
  auth: GoogleAdsAuth,
  customerTimeZone: string,
  range: { from: string; to: string },
): Promise<{ products: Product[]; catalogComplete: boolean }> {
  new Intl.DateTimeFormat("en-US", { timeZone: customerTimeZone }).format();
  requireExactRange(range);
  const { from, to } = range;

  const perfRaw = (await googleAdsSearch(customerId, perfQuery(from, to), auth)) as RawRow[];
  const perfRows: PerfRow[] = perfRaw.map((r) => ({
    itemId: r.shoppingProduct?.itemId ?? "",
    title: r.shoppingProduct?.title,
    costMicros: Number(r.metrics?.costMicros ?? 0),
    conversionsValue: Number(r.metrics?.conversionsValue ?? 0),
    impressions: Number(r.metrics?.impressions ?? 0),
    clicks: Number(r.metrics?.clicks ?? 0),
    conversions: Number(r.metrics?.conversions ?? 0),
  })).filter((r) => r.itemId);

  let catalogRows: CatalogRow[] | null = null;
  try {
    const catRaw = (await googleAdsSearch(customerId, catalogQuery(), auth)) as RawRow[];
    catalogRows = catRaw.map((r) => ({
      itemId: r.shoppingProduct?.itemId ?? "",
      title: r.shoppingProduct?.title,
      category: r.shoppingProduct?.categoryLevel1,
    })).filter((r) => r.itemId);
  } catch {
    catalogRows = null; // Zombies devin necunoscuti, nu zero
  }

  return buildProducts(perfRows, catalogRows);
}
