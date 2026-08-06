// Motorul auditului de Google Ads pe cont conectat (modul CONNECTED).
// Functie PURA de (produse, marja) — fara I/O, fara API. Intake-ul si raportul stau in afara.
// Portat 1:1 din engine.py (repo audit-google-ads-devrika), cu testele lui hand-computed.
//
// Diferenta fata de originalul Python: acolo clientul era intrebat direct ROAS-ul minim.
// Oamenii nu stiu sa si-l calculeze, deci acum intrebam MARJA (pe care orice comerciant o stie)
// si derivam noi pragul: break-even ROAS = 1 / marja. Vezi `breakEvenRoas`.

export type Product = {
  productId: string;
  title: string;
  cost: number;
  conversionValue: number;
  impressions: number;
  /** Categoria Google a produsului — folosita doar ca sa ghicim industria. */
  category?: string;
};

export type Villain = Product & { productRoas: number };

export type AuditResult = {
  villains: Villain[];
  villainsTotalCost: number;
  zombies: { count: number; pctOfCatalog: number };
  /** ESTIMARE: coeficient de piata pe cheltuiala reala. null daca magazinul are deja CSS. */
  cssOverpaid: number | null;
  /** SIMULARE: plafon optimist, VENIT nu profit. null cand nu raman castigatori cu spend. */
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

/** Coeficient standard de piata: fara CSS, CPC-ul poate fi cu pana la ~20% mai mare. */
export const CSS_DELTA = 0.2;

// ─────────────────────────────────────────────────────────────────────────────
// Pragul: din marja, nu din intrebare directa
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Break-even ROAS = 1 / marja. Sub el, fiecare vanzare din reclame pierde bani.
 * Doctrina de casa (memoria feedback_ecom_cpa_max_formula): singurul numar de business
 * necesar per cont e break-even-ul; restul se deriva.
 *
 * @param marginPct marja bruta in procente (ex 30 pentru 30%)
 */
export function breakEvenRoas(marginPct: number): number {
  if (!(marginPct > 0) || marginPct >= 100) {
    throw new RangeError("marja trebuie sa fie intre 1 si 99 la suta");
  }
  return 100 / marginPct;
}

/**
 * Marje brute tipice pe industrie — valoare SUGERATA in formular, niciodata afirmata ca fapt
 * despre magazinul lui. Omul o poate schimba.
 *
 * Cheia = id-ul de categorie Google de nivel 1 (`shopping_product.category_level1`). Am ales
 * id-ul, nu textul, dintr-un motiv verificat pe cont real (06-08-2026): `product_type_level1`
 * e text liber scris de comerciant in limba lui ("hrana uscata", "recompense si snackuri"),
 * deci nu se poate potrivi de o regula generala. Taxonomia Google are in schimb 21 de id-uri
 * stabile, independente de limba.
 */
export const INDUSTRY_MARGIN: ReadonlyMap<number, { label: string; marginPct: number }> = new Map([
  [1, { label: "hrana si accesorii animale", marginPct: 28 }],
  [8, { label: "arta si divertisment", marginPct: 45 }],
  [111, { label: "business si industrial", marginPct: 30 }],
  [141, { label: "foto si optica", marginPct: 20 }],
  [166, { label: "imbracaminte si accesorii", marginPct: 55 }],
  [222, { label: "electronice", marginPct: 15 }],
  [412, { label: "alimente si bauturi", marginPct: 25 }],
  [436, { label: "mobila", marginPct: 45 }],
  [469, { label: "sanatate si frumusete", marginPct: 60 }],
  [536, { label: "casa si gradina", marginPct: 42 }],
  [537, { label: "bebelusi si copii mici", marginPct: 40 }],
  [632, { label: "bricolaj si scule", marginPct: 30 }],
  [783, { label: "carti si media", marginPct: 30 }],
  [888, { label: "auto si piese", marginPct: 30 }],
  [922, { label: "birotica si papetarie", marginPct: 35 }],
  [988, { label: "sport si fitness", marginPct: 40 }],
  [1239, { label: "jucarii si jocuri", marginPct: 40 }],
  [2092, { label: "software", marginPct: 70 }],
  [5181, { label: "bagaje si genti", marginPct: 50 }],
]);

/** Marja implicita cand nu recunoastem industria — mediana ecom, deliberat conservatoare. */
export const DEFAULT_MARGIN_PCT = 35;

/**
 * Extrage id-ul numeric din resource name-ul intors de API
 * (`productCategoryConstants/LEVEL1~1` -> 1). Accepta si un id dat direct.
 */
export function categoryId(raw?: string): number | null {
  if (!raw) return null;
  const m = /(\d+)\s*$/.exec(raw.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Ghiceste industria din categoriile produselor lui si intoarce marja de SUGERAT — pe categoria
 * DOMINANTA din catalog, ca un magazin mixt sa nu fie etichetat dupa un colt de raft.
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
  return { label: "magazin online", marginPct: DEFAULT_MARGIN_PCT, detected: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Motorul
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clasificare mutual exclusiva, in ORDINEA asta:
 *   1. Zombie   -> impressions == 0 (scos INAINTE de testul de villain)
 *   2. restul (impressions > 0):
 *        - cost == 0        -> ignorat (fara spend nu exista pierdere, si nu impartim la 0)
 *        - roas < minRoas   -> Villain
 *        - altfel           -> castigator
 *
 * @param isByGoogle magazinul ruleaza Shopping direct prin Google (fara CSS)? Doar atunci
 *                   are sens estimarea de CSS.
 */
export function audit(
  products: Product[],
  minRoas: number,
  isByGoogle = true
): AuditResult {
  const totalProducts = products.length;

  const zombiesList = products.filter((p) => p.impressions === 0);
  const active = products.filter((p) => p.impressions > 0);

  const villains: Villain[] = [];
  const survivors: Product[] = [];
  for (const p of active) {
    if (p.cost <= 0) continue; // fara spend -> nici villain, nici castigator
    const roas = p.conversionValue / p.cost;
    if (roas < minRoas) villains.push({ ...p, productRoas: roas });
    else survivors.push(p);
  }

  villains.sort((a, b) => b.cost - a.cost);
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
    zombies: {
      count: zombiesList.length,
      pctOfCatalog: totalProducts > 0 ? zombiesList.length / totalProducts : 0,
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
