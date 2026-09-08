// Demo mode for auditing a connected Google Ads account.
//
// WHY IT EXISTS: without a real connected account, the flow cannot be shown in a meeting or in
// tests. `GADS_DEMO=1` replaces ONLY the data-fetching layer (the token plus seven queries).
// Analysis, thresholds, and rendering remain production code, so the demo shows exactly what a
// prospect sees, only with simulated figures.
//
// HONESTY RULE: when demo mode is on, the report says so visibly. A demo report claiming these
// are "your real figures" lies to a client; that already happened once in the Python version.

import type { AccessibleAccount } from "./gads-oauth";
import type { Product } from "./gads-audit";
import { FERESTRE } from "./gads-intake";
import type { StructuraAudit } from "./gads-structure";
import type { TrackingState } from "./gads-tracking";
import type { PmaxData } from "./gads-pmax";
import type { ShoppingData } from "./gads-shopping";
import type { SearchData } from "./gads-search";
import type { TermenBrut } from "./gads-keywords";

/** Value stored in the session instead of a refresh token; it never reaches Google. */
export const DEMO_REFRESH_TOKEN = "demo";
export const DEMO_CUSTOMER_ID = "1234567890";
export const DEMO_CUSTOMER_NAME = "Demo Store (simulated data)";

export function demoOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.GADS_DEMO === "1";
}

export function demoAccounts(): AccessibleAccount[] {
  return [
    {
      customerId: DEMO_CUSTOMER_ID,
      name: DEMO_CUSTOMER_NAME,
      manager: false,
      currency: "RON",
      loginCustomerId: DEMO_CUSTOMER_ID,
    },
  ];
}

export type DemoData = {
  products: Product[];
  reportComparisonProducts: {
    previous: Product[];
    previousYear: Product[];
  };
  /**
   * The same catalog exposed as time windows so the demonstration includes the period selector.
   * Figures do not change between windows: they are simulated, and inventing different values
   * would imply precision the demo does not have.
   */
  ferestre: { zile: number; eticheta: string; products: Product[] }[];
  catalogComplete: boolean;
  tracking: TrackingState;
  structura: StructuraAudit;
  brutCuvinte: { negative: string[]; termeni: TermenBrut[] };
  brutPmax: PmaxData;
  brutShop: ShoppingData;
  brutCautari: SearchData;
};

// Furniture store because Google taxonomy ID 436 means furniture and demonstrates the industry
// margin suggestion. The figures are internally consistent: Shopping campaign spend equals the
// sum of product costs, and account ROAS follows from the values below.
const CATEGORIE_MOBILA = "productCategoryConstants/LEVEL1~436";

const P = (
  title: string,
  cost: number,
  conversionValue: number,
  impressions: number,
  clicks: number,
  conversions: number
): Product => ({
  productId: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  title,
  cost,
  conversionValue,
  impressions,
  clicks,
  conversions,
  category: CATEGORIE_MOBILA,
});

