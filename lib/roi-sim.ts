// Simulare de venit (RECE) — spec AUDIT-SPEC.md §11.3.
// Arata, in loc de "de ce noi", ce inseamna in bani reparatul: ROAS acum vs posibil.
// PUR: nu atinge reteaua. Inputuri de la funnel (buget/AOV/conversie) + leviere din audit.
//
// ONESTITATE (invariant): rezultatul e ESTIMARE ORIENTATIVA. O singura ipoteza ascunsa
// (costul pe click de referinta) e expusa in `assumptions`. Cifra exacta doar cu acces
// la cont (GA4/Ads) = CALD. Nu prezenta rezultatul drept cifra reala.

// ── Constante de model (usor de reglat) ──
const MARKET_CONV_PCT = 1.3;   // rata de conversie medie ecom (fallback la "nu stiu")
const CPC_BENCH_EUR = 0.45;    // cost pe click de referinta (RO ecom, blended) — singura ipoteza ascunsa
const CONV_CAP_PCT = 3.0;      // nu pretindem o conversie posibila peste atat
const UPLIFT_MAX = 1.8;        // crestere de conversie plafonata (conservator)
const UPLIFT_MIN = 1.05;       // macar 5% mai bine daca reparam ceva
const CPC_CUT = 0.12;          // reducere CPC cu CSS partener (mijloc 10-15%), doar daca nu are deja partener

export type RoiSimInput = {
  adBudgetEur: number;          // buget lunar de reclame (EUR)
  aovEur: number;               // comanda medie (EUR)
  convRatePct: number | null;   // rata de conversie (%); null = "nu stiu" -> media pietei
};

export type RoiSimLevers = {
  uxWeak: boolean;              // UX/UI slab in audit -> spatiu mai mare de crestere conversie
  trackingWeak: boolean;       // masurare slaba -> spatiu de crestere
  hasPartnerCss: boolean;      // are deja CSS partener -> fara reducere CPC
};

export type RoiSim = {
  input: RoiSimInput;
  usedMarketAverage: boolean;   // conversia a picat pe media pietei
  convNowPct: number;
  convGoalPct: number;
  cpcReductionPct: number;      // 0..15
  roasNow: number;
  roasGoal: number;
  cpaNowEur: number;
  cpaGoalEur: number;
  revenueNowEur: number;
  revenueGoalEur: number;
  extraRevenueMonthEur: number;
  extraRevenueYearEur: number;
  assumptions: string[];
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export function computeRoiSim(input: RoiSimInput, levers: RoiSimLevers): RoiSim | null {
  const budget = input.adBudgetEur;
  const aov = input.aovEur;
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

  const cpcReduction = levers.hasPartnerCss ? 0 : CPC_CUT;
  const cpcNow = CPC_BENCH_EUR;
  const cpcGoal = CPC_BENCH_EUR * (1 - cpcReduction);

  // ROAS = AOV / CPA = (conversie% / 100) * AOV / CPC
  const roasNow = (convNow / 100) * aov / cpcNow;
  const roasGoal = (convGoal / 100) * aov / cpcGoal;

  const revenueNow = roasNow * budget;
  const revenueGoal = roasGoal * budget;
  const extraMonth = Math.max(0, revenueGoal - revenueNow);

  const cpaNow = aov / roasNow;
  const cpaGoal = aov / roasGoal;

  const assumptions = [
    `Cost pe click de referinta ~${CPC_BENCH_EUR.toFixed(2)} EUR (medie ecom).`,
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
    usedMarketAverage,
    convNowPct: round1(convNow),
    convGoalPct: round1(convGoal),
    cpcReductionPct: Math.round(cpcReduction * 100),
    roasNow: round1(roasNow),
    roasGoal: round1(roasGoal),
    cpaNowEur: Math.round(cpaNow),
    cpaGoalEur: Math.round(cpaGoal),
    revenueNowEur: roundTo(revenueNow, 10),
    revenueGoalEur: roundTo(revenueGoal, 10),
    extraRevenueMonthEur: roundTo(extraMonth, 10),
    extraRevenueYearEur: roundTo(extraMonth * 12, 50),
    assumptions,
  };
}
