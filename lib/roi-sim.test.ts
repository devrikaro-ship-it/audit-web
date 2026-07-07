import { describe, it, expect } from "vitest";
import { computeRoiSim } from "./roi-sim";

describe("computeRoiSim", () => {
  it("intoarce null cand bugetul sau AOV lipseste / e <= 0", () => {
    const levers = { uxWeak: true, trackingWeak: true, hasPartnerCss: false };
    expect(computeRoiSim({ adBudget: 0, aov: 50, convRatePct: 1.5, currency: "EUR" }, levers)).toBeNull();
    expect(computeRoiSim({ adBudget: 1000, aov: 0, convRatePct: 1.5, currency: "EUR" }, levers)).toBeNull();
    expect(computeRoiSim({ adBudget: NaN, aov: 50, convRatePct: 1.5, currency: "EUR" }, levers)).toBeNull();
  });

  it("foloseste media pietei cand conversia e null ('nu stiu')", () => {
    const r = computeRoiSim({ adBudget: 1000, aov: 50, convRatePct: null, currency: "EUR" }, { uxWeak: true, trackingWeak: true, hasPartnerCss: false });
    expect(r).not.toBeNull();
    expect(r!.usedMarketAverage).toBe(true);
    expect(r!.convNowPct).toBe(1.3);
  });

  it("ROAS = (conversie/100) * AOV / CPC; posibil > acum cand exista spatiu de crestere", () => {
    const r = computeRoiSim({ adBudget: 1500, aov: 55, convRatePct: 1.5, currency: "EUR" }, { uxWeak: true, trackingWeak: true, hasPartnerCss: false })!;
    expect(r.convGoalPct).toBeGreaterThan(r.convNowPct);
    expect(r.roasGoal).toBeGreaterThan(r.roasNow);
    expect(r.extraRevenueMonth).toBeGreaterThan(0);
    // ROAS acum = 0.015 * 55 / 0.45 = 1.83 -> rotunjit 1.8
    expect(r.roasNow).toBeCloseTo(1.8, 1);
  });

  it("CPC de referinta e nativ pe moneda: RON (~2.2 lei/click) da ROAS mult mai mic decat EUR", () => {
    const eur = computeRoiSim({ adBudget: 1000, aov: 50, convRatePct: 1.5, currency: "EUR" }, { uxWeak: false, trackingWeak: false, hasPartnerCss: false })!;
    const ron = computeRoiSim({ adBudget: 1000, aov: 50, convRatePct: 1.5, currency: "RON" }, { uxWeak: false, trackingWeak: false, hasPartnerCss: false })!;
    // CPC RON (2.2) >> CPC EUR (0.45) -> ROAS RON mult mai mic (nu convertit, nativ)
    expect(ron.roasNow).toBeLessThan(eur.roasNow / 3);
    expect(ron.currency).toBe("RON");
    expect(ron.assumptions[0]).toMatch(/lei/);
    // CPC afisat = valoarea exacta folosita in calcul (0.45), nu rotunjit la 0.5
    expect(eur.assumptions[0]).toContain("0.45");
    expect(eur.assumptions[0]).not.toContain("0.5 ");
  });

  it("CSS partener => fara reducere CPC (cpcReductionPct = 0)", () => {
    const withPartner = computeRoiSim({ adBudget: 1000, aov: 50, convRatePct: 1.5, currency: "EUR" }, { uxWeak: false, trackingWeak: false, hasPartnerCss: true })!;
    const withoutPartner = computeRoiSim({ adBudget: 1000, aov: 50, convRatePct: 1.5, currency: "EUR" }, { uxWeak: false, trackingWeak: false, hasPartnerCss: false })!;
    expect(withPartner.cpcReductionPct).toBe(0);
    expect(withoutPartner.cpcReductionPct).toBeGreaterThan(0);
  });

  it("plafoneaza cresterea de conversie (nu promite peste 3% si nu peste 1.8x)", () => {
    const r = computeRoiSim({ adBudget: 1000, aov: 50, convRatePct: 2.8, currency: "EUR" }, { uxWeak: true, trackingWeak: true, hasPartnerCss: false })!;
    expect(r.convGoalPct).toBeLessThanOrEqual(3.0);
    expect(r.convGoalPct / r.convNowPct).toBeLessThanOrEqual(1.8 + 1e-9);
  });
});
