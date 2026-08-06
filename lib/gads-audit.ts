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
 * Marje brute tipice pe industrie — folosite DOAR ca valoare sugerata in formular,
 * niciodata ca fapt despre magazinul lui. Omul le poate schimba.
 * Cheia = prefix de categorie Google Shopping (google_product_category), lowercase.
 */
export const INDUSTRY_MARGIN: ReadonlyArray<{ match: RegExp; label: string; marginPct: number }> = [
  { match: /animal|pet|hrana pentru/i, label: "hrana si accesorii animale", marginPct: 28 },
  { match: /apparel|clothing|imbracaminte|fashion/i, label: "imbracaminte si moda", marginPct: 55 },
  { match: /health|beauty|cosmetic|frumusete/i, label: "cosmetice si ingrijire", marginPct: 60 },
  { match: /electronic|computer|telefon/i, label: "electronice", marginPct: 15 },
  { match: /furniture|home|mobil|casa/i, label: "mobila si decoratiuni", marginPct: 45 },
  { match: /food|beverage|aliment|bacan/i, label: "alimente si bauturi", marginPct: 25 },
  { match: /sport|fitness/i, label: "sport si fitness", marginPct: 40 },
  { match: /toy|jucari|game/i, label: "jucarii", marginPct: 40 },
  { match: /auto|vehicle|piese/i, label: "auto si piese", marginPct: 30 },
  { match: /jewel|watch|bijuterii/i, label: "bijuterii si ceasuri", marginPct: 55 },
];

/** Marja implicita cand nu recunoastem industria — mediana ecom RO, deliberat conservatoare. */
export const DEFAULT_MARGIN_PCT = 35;

/**
 * Ghiceste industria din categoriile produselor lui si intoarce marja de SUGERAT.
 * Se completeaza in formular ca punct de plecare, ca omul sa nu porneasca de la zero.
 */
export function suggestMargin(products: Product[]): {
  label: string;
  marginPct: number;
  detected: boolean;
} {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.category) continue;
    for (const ind of INDUSTRY_MARGIN) {
      if (ind.match.test(p.category)) {
        counts.set(ind.label, (counts.get(ind.label) ?? 0) + 1);
      }
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [label, n] of counts) {
    if (n > bestN) {
      best = label;
      bestN = n;
    }
  }
  if (best) {
    const ind = INDUSTRY_MARGIN.find((i) => i.label === best)!;
    return { label: ind.label, marginPct: ind.marginPct, detected: true };
  }
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
