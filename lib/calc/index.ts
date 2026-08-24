// LANG: pending full translation to EN
// Invelisul tipat peste motorul de calcul al colaborarii (`calc.js`), copiat ca atare din
// calculatorul de ofertare (repo `automatizare-ofertare-razvan`, skill-ul `oferta`).
//
// DE CE COPIAT, NU REscris: formulele alea au deja teste care le tin in loc, iar comisionul e
// ultimul loc unde ne permitem doua implementari care se bat cap in cap. Fisierul `calc.js` NU
// se modifica aici; daca se schimba o formula, se schimba acolo si se copiaza din nou.
//
// CE NU INTRA NICIODATA IN PAGINA PROSPECTULUI: grila noastra de preturi si cat iesim noi.
// Aici exista doar ce completeaza el din oferta primita — onorariul si procentul.

import Calc from "./calc.js";
import { requireGrossMargin } from "../gads-margin";

export type Canal = { buget: number; roas: number };

export type Intrari = {
  canale: Record<string, Canal>;
  marja_pct: number;
  tva_pct?: number;
  retur_pct?: number;
  afiliat_pct?: number;
  transport_pct?: number;
};

export type Varianta = { fee_ron: number; comision_pct: number; baza: "vanzari_nete" | "buget" };

export type Defalcare = {
  venitBrut: number;
  scazutRetur: number;
  scazutAfiliat: number;
  scazutTvaTransport: number;
  baza: number;
  netAtribuit: number;
};

export type Plata = { fee: number; comision: number; total: number };

export type Prag =
  | { posibil: true; factor: number; crestereRoasPct: number }
  | { posibil: false; motiv: string };

type CalcApi = {
  bugetTotal(i: Intrari): number;
  defalcare(i: Intrari): Defalcare | null;
  plata(d: Defalcare | null, v: Varianta, buget: number): Plata;
  ramane(d: Defalcare | null, marjaPct: number, buget: number, plataTotal: number): number | null;
  pragUniform(i: Intrari, v: Varianta, buget: number): Prag;
  roasImbunatatit(roasAzi: number, cpcScadePct: number, convCrestePct: number): number | null;
};

const C = Calc as unknown as CalcApi;

export const { plata, roasImbunatatit } = C;

export function bugetTotal(input: Intrari): number {
  requireGrossMargin(input.marja_pct);
  return C.bugetTotal(input);
}

export function defalcare(input: Intrari): Defalcare | null {
  requireGrossMargin(input.marja_pct);
  return C.defalcare(input);
}

export function ramane(breakdown: Defalcare | null, marginPct: number, budget: number, totalPayment: number): number | null {
  return C.ramane(breakdown, requireGrossMargin(marginPct), budget, totalPayment);
}

export function pragUniform(input: Intrari, plan: Varianta, budget: number): Prag {
  requireGrossMargin(input.marja_pct);
  return C.pragUniform(input, plan, budget);
}

// ─────────────────────────────────────────────────────────────────────────────
// Proiectia folosita in raportul de audit
// ─────────────────────────────────────────────────────────────────────────────

export type ProiectieIntrari = {
  /** Monthly ad budget derived from latest-365-day spend divided by 12. */
  bugetLunar: number;
  /** ROAS-ul contului azi, masurat. */
  roasAzi: number;
  /** Marja lui, cea confirmata la pasul 2 al auditului. */
  marjaPct: number;
  /** Ipoteza de imbunatatire: cat scade CPC-ul si cat creste rata de conversie. */
  cpcScadePct: number;
  convCrestePct: number;
  /** Ce completeaza el din oferta primita. 0 = necompletat inca. */
  feeRon: number;
  comisionPct: number;
};

export type Proiectie = {
  roasNou: number | null;
  venitAcum: number;
  venitCu: number;
  /** Ce ii ramane pe luna dupa costul marfii si bugetul de reclame. */
  profitAcum: number | null;
  /** Acelasi lucru, dupa imbunatatire si dupa ce ne plateste pe noi. */
  profitCu: number | null;
  plataDevrika: number;
  /** Cat trebuie sa creasca rezultatul reclamelor ca sa ne acoperim costul. */
  crestereNecesaraPct: number | null;
  motivPrag?: string;
};

function intrariDin(x: ProiectieIntrari, roas: number): Intrari {
  return { canale: { reclame: { buget: x.bugetLunar, roas } }, marja_pct: requireGrossMargin(x.marjaPct), tva_pct: 21 };
}

function varianta(x: ProiectieIntrari): Varianta {
  return { fee_ron: x.feeRon, comision_pct: x.comisionPct, baza: "vanzari_nete" };
}

/** Proiectia la un ROAS dat direct — folosita si de teste, ca sa poata verifica pragul. */
export function proiectieCuRoas(x: ProiectieIntrari, roasNou: number): Proiectie {
  requireGrossMargin(x.marjaPct);
  const acum = defalcare(intrariDin(x, x.roasAzi));
  const cu = defalcare(intrariDin(x, roasNou));
  const v = varianta(x);
  const p = plata(cu, v, x.bugetLunar);
  const prag = pragUniform(intrariDin(x, x.roasAzi), v, x.bugetLunar);

  return {
    roasNou,
    venitAcum: acum ? acum.venitBrut : 0,
    venitCu: cu ? cu.venitBrut : 0,
    // Acum nu ne plateste pe noi, deci plata e zero. Comparatia trebuie sa fie cinstita:
    // dreapta include costul nostru, stanga nu.
    profitAcum: ramane(acum, x.marjaPct, x.bugetLunar, 0),
    profitCu: ramane(cu, x.marjaPct, x.bugetLunar, p.total),
    plataDevrika: p.total,
    crestereNecesaraPct: prag.posibil ? prag.crestereRoasPct : null,
    motivPrag: prag.posibil ? undefined : prag.motiv,
  };
}

/**
 * Proiectia pornind de la ipoteza de lucru: CPC in scadere si conversie in crestere. ROAS-ul
 * NU e o cifra afirmata de noi, ci consecinta celor doua — de aceea se poate discuta separat,
 * si de aceea cursoarele se pot trage pana la zero.
 */
export function proiectie(x: ProiectieIntrari): Proiectie {
  requireGrossMargin(x.marjaPct);
  const roasNou = roasImbunatatit(x.roasAzi, x.cpcScadePct, x.convCrestePct);
  return proiectieCuRoas(x, roasNou ?? x.roasAzi);
}
