import { describe, expect, it } from "vitest";
import calc from "./calc.js";
import { proiectie } from "./index";

const base = {
  canale: { google: { buget: 100, roas: 4 }, meta: { buget: 50, roas: 2 } },
  retur_pct: 10,
  afiliat_pct: 5,
  transport_pct: 8,
  tva_pct: 19,
  marja_pct: 30,
};

describe("calculator runtime branches", () => {
  it("normalizes absent, malformed, comma, and finite numeric inputs", () => {
    expect(calc.bugetTotal()).toBe(0);
    expect(calc.bugetTotal({ canale: { a: null, b: { buget: "12,5" }, c: { buget: "bad" } } })).toBe(12.5);
    expect(calc.defalcare()).toBeNull();
    expect(calc.defalcare({ canale: {} })).toBeNull();
    expect(calc.defalcare(base)).toMatchObject({ venitBrut: 500 });
  });

  it("covers percentage and budget pricing with and without a breakdown", () => {
    const breakdown = calc.defalcare(base);
    expect(calc.plata(breakdown, { baza: "buget", comision_pct: 10, fee_ron: 5 }, 200)).toEqual({ fee: 5, comision: 20, total: 25 });
    expect(calc.plata(breakdown, { baza: "venit", comision_pct: 10, fee_ron: 5 }, 200).total).toBeGreaterThan(5);
    expect(calc.plata(null, null, 0)).toEqual({ fee: 0, comision: 0, total: 0 });
    expect(calc.ramane(null, 30, 100, 10)).toBeNull();
    expect(calc.ramane(breakdown, 30, 100, 10)).toEqual(expect.any(Number));
  });

  it("selects repair channels and exercises every threshold outcome", () => {
    expect(calc.canalDeReparat()).toBeNull();
    expect(calc.canalDeReparat({ canale: { absent: null, zero: { buget: 0, roas: 1 }, high: { buget: 10, roas: 5 }, low: { buget: 20, roas: 2 }, higherLast: { buget: 30, roas: 10 } } })).toBe("low");
    expect(calc.prag(undefined, {}, "missing", 100).posibil).toBe(false);
    expect(calc.prag(base, {}, "missing", 100).posibil).toBe(false);
    expect(calc.prag({ ...base, marja_pct: 1 }, { baza: "venit", comision_pct: 100 }, "google", 100).posibil).toBe(false);
    expect(calc.prag(base, { baza: "buget", comision_pct: 10, fee_ron: 5 }, "google", 100)).toMatchObject({ posibil: true, canal: "google" });
    expect(calc.prag(base, { baza: "venit", comision_pct: 10, fee_ron: 5 }, "google", 100)).toMatchObject({ posibil: true });
    expect(calc.pragUniform({}, {}, 0).posibil).toBe(false);
    expect(calc.pragUniform({ ...base, marja_pct: 1 }, { baza: "venit", comision_pct: 100 }, 100).posibil).toBe(false);
    expect(calc.pragUniform(base, { baza: "buget", comision_pct: 10 }, 100)).toMatchObject({ posibil: true });
    expect(calc.pragUniform(base, { baza: "venit", comision_pct: 10 }, 100)).toMatchObject({ posibil: true });
  });

  it("covers equal and different plans, projection limits, and consistency", () => {
    expect(calc.pragVariante({ comision_pct: 10 }, { comision_pct: 10 }, 19)).toBeNull();
    expect(calc.pragVariante({ fee_ron: 100, comision_pct: 5 }, { fee_ron: 0, comision_pct: 10 }, undefined)).toMatchObject({ pragNet: 2000 });
    expect(calc.roasImbunatatit(4, 100, 20)).toBeNull();
    expect(calc.roasImbunatatit(4, 20, 25)).toBeCloseTo(6.25);
    expect(calc.coerenta()).toBeNull();
    expect(calc.coerenta({ cpc: 0, conv_pct: 2, aov: 100, roas: 2 })).toBeNull();
    expect(calc.coerenta({ cpc: 1, conv_pct: 2, aov: 100, roas: 2 })).toMatchObject({ ok: true });
    expect(calc.coerenta({ cpc: 1, conv_pct: 2, aov: 100, roas: 10 })).toMatchObject({ ok: false });
    expect(proiectie({ bugetLunar: 100, roasAzi: 4, marjaPct: 30, cpcScadePct: 100, convCrestePct: 20, feeRon: 0, comisionPct: 0 }).roasNou).toBe(4);
  });
});
