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
  /**
   * Clicurile spun daca produsul a avut destul trafic cat sa poata fi judecat. Sunt MOTOR
   * INTERN: nici numarul, nici pragul nu apar in raportul clientului — el vede doar in ce
   * grupa a cazut produsul.
   */
  clicks: number;
  /** Cate vanzari a facut (numar, nu valoare). Desparte "a vandut putin" de "n-a vandut". */
  conversions: number;
  /** Categoria Google a produsului — folosita doar ca sa ghicim industria. */
  category?: string;
};

export type Villain = Product & { productRoas: number };

/** Un produs peste prag. Acelasi camp de randament ca la Villain, ca sa se poata afisa la fel. */
export type Erou = Product & { productRoas: number };

export type AuditResult = {
  villains: Villain[];
  villainsTotalCost: number;
  /** Trafic destul SI randament peste tinta: castigatori doveditii. Aici pui buget. */
  heroes: Erou[];
  /**
   * Trafic putin, DAR au vandut. Sunt produse bune care n-au fost lasate sa se arate —
   * cea mai ieftina crestere din cont, si motivul pentru care nu se pot arunca la gramada
   * cu cele care n-au vandut: diferenta nu e performanta, e expunerea.
   */
  sidekicks: Erou[];
  /** Pragul de trafic folosit la clasificare. MOTOR INTERN — nu se afiseaza clientului. */
  pragClicuri: number;
  /** `list` = produsele concrete, ca raportul sa poata numi cateva, nu doar sa le numere. */
  /**
   * Trafic sub prag SI nicio vanzare. Nu sunt condamnate — pur si simplu n-au avut destul
   * trafic cat sa se poata spune ceva despre ele. De regula sunt grosul catalogului.
   */
  zombies: { count: number; pctOfCatalog: number; list: Product[] };
  /** Nicio afisare: n-au fost servite deloc. Problema e de feed sau de structura, nu de randament. */
  zeroZombies: { count: number; pctOfCatalog: number; list: Product[] };
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

/**
 * Cat trafic trebuie sa fi strans un produs in fereastra analizata ca sa merite judecat.
 * 40 de clicuri pe 30 de zile e pragul de casa: sub el, lipsa unei vanzari nu dovedeste nimic.
 * Se scaleaza cu fereastra (vezi `pragPentruFereastra`) si NU se arata clientului.
 */
export const PRAG_CLICURI = 40;

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
 * Segmentarea pe performanta (doctrina casei, vezi `references/google-ads-research.md`).
 * Se regleaza din DOUA numere: randamentul tinta si cat trafic trebuie sa fi avut un produs
 * ca sa merite judecat.
 *
 *   1. 0 Zombie  -> nicio afisare: n-a fost servit deloc.
 *   2. cu afisari:
 *        a) trafic >= prag:  roas >= tinta -> Hero      (dovedit -> pui buget)
 *                            roas <  tinta -> Villain   (arde bani cu trafic real -> tai)
 *        b) trafic <  prag:  are vanzari   -> Sidekick  (subexpus -> il lasi sa se arate)
 *                            fara vanzari  -> Zombie    (nu stim nimic despre el, n-a avut sansa)
 *
 * De ce contorul de trafic si nu banii cheltuiti: intrebarea reala e "am destule date cat sa
 * judec produsul asta?". Un produs cu doua clicuri si nicio vanzare nu e un produs prost, e un
 * produs netestat — iar a-l pune la un loc cu unul care a ars trafic real face raportul
 * atacabil din prima. Pragul e MOTOR INTERN: nu apare in raportul clientului.
 *
 * @param isByGoogle magazinul ruleaza Shopping direct prin Google (fara CSS)? Doar atunci
 *                   are sens estimarea de CSS.
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
  // Heroes dupa cat aduc (aia sunt produsele pe care se sprijina contul), Sidekicks dupa
  // randament (aia merita expuse primele). Ordinea de citire = ordinea in care se lucreaza.
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

/**
 * Pragul de trafic, ajustat la fereastra analizata. 40 de clicuri stranse in 30 de zile
 * inseamna altceva decat 40 stranse in 12 luni — al doilea nu dovedeste nimic, si daca nu
 * scalam, aproape tot catalogul ar parea "judecabil" pe ferestrele lungi.
 */
export function pragPentruFereastra(zile: number, pragLa30Zile = PRAG_CLICURI): number {
  return Math.max(1, Math.round((pragLa30Zile * zile) / 30));
}
