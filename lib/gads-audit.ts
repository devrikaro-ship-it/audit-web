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

/** Un produs peste prag. Acelasi camp de randament ca la Villain, ca sa se poata afisa la fel. */
export type Erou = Product & { productRoas: number };

export type AuditResult = {
  villains: Villain[];
  villainsTotalCost: number;
  /**
   * Produsele care trec pragul si duc greul: randament bun SI cheltuiala peste mediana.
   * Aici se pune buget in plus, nu se taie.
   */
  heroes: Erou[];
  /**
   * Randament bun, dar cheltuiala sub mediana — subexpuse. Ele merg deja bine cu putin;
   * separarea lor de Heroes e utila tocmai pentru ca actiunea e alta (le CRESTI, nu le scalezi
   * pe cele care oricum duc contul).
   */
  sidekicks: Erou[];
  /** Mediana cheltuielii pe produsele cu clicuri — linia care desparte Heroes de Sidekicks. */
  medianaCost: number;
  /** `list` = produsele concrete, ca raportul sa poata numi cateva, nu doar sa le numere. */
  zombies: { count: number; pctOfCatalog: number; list: Product[] };
  /**
   * Afisate, dar fara niciun clic (deci fara cheltuiala). Modelul ProductHero le pune tot la
   * Zombies — sunt greutate moarta — dar problema lor e ALTA decat a celor nevazute: aici omul
   * a fost aratat si a trecut mai departe, deci se lucreaza la poza, titlu si pret, nu la feed.
   * Pana acum cadeau printre degete: nu erau nici villains, nici zombies, si nu apareau nicaieri.
   */
  neClicate: { count: number; list: Product[] };
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
 * Segmentarea pe performanta, dupa modelul ProductHero / Labelizer (doctrina casei, vezi
 * `references/google-ads-research.md` din skill-ul de audit): doua axe — randamentul fata de
 * prag si cat cheltuie produsul — plus greutatea moarta.
 *
 *   1. Zombie    -> impressions == 0: nevazut de nimeni. Problema e de feed/structura.
 *   2. NeClicat  -> afisat, dar cost == 0: vazut si ignorat. Problema e poza/titlu/pret.
 *   3. restul (cost > 0), dupa randament fata de prag:
 *        - roas <  minRoas  -> Villain   (consuma fara sa se acopere -> reduci)
 *        - roas >= minRoas si cost >= mediana -> Hero     (duce greul -> scalezi)
 *        - roas >= minRoas si cost <  mediana -> Sidekick (subexpus -> cresti bugetul)
 *
 * Mediana, nu media: media e trasa in sus de un singur produs care mananca jumatate din buget,
 * si atunci toate celelalte ar parea "mici". Mediana desparte catalogul chiar la jumatate.
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
  const neClicateList = active.filter((p) => p.cost <= 0);
  const cuCost = active.filter((p) => p.cost > 0);

  // Linia dintre "cheltuie mult" si "cheltuie putin", calculata pe produsele care chiar au
  // cheltuit ceva — altfel zecile de produse cu 0 lei ar trage mediana la zero si tot catalogul
  // ar parea ca duce greul.
  const medianaCost = mediana(cuCost.map((p) => p.cost));

  const villains: Villain[] = [];
  const heroes: Erou[] = [];
  const sidekicks: Erou[] = [];
  const survivors: Product[] = [];
  for (const p of cuCost) {
    const roas = p.conversionValue / p.cost;
    if (roas < minRoas) {
      villains.push({ ...p, productRoas: roas });
      continue;
    }
    survivors.push(p);
    if (p.cost >= medianaCost) heroes.push({ ...p, productRoas: roas });
    else sidekicks.push({ ...p, productRoas: roas });
  }

  villains.sort((a, b) => b.cost - a.cost);
  // Heroes dupa cheltuiala (cine duce greul), Sidekicks dupa randament (cine merita crescut
  // primul) — ordinea de citire e chiar ordinea in care se lucreaza pe ele.
  heroes.sort((a, b) => b.cost - a.cost);
  sidekicks.sort((a, b) => b.productRoas - a.productRoas);
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
    medianaCost,
    zombies: {
      count: zombiesList.length,
      pctOfCatalog: totalProducts > 0 ? zombiesList.length / totalProducts : 0,
      list: zombiesList,
    },
    neClicate: { count: neClicateList.length, list: neClicateList },
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

/**
 * Mediana unei liste de numere. Pe lista goala intoarce 0 — atunci nu exista niciun produs cu
 * cheltuiala, deci nu exista nici Heroes de despartit de Sidekicks.
 */
function mediana(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}
