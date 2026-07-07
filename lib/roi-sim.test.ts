import { describe, it, expect } from "vitest";
import { computeRoiSim } from "./roi-sim";

describe("computeRoiSim", () => {
  it("intoarce null cand bugetul sau AOV lipseste / e <= 0", () => {
    const levers = { uxWeak: true, trackingWeak: true, hasPartnerCss: false };
    expect(computeRoiSim({ adBudgetEur: 0, aovEur: 50, convRatePct: 1.5 }, levers)).toBeNull();
    expect(computeRoiSim({ adBudgetEur: 1000, aovEur: 0, convRatePct: 1.5 }, levers)).toBeNull();
    expect(computeRoiSim({ adBudgetEur: NaN, aovEur: 50, convRatePct: 1.5 }, levers)).toBeNull();
  });

  it("foloseste media pietei cand conversia e null ('nu stiu')", () => {
    const r = computeRoiSim({ adBudgetEur: 1000, aovEur: 50, convRatePct: null }, { uxWeak: true, trackingWeak: true, hasPartnerCss: false });
    expect(r).not.toBeNull();
    expect(r!.usedMarketAverage).toBe(true);
    expect(r!.convNowPct).toBe(1.3);
  });

  it("ROAS = (conversie/100) * AOV / CPC; posibil > acum cand exista spatiu de crestere", () => {
    const r = computeRoiSim({ adBudgetEur: 1500, aovEur: 55, convRatePct: 1.5 }, { uxWeak: true, trackingWeak: true, hasPartnerCss: false })!;
    expect(r.convGoalPct).toBeGreaterThan(r.convNowPct);
    expect(r.roasGoal).toBeGreaterThan(r.roasNow);
    expect(r.extraRevenueMonthEur).toBeGreaterThan(0);
    // ROAS acum = 0.015 * 55 / 0.45 = 1.83 -> rotunjit 1.8
    expect(r.roasNow).toBeCloseTo(1.8, 1);
  });

  it("CSS partener => fara reducere CPC (cpcReductionPct = 0)", () => {
    const withPartner = computeRoiSim({ adBudgetEur: 1000, aovEur: 50, convRatePct: 1.5 }, { uxWeak: false, trackingWeak: false, hasPartnerCss: true })!;
    const withoutPartner = computeRoiSim({ adBudgetEur: 1000, aovEur: 50, convRatePct: 1.5 }, { uxWeak: false, trackingWeak: false, hasPartnerCss: false })!;
    expect(withPartner.cpcReductionPct).toBe(0);
    expect(withoutPartner.cpcReductionPct).toBeGreaterThan(0);
  });

  it("plafoneaza cresterea de conversie (nu promite peste 3% si nu peste 1.8x)", () => {
    const r = computeRoiSim({ adBudgetEur: 1000, aovEur: 50, convRatePct: 2.8 }, { uxWeak: true, trackingWeak: true, hasPartnerCss: false })!;
    expect(r.convGoalPct).toBeLessThanOrEqual(3.0);
    expect(r.convGoalPct / r.convNowPct).toBeLessThanOrEqual(1.8 + 1e-9);
  });
});
