// Google Ads audit engine for a connected account (CONNECTED mode).
// Pure function of (products, margin): no I/O and no API. Intake and reporting stay outside.
import { requireGrossMargin } from "./gads-margin";
// Ported 1:1 from engine.py (audit-google-ads-devrika repository), with its hand-computed tests.
//
// Unlike the Python original, this version does not ask the client for a minimum ROAS.
// People generally cannot calculate it themselves, so we ask for MARGIN (which a merchant knows)
// and derive the threshold: break-even ROAS = 1 / margin. See `breakEvenRoas`.

export type Product = {
  productId: string;
  title: string;
  cost: number;
  conversionValue: number;
  impressions: number;
  /**
   * Clicks show whether the product had enough traffic to be judged. They are INTERNAL ENGINE
   * data: neither the count nor the threshold appears in the client report; the client only sees
   * which group contains the product.
   */
  clicks: number;
  /** Number of sales, not their value. Distinguishes "sold a little" from "did not sell." */
  conversions: number;
  /** Google product category, used only to infer the industry. */
  category?: string;
};

export type Villain = Product & { productRoas: number };

/** A product above the threshold. Uses the same return field as Villain for consistent display. */
export type Erou = Product & { productRoas: number };

export type AuditResult = {
  villains: Villain[];
  villainsTotalCost: number;
  /** Enough traffic AND return above target: proven winners. Budget belongs here. */
  heroes: Erou[];
  /**
   * Low traffic, BUT they sold. These are good products that were not given enough exposure:
   * the cheapest account growth, and the reason they cannot be grouped with products that did
   * not sell. The difference is exposure, not performance.
   */
  sidekicks: Erou[];
  /** Traffic threshold used for classification. INTERNAL ENGINE data, never shown to the client. */
  pragClicuri: number;
  /** `list` contains concrete products so the report can name examples, not just count them. */
  /**
   * Traffic below the threshold AND no sales. They are not condemned; they simply lack enough
   * traffic for a conclusion. They usually make up most of the catalog.
   */
  zombies: { count: number; pctOfCatalog: number; list: Product[] };
  /** No impressions: never served. This is a feed or structure issue, not a return issue. */
  zeroZombies: { count: number; pctOfCatalog: number; list: Product[] };
  /** ESTIMATE: market coefficient applied to actual spend. null when the store already has CSS. */
  cssOverpaid: number | null;
  /** SIMULATION: optimistic ceiling, REVENUE not profit. null when no winners with spend remain. */
  zone2Simulation: { current: number; x2: number; x5: number } | null;
  totals: {
    totalCost: number;
    totalConversionValue: number;
    totalProducts: number;
    accountRoas: number | null;
    survivorsCost: number;
    survivorsRoas: number | null;
  };
};

/**
 * How much traffic a product must collect before it can be judged. Below 40 clicks with no sale,
 * no conclusion is justified: at a normal store conversion rate, an order is not yet expected.
 * The threshold is NOT shown to the client.
 *
 * Fixed, not proportional to the date window. Scaling it (40 over 30 days -> 487 over one year)
 * made the 365-day version erase nearly the entire Villain population on real accounts: Villains
 * fell to ZERO products while every wasteful product hid among Sidekicks. The question "is there
 * enough data?" does not depend on the window length: 40 clicks without a sale means the same
 * thing over one month or one year.
 */
export const PRAG_CLICURI = 40;

/** Standard market coefficient: without CSS, CPC can be up to approximately 20% higher. */
export const CSS_DELTA = 0.2;

// ─────────────────────────────────────────────────────────────────────────────
// Threshold: derived from margin, not from a direct question
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Break-even ROAS = 1 / margin. Below it, every sale from ads loses money.
 * House doctrine (feedback_ecom_cpa_max_formula memory): break-even is the only business number
 * required per account; everything else is derived.
 *
 * @param marginPct Gross margin as a percentage (for example, 30 for 30%).
 */
export function breakEvenRoas(marginPct: number): number {
  return 100 / requireGrossMargin(marginPct);
}

/**
 * Typical gross margins by industry: a SUGGESTED form value, never asserted as a fact about the
 * client's store. The person can change it.
 *
 * The key is the level-one Google category ID (`shopping_product.category_level1`). We use the
 * ID instead of text for a reason verified on a real account (2026-08-06):
 * `product_type_level1` is free text written by the merchant in their language, so a general rule
 * cannot match it reliably. Google's taxonomy instead has 21 stable, language-independent IDs.
 */
export const INDUSTRY_MARGIN: ReadonlyMap<number, { label: string; marginPct: number }> = new Map([
  [1, { label: "pet supplies", marginPct: 28 }],
  [8, { label: "arts and entertainment", marginPct: 45 }],
  [111, { label: "business and industrial", marginPct: 30 }],
  [141, { label: "cameras and optics", marginPct: 20 }],
  [166, { label: "apparel and accessories", marginPct: 55 }],
  [222, { label: "electronics", marginPct: 15 }],
  [412, { label: "food and beverages", marginPct: 25 }],
  [436, { label: "furniture", marginPct: 45 }],
  [469, { label: "health and beauty", marginPct: 60 }],
  [536, { label: "home and garden", marginPct: 42 }],
  [537, { label: "baby and toddler", marginPct: 40 }],
  [632, { label: "hardware and tools", marginPct: 30 }],
  [783, { label: "books and media", marginPct: 30 }],
  [888, { label: "vehicles and parts", marginPct: 30 }],
  [922, { label: "office supplies", marginPct: 35 }],
  [988, { label: "sporting goods", marginPct: 40 }],
  [1239, { label: "toys and games", marginPct: 40 }],
  [2092, { label: "software", marginPct: 70 }],
  [5181, { label: "luggage and bags", marginPct: 50 }],
]);

