import { describe, it, expect } from "vitest";
import { analizeazaShopping, type ShoppingData } from "./gads-shopping";

// Cifrele vin din conturi reale (06-08-2026): Granox 2.862 produse cu afisari la ~63 de vanzari
// pe luna (diluare 45), doua campanii Shopping active amandoua pe prioritate 2. DeHome, 40 de
// produse la 20 de vanzari (diluare 2) — exact la tinta, deci nu are ce raporta.

const c = (nume: string, p: Partial<ShoppingData["campanii"][0]> = {}) => ({
  nume, status: "ENABLED", bidding: "TARGET_ROAS", prioritate: 2 as number | null, bugetZilnic: 100, ...p,
});

const date = (p: Partial<ShoppingData> = {}): ShoppingData => ({
  campanii: [c("Shop - [Ap]")], produseCuAfisari: 100, conversii30z: 50, cost30z: 3000, ...p,
});

describe("LAW 1 — setul pe care il duce bugetul", () => {
  it("tace la diluare 2 — exact tinta", () => {
    const r = analizeazaShopping(date({ produseCuAfisari: 40, conversii30z: 20 }), true);
    expect(r.diluare).toBe(2);
    expect(r.probleme.some((p) => p.cod === "diluare")).toBe(false);
  });

  it("o marcheaza critica peste 8", () => {
    const r = analizeazaShopping(date({ produseCuAfisari: 2862, conversii30z: 62.9 }), true);
    const p = r.probleme.find((x) => x.cod === "diluare")!;
    expect(Math.round(r.diluare!)).toBe(46);
    expect(p.grad).toBe("critic");
    expect(p.detaliu).toMatch(/nu e buget mai mare, ci set mai mic/);
  });

  it("spune cate produse poate duce bugetul, nu doar ca sunt prea multe", () => {
    const r = analizeazaShopping(date({ produseCuAfisari: 500, conversii30z: 50 }), true);
    expect(r.probleme.find((x) => x.cod === "diluare")!.detaliu).toMatch(/in jur de 100 de produse/);
  });

  it("TACE cand masurarea e stricata — toata aritmetica sta pe numarul de vanzari", () => {
    const r = analizeazaShopping(date({ produseCuAfisari: 2862, conversii30z: 62.9 }), false);
    expect(r.diluare).toBeNull();
    expect(r.probleme.some((p) => p.cod === "diluare")).toBe(false);
  });

  it("tace cand contul n-a avut nicio vanzare — nu imparte la zero", () => {
    const r = analizeazaShopping(date({ conversii30z: 0 }), true);
    expect(r.diluare).toBeNull();
  });
});

describe("lipsa Shopping standard", () => {
  it("o semnaleaza ca pierdere de vizibilitate, nu ca greseala de stiva", () => {
    const r = analizeazaShopping(
      date({ campanii: [c("Pmax - [MV]", { prioritate: null })] }),
      true
    );
    const p = r.probleme.find((x) => x.cod === "shopping-lipsa")!;
    expect(p.grad).toBe("reglaj");
    expect(p.detaliu).toMatch(/Performance Max raporteaza categorii/);
  });

  it("tace cand exista o campanie Shopping activa", () => {
    const r = analizeazaShopping(date(), true);
    expect(r.probleme.some((p) => p.cod === "shopping-lipsa")).toBe(false);
  });

  it("o campanie Shopping OPRITA nu tine loc de una activa", () => {
    const r = analizeazaShopping(date({ campanii: [c("Shop - vechi", { status: "PAUSED" })] }), true);
    expect(r.probleme.some((p) => p.cod === "shopping-lipsa")).toBe(true);
  });
});

describe("licitare si prioritati", () => {
  it("prinde Shopping care nu liciteaza pe randament", () => {
    const r = analizeazaShopping(
      date({ campanii: [c("Shop - manual", { bidding: "MANUAL_CPC", bugetZilnic: 50 })] }),
      true
    );
    const p = r.probleme.find((x) => x.cod === "shopping-bidding")!;
    expect(p.ron).toBe(1500);
  });

  it("semnaleaza doua campanii Shopping cu aceeasi prioritate", () => {
    const r = analizeazaShopping(
      date({ campanii: [c("Shop - [Ap]", { prioritate: 2 }), c("Shop - [Rev1]", { prioritate: 2 })] }),
      true
    );
    const p = r.probleme.find((x) => x.cod === "shopping-prioritate")!;
    expect(p.exemple).toEqual(["Shop - [Ap] — prioritate 2", "Shop - [Rev1] — prioritate 2"]);
  });

  it("tace cand prioritatile chiar sunt diferite — decizia a fost luata", () => {
    const r = analizeazaShopping(
      date({ campanii: [c("Shop - [Ap]", { prioritate: 2 }), c("Shop - catch-all", { prioritate: 0 })] }),
      true
    );
    expect(r.probleme.some((p) => p.cod === "shopping-prioritate")).toBe(false);
  });
});
