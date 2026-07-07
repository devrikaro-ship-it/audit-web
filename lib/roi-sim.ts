// Simulare de venit (RECE) — spec AUDIT-SPEC.md §11.3.
// Arata, in loc de "de ce noi", ce inseamna in bani reparatul: ROAS acum vs posibil.
// PUR: nu atinge reteaua. Inputuri de la funnel (buget/AOV/conversie/moneda) + leviere din audit.
//
// ONESTITATE (invariant): rezultatul e ESTIMARE ORIENTATIVA. O singura ipoteza ascunsa
// (costul pe click de referinta) e expusa in `assumptions`. Cifra exacta doar cu acces
// la cont (GA4/Ads) = CALD. Nu prezenta rezultatul drept cifra reala.
//
// MONEDA: toate sumele (buget, AOV, venit) sunt in moneda magazinului (input.currency),
// INCLUSIV CPC-ul de referinta — valoare NATIVA pe moneda (nu convertita din EUR).
// RON e moneda primara (clientii sunt din RO): ~2.2 lei/click blended.

import { symOf } from "./currency";

// ── Constante de model (usor de reglat) ──
const MARKET_CONV_PCT = 1.3;   // rata de conversie medie ecom (fallback la "nu stiu")
const CONV_CAP_PCT = 3.0;      // nu pretindem o conversie posibila peste atat
const UPLIFT_MAX = 1.8;        // crestere de conversie plafonata (conservator)
const UPLIFT_MIN = 1.05;       // macar 5% mai bine daca reparam ceva
const CPC_CUT = 0.12;          // reducere CPC cu CSS partener (mijloc 10-15%), doar daca nu are deja partener

// Cost pe click de referinta (blended ecom), NATIV pe moneda — singura ipoteza ascunsa.
// RON = valoarea primara; restul sunt CPC-uri observate in acele monede, nu conversii.
const CPC_BENCH: Record<string, number> = { RON: 2.2, EUR: 0.45, USD: 0.5, GBP: 0.4 };
const CPC_BENCH_DEFAULT = CPC_BENCH.RON;

export type RoiSimInput = {
  adBudget: number;             // buget lunar de reclame (in moneda magazinului)
  aov: number;                  // comanda medie (in moneda magazinului)
  convRatePct: number | null;   // rata de conversie (%); null = "nu stiu" -> media pietei
  currency: string;             // cod ISO (RON/EUR/...) — CPC de referinta + simbol afisare
};

export type RoiSimLevers = {
  uxWeak: boolean;              // UX/UI slab in audit -> spatiu mai mare de crestere conversie
  trackingWeak: boolean;       // masurare slaba -> spatiu de crestere
  hasPartnerCss: boolean;      // are deja CSS partener -> fara reducere CPC
};

export type RoiSim = {
  input: RoiSimInput;
  currency: string;             // moneda in care sunt exprimate sumele de mai jos
  usedMarketAverage: boolean;   // conversia a picat pe media pietei
  convNowPct: number;
  convGoalPct: number;
  cpcReductionPct: number;      // 0..15
  roasNow: number;
  roasGoal: number;
  cpaNow: number;
  cpaGoal: number;
  revenueNow: number;
  revenueGoal: number;
  extraRevenueMonth: number;
  extraRevenueYear: number;
  assumptions: string[];
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export function computeRoiSim(input: RoiSimInput, levers: RoiSimLevers): RoiSim | null {
  const budget = input.adBudget;
  const aov = input.aov;
  // fara buget sau AOV pozitiv nu putem simula nimic onest
  if (!Number.isFinite(budget) || !Number.isFinite(aov) || budget <= 0 || aov <= 0) return null;

  const usedMarketAverage = input.convRatePct == null || !Number.isFinite(input.convRatePct) || input.convRatePct <= 0;
  const convNow = usedMarketAverage ? MARKET_CONV_PCT : clamp(input.convRatePct as number, 0.1, CONV_CAP_PCT);

  // tinta de conversie: mai agresiva doar cand auditul arata slabiciuni; mereu plafonata
  const baseTarget = levers.uxWeak ? 2.2 : levers.trackingWeak ? 1.9 : 1.6;
  const convGoal = clamp(
    Math.min(baseTarget, convNow * UPLIFT_MAX),
    convNow * UPLIFT_MIN,
    CONV_CAP_PCT
  );

  // CPC de referinta nativ pe moneda userului (fallback RON).
  const cpcBench = CPC_BENCH[input.currency] ?? CPC_BENCH_DEFAULT;
  const cpcReduction = levers.hasPartnerCss ? 0 : CPC_CUT;
  const cpcNow = cpcBench;
  const cpcGoal = cpcBench * (1 - cpcReduction);

  // ROAS = AOV / CPA = (conversie% / 100) * AOV / CPC
  const roasNow = (convNow / 100) * aov / cpcNow;
  const roasGoal = (convGoal / 100) * aov / cpcGoal;

  const revenueNow = roasNow * budget;
  const revenueGoal = roasGoal * budget;
  const extraMonth = Math.max(0, revenueGoal - revenueNow);

  const cpaNow = aov / roasNow;
  const cpaGoal = aov / roasGoal;

  const sym = symOf(input.currency);
  const assumptions = [
    `Cost pe click de referinta ~${round1(cpcBench)} ${sym} (medie ecom).`,
    usedMarketAverage
      ? `Conversie de pornire = media pietei (~${MARKET_CONV_PCT}%), pentru ca nu ai stiut-o.`
      : `Conversie de pornire = ce ai raspuns (${round1(convNow)}%).`,
    cpcReduction > 0
      ? `Reducere de cost pe click ~${Math.round(cpcReduction * 100)}% presupusa dintr-un CSS partener.`
      : `Fara reducere de cost pe click (folosesti deja un CSS partener).`,
    `Estimare orientativa. Cifra exacta doar cu acces la cont (GA4 / Google Ads).`,
  ];

  return {
    input,
    currency: input.currency,
    usedMarketAverage,
    convNowPct: round1(convNow),
    convGoalPct: round1(convGoal),
    cpcReductionPct: Math.round(cpcReduction * 100),
    roasNow: round1(roasNow),
    roasGoal: round1(roasGoal),
    cpaNow: Math.round(cpaNow),
    cpaGoal: Math.round(cpaGoal),
    revenueNow: roundTo(revenueNow, 10),
    revenueGoal: roundTo(revenueGoal, 10),
    extraRevenueMonth: roundTo(extraMonth, 10),
    extraRevenueYear: roundTo(extraMonth * 12, 50),
    assumptions,
  };
}
