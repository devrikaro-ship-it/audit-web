// Modul demo pentru auditul pe cont Google Ads conectat.
//
// DE CE EXISTA: fara un cont real conectat, fluxul nu se poate vedea deloc — nici in intalnire,
// nici la testare. `GADS_DEMO=1` inlocuieste STRICT stratul care aduce datele (tokenul + cele
// sapte interogari). Analiza, pragurile si randarea raman codul real, deci ce vezi in demo e
// exact ce vede prospectul, doar pe cifre inventate.
//
// REGULA DE ONESTITATE: cand demo-ul e pornit, raportul o spune la vedere. Un raport demo care
// pretinde ca sunt "cifrele tale reale" e o minciuna care ajunge la un client — s-a intamplat
// deja o data, in versiunea Python a tool-ului.

import type { AccessibleAccount } from "./gads-oauth";
import type { Product } from "./gads-audit";
import { FERESTRE } from "./gads-intake";
import type { StructuraAudit } from "./gads-structure";
import type { TrackingState } from "./gads-tracking";
import type { PmaxData } from "./gads-pmax";
import type { ShoppingData } from "./gads-shopping";
import type { SearchData } from "./gads-search";
import type { TermenBrut } from "./gads-keywords";

/** Valoarea pusa in sesiune in loc de refresh token — nu ajunge niciodata la Google. */
export const DEMO_REFRESH_TOKEN = "demo";
export const DEMO_CUSTOMER_ID = "1234567890";
export const DEMO_CUSTOMER_NAME = "Magazin Demo (date simulate)";

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
   * Acelasi catalog, dat ca "ferestre" de timp, ca demonstratia sa aiba si comutatorul de
   * perioada. Cifrele nu se schimba intre ferestre — sunt simulate, si a le inventa diferite
   * ar da impresia unei precizii pe care demo-ul n-o are.
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

// Magazin de mobila, pentru ca taxonomia Google are id-ul 436 = "mobila" si asa se vede si
// sugestia de marja pe industrie. Cifrele sunt coerente intre ele: cheltuiala campaniei de
// Shopping = suma costurilor produselor, iar ROAS-ul contului iese din valorile de mai jos.
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
  // Catalogul demo acopera INTENTIONAT toate cele cinci etichete — altfel demonstratia arata
  // un raport pe jumatate si nu se vede la ce foloseste segmentarea.
  //        titlu, cost, valoare, afisari, clicuri, vanzari
  const products: Product[] = [
    // Heroes: trafic destul + randament peste tinta
    P("Canapea premium 3 locuri", 6200, 41000, 120400, 1240, 16),
    P("Masa extensibila stejar", 4100, 24800, 88300, 820, 14),
    P("Fotoliu tapitat gri", 2600, 12900, 51200, 520, 10),
    // Villains: trafic destul, dar nu se acopera
    P("Set 4 scaune bucatarie", 5400, 9800, 62700, 1080, 11),
    P("Comoda 6 sertare alba", 3900, 4100, 40100, 780, 4),
    P("Birou reglabil pe inaltime", 3100, 2600, 33400, 620, 2),
    P("Covor shaggy 200x300", 2450, 0, 21800, 490, 0),
    // Sidekicks: putin trafic, dar au vandut
    P("Lampadar arcuit", 210, 900, 4200, 18, 1),
    P("Masuta cafea nuc", 165, 1400, 3600, 14, 1),
    // Zombies: trafic sub prag si nicio vanzare — netestate, nu proaste
    P("Taburet catifea rotativ", 95, 0, 3100, 14, 0),
    P("Oglinda decorativa 80 cm", 40, 0, 1500, 7, 0),
    // 0 Zombies: nicio afisare
    P("Noptiera stejar natur", 0, 0, 0, 0, 0),
    P("Etajera metalica industriala", 0, 0, 0, 0, 0),
    P("Suport TV rotativ", 0, 0, 0, 0, 0),
    P("Perna decorativa catifea", 0, 0, 0, 0, 0),
  ];

  const costShopping = 28260; // suma costurilor de mai sus
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
        titlu: "O campanie liciteaza fara nicio tinta de randament",
        ron: 28800,
        detaliu: "PMax — Catalog complet maximizeaza valoarea fara tROAS setat. Google nu stie sub ce prag nu merita sa liciteze, deci imparte bugetul si catre produse care nu se intorc.",
        grad: "costa",
        exemple: ["PMax — Catalog complet"],
      },
      {
        cod: "brand-in-search",
        titlu: "Campania de brand plateste clicuri care veneau oricum",
        ron: 9600,
        detaliu: "Search — Brand liciteaza pe numele magazinului, pe potrivire larga. O parte din clicurile platite sunt oameni care te cautau deja pe nume.",
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
      // "premium" blocheaza chiar produsul cel mai bine vandut — exact cazul pe care il cauta
      // analiza de negative toxice.
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