/** Default margin for an unknown industry: a deliberately conservative ecommerce median. */
export const DEFAULT_MARGIN_PCT = 35;

/**
 * Extracts the numeric ID from the resource name returned by the API
 * (`productCategoryConstants/LEVEL1~1` -> 1). Also accepts a direct ID.
 */
export function categoryId(raw?: string): number | null {
  if (!raw) return null;
  const m = /(\d+)\s*$/.exec(raw.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Infers the industry from product categories and returns a SUGGESTED margin for the catalog's
 * DOMINANT category, so a mixed store is not labelled by one corner of a shelf.
 */
export function suggestMargin(products: Product[]): {
  label: string;
  marginPct: number;
  detected: boolean;
} {
  const counts = new Map<number, number>();
  for (const p of products) {
    const id = categoryId(p.category);
    if (id === null || !INDUSTRY_MARGIN.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let bestId: number | null = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      bestId = id;
      bestN = n;
    }
  }
  if (bestId !== null) return { ...INDUSTRY_MARGIN.get(bestId)!, detected: true };
  return { label: "online store", marginPct: DEFAULT_MARGIN_PCT, detected: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Performance segmentation (house doctrine; see `references/google-ads-research.md`).
 * It is controlled by TWO numbers: the target return and how much traffic a product must receive
 * before it can be judged.
 *
 *   1. 0 Zombie  -> no impressions: never served.
 *   2. with impressions:
 *        a) traffic >= threshold: roas >= target -> Hero     (proven -> allocate budget)
 *                                roas < target  -> Villain   (wastes money with real traffic -> cut)
 *        b) traffic < threshold:  has sales     -> Sidekick  (underexposed -> let it serve)
 *                                no sales      -> Zombie    (unknown; it had no fair chance)
 *
 * Why traffic count instead of money spent: the real question is "is there enough data to judge
 * this product?" A product with two clicks and no sale is not a bad product; it is untested.
 * Grouping it with a product that wasted meaningful traffic undermines the report immediately.
 * The threshold is INTERNAL ENGINE data and does not appear in the client report.
 *
 * @param isByGoogle Whether the store runs Shopping directly through Google (without CSS).
 *                   Only then does the CSS estimate apply.
 */
export function audit(
  products: Product[],
  minRoas: number,
  isByGoogle = true,
  pragClicuri = PRAG_CLICURI
): AuditResult {
  const totalProducts = products.length;

  const zeroZombiesList = products.filter((p) => p.impressions === 0);
  const active = products.filter((p) => p.impressions > 0);

  const villains: Villain[] = [];
  const heroes: Erou[] = [];
  const sidekicks: Erou[] = [];
  const zombiesList: Product[] = [];
  const survivors: Product[] = [];

  for (const p of active) {
    const roas = p.cost > 0 ? p.conversionValue / p.cost : 0;
    if (p.clicks >= pragClicuri) {
      if (roas >= minRoas) {
        heroes.push({ ...p, productRoas: roas });
        survivors.push(p);
      } else {
        villains.push({ ...p, productRoas: roas });
      }
    } else if (p.conversions > 0) {
      sidekicks.push({ ...p, productRoas: roas });
      survivors.push(p);
    } else {
      zombiesList.push(p);
    }
  }

  villains.sort((a, b) => b.cost - a.cost);
  // Sort Heroes by value generated (the products supporting the account) and Sidekicks by return
  // (the products worth exposing first). Reading order matches work order.
  heroes.sort((a, b) => b.conversionValue - a.conversionValue);
  sidekicks.sort((a, b) => b.productRoas - a.productRoas);
  zombiesList.sort((a, b) => b.cost - a.cost);
  const villainsTotalCost = sum(villains.map((v) => v.cost));

  const totalCost = sum(products.map((p) => p.cost));
  const totalValue = sum(products.map((p) => p.conversionValue));
  const accountRoas = totalCost > 0 ? totalValue / totalCost : null;

  const survivorsCost = sum(survivors.map((p) => p.cost));
  const survivorsValue = sum(survivors.map((p) => p.conversionValue));
  const survivorsRoas = survivorsCost > 0 ? survivorsValue / survivorsCost : null;

  return {
    villains,
    villainsTotalCost,
    heroes,
    sidekicks,
    pragClicuri,
    zombies: {
      count: zombiesList.length,
      pctOfCatalog: totalProducts > 0 ? zombiesList.length / totalProducts : 0,
      list: zombiesList,
    },
    zeroZombies: {
      count: zeroZombiesList.length,
      pctOfCatalog: totalProducts > 0 ? zeroZombiesList.length / totalProducts : 0,
      list: zeroZombiesList,
    },
    cssOverpaid: isByGoogle ? CSS_DELTA * totalCost : null,
    zone2Simulation:
      survivorsCost > 0 && survivorsRoas !== null
        ? {
            current: survivorsValue,
            x2: survivorsRoas * 2 * survivorsCost,
            x5: survivorsRoas * 5 * survivorsCost,
          }
        : null,
    totals: {
      totalCost,
      totalConversionValue: totalValue,
      totalProducts,
      accountRoas,
      survivorsCost,
      survivorsRoas,
    },
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