export function demoData(): DemoData {
  // The demo catalog INTENTIONALLY covers all five labels; otherwise the demonstration would show
  // half a report and fail to explain the value of segmentation.
  //        title, cost, value, impressions, clicks, conversions
  const products: Product[] = [
    // Heroes: enough traffic and return above target.
    P("Canapea premium 3 locuri", 6200, 41000, 120400, 1240, 16),
    P("Masa extensibila stejar", 4100, 24800, 88300, 820, 14),
    P("Fotoliu tapitat gri", 2600, 12900, 51200, 520, 10),
    // Villains: enough traffic, but below break-even.
    P("Set 4 scaune bucatarie", 5400, 9800, 62700, 1080, 11),
    P("Comoda 6 sertare alba", 3900, 4100, 40100, 780, 4),
    P("Birou reglabil pe inaltime", 3100, 2600, 33400, 620, 2),
    P("Covor shaggy 200x300", 2450, 0, 21800, 490, 0),
    // Sidekicks: low traffic, but they sold.
    P("Lampadar arcuit", 210, 900, 4200, 18, 1),
    P("Masuta cafea nuc", 165, 1400, 3600, 14, 1),
    // Zombies: traffic below threshold and no sales; untested, not bad.
    P("Taburet catifea rotativ", 95, 0, 3100, 14, 0),
    P("Oglinda decorativa 80 cm", 40, 0, 1500, 7, 0),
    // 0 Zombies: no impressions.
    P("Noptiera stejar natur", 0, 0, 0, 0, 0),
    P("Etajera metalica industriala", 0, 0, 0, 0, 0),
    P("Suport TV rotativ", 0, 0, 0, 0, 0),
    P("Perna decorativa catifea", 0, 0, 0, 0, 0),
  ];

  const costShopping = 28260; // Sum of the costs above.
  const valoareShopping = 97500;

  const structura: StructuraAudit = {
    campanii: [
      {
        nume: "Shopping — Toate produsele", status: "ENABLED", stare: "ELIGIBLE", motive: [],
        canal: "SHOPPING", bidding: "MAXIMIZE_CONVERSION_VALUE", tRoas: 0,
        cost: costShopping, conversii: 214, valoare: valoareShopping,
      },
      {
        nume: "PMax — Catalog complet", status: "ENABLED", stare: "LIMITED",
        motive: ["buget limitat"], canal: "PERFORMANCE_MAX", bidding: "MAXIMIZE_CONVERSION_VALUE",
        tRoas: 0, cost: 28800, conversii: 190, valoare: 96000,
      },
      {
        nume: "Search — Brand", status: "ENABLED", stare: "ELIGIBLE", motive: [],
        canal: "SEARCH", bidding: "MAXIMIZE_CLICKS", tRoas: 0,
        cost: 9600, conversii: 121, valoare: 62000,
      },
    ],
    cheltuialaTotala: costShopping + 28800 + 9600,
    roasCont: (valoareShopping + 96000 + 62000) / (costShopping + 28800 + 9600),
    probleme: [
      {
        cod: "bidding-fara-tinta",
        titlu: "One campaign bids without a return target",
        ron: 28800,
        detaliu: "PMax — Catalog complet maximizes conversion value without a tROAS target. Google has no minimum-return boundary, so it can also allocate budget to products that do not earn it back.",
        grad: "costa",
        exemple: ["PMax — Catalog complet"],
      },
      {
        cod: "brand-in-search",
        titlu: "The brand campaign pays for clicks that may have arrived anyway",
        ron: 9600,
        detaliu: "Search — Brand bids broadly on the store name. Some paid clicks may come from people who were already searching for the brand by name.",
        grad: "reglaj",
        exemple: ["Search — Brand"],
      },
    ],
  };

  return {
    products,
    reportComparisonProducts: {
      previous: products,
      previousYear: products,
    },
    ferestre: FERESTRE.map((w) => ({ zile: w.zile, eticheta: w.eticheta, products })),
    catalogComplete: true,
    tracking: {
      ok: true,
      conversions: [
        { name: "Achizitie site", category: "PURCHASE", primary: true },
        { name: "Adaugare in cos", category: "ADD_TO_CART", primary: false },
      ],
      junkPrimary: [],
      hasSalePrimary: true,
      reasons: [],
    },
    structura,
    brutCuvinte: {
      // "premium" blocks the best-selling product itself, which is exactly the case the toxic
      // negative analysis looks for.
      negative: ["premium", "ieftin", "second hand"],
      termeni: [
        { termen: "canapea ieftina second hand", cost: 1840, conversii: 0, clicuri: 243 },
        { termen: "mobila reconditionata", cost: 960, conversii: 0, clicuri: 118 },
        { termen: "canapea extensibila 3 locuri", cost: 2100, conversii: 14, clicuri: 190 },
      ],
    },
    brutPmax: {
      campanii: [
        { nume: "PMax — Catalog complet", areListaBrand: false, negativeBrand: 0, extindereUrl: true },
      ],
      grupuri: [
        {
          id: "1", nume: "Grup principal", campanie: "PMax — Catalog complet", stare: "ELIGIBLE",
          motive: [], titluri: 3, descrieri: 2, imagini: 1, video: 0, semnale: 0, total: 6,
        },
      ],
    },
    brutShop: {
      campanii: [
        { nume: "Shopping — Toate produsele", status: "ENABLED", bidding: "MAXIMIZE_CONVERSION_VALUE", prioritate: null, bugetZilnic: 120 },
      ],
      produseCuAfisari: 4,
      conversii30z: 26,
      cost30z: 3410,
    },
    brutCautari: {
      campanii: [
        { nume: "Search — Brand", activa: true, subtip: null, aiMax: false, potrivireLarga: true },
      ],
      reclame: [
        { campanie: "Search — Brand", campanieActiva: true, canal: "SEARCH", grup: "Brand exact", grupActiv: true, tip: "RESPONSIVE_SEARCH_AD", activa: true },
      ],
    },
  };
}
