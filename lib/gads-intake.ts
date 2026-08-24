// Intake: aduce catalogul de Shopping al contului conectat si il transforma in randurile
// pe care le mananca motorul (`lib/gads-audit.ts`).
//
// DE CE DOUA INTEROGARI, nu una: `shopping_product` cu metrici returneaza doar produsele care
// au avut activitate — Google arunca randurile cu totul pe zero. Daca ne-am opri acolo,
// produsele moarte (Zombies) ar fi structural invizibile si am raporta mereu zero. Deci:
//   1. CATALOG      — fara segments.date, fara metrici -> lista COMPLETA, inclusiv nevandute
//   2. PERFORMANTA  — cu metrici pe 12 luni            -> doar cele care au rulat
// Join pe item id; ce e in catalog dar lipseste din performanta = Zombie (0/0/0).
//
// Verificat pe cont real (puria, 06-08-2026): ambele interogari raspund. Pentru industrie
// luam `category_level1` (id-ul taxonomiei Google, ex productCategoryConstants/LEVEL1~1),
// NU `product_type_level1` — acela e text liber scris de comerciant in limba lui
// ("hrana uscata", "recompense si snackuri"), deci nu se poate potrivi de o regula generala.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";
import type { Product } from "./gads-audit";

/** Fereastra de analiza pentru constatari. 12 luni = un an intreg de sezonalitate, cum cere SPEC-ul. */
export const WINDOW_DAYS = 365;

/**
 * Ferestrele pe care se poate citi harta catalogului. Implicit prima: pe 30 de zile, "produsul
 * asta n-a vandut" chiar inseamna ceva, pe cand pe 12 luni aproape orice produs a prins candva
 * o vanzare si toate grupele se amesteca.
 */
export const FERESTRE = [
  { zile: 30, eticheta: "30 de zile" },
  { zile: 90, eticheta: "3 luni" },
  { zile: 180, eticheta: "6 luni" },
  { zile: 365, eticheta: "12 luni" },
] as const;

export type PerfRow = {
  itemId: string;
  title?: string;
  costMicros: number;
  conversionsValue: number;
  impressions: number;
  /** Clicurile decid daca produsul a avut destul trafic cat sa poata fi judecat. */
  clicks: number;
  /** Numarul de vanzari, separat de valoarea lor: "a vandut ceva" si "a vandut destul"
   *  sunt doua intrebari diferite, iar prima e cea care desparte Sidekicks de Zombies. */
  conversions: number;
};

export type CatalogRow = { itemId: string; title?: string; category?: string };

/**
 * Mapare PURA raspuns -> randuri de motor, plus join-ul catalog/performanta.
 * Fara retea aici, ca sa poata fi testata cu fixturi.
 *
 * @returns `products` + `catalogComplete` (false cand n-am putut citi catalogul, caz in care
 *          numarul de Zombies NU e de incredere si raportul trebuie sa taca despre el)
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

/** Inclusive GAQL window containing exactly `zile` UTC calendar dates. */
export function dateRange(today = new Date(), zile = WINDOW_DAYS): { from: string; to: string } {
  const to = new Date(today);
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (zile - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
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

// Raspunsul REST vine camelCase si cu numerele mari ca string — de aici normalizarea.
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
 * Trage catalogul real al contului. Daca interogarea de catalog esueaza, NU aruncam:
 * intoarcem ce avem din performanta cu `catalogComplete=false`, ca raportul sa poata livra
 * Villains si sa taca onest despre Zombies, in loc sa cada de tot.
 */
export async function fetchShoppingProducts(
  customerId: string,
  auth: GoogleAdsAuth,
  today = new Date(),
  zile = WINDOW_DAYS
): Promise<{ products: Product[]; catalogComplete: boolean }> {
  const { from, to } = dateRange(today, zile);

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
