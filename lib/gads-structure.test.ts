import { describe, it, expect } from "vitest";
import { analizeazaStructura, type Campanie } from "./gads-structure";

// Pragurile testate aici vin din doctrina casei (google-ads-optimize/general/CHECKLIST.md).
// Daca cineva le schimba din greseala, testele spun exact ce regula a fost incalcata.

const C = (p: Partial<Campanie>): Campanie => ({
  nume: "Camp", status: "ENABLED", stare: "ELIGIBLE", motive: [], canal: "PERFORMANCE_MAX",
  bidding: "MAXIMIZE_CONVERSION_VALUE", tRoas: 10, cost: 100, conversii: 5, valoare: 800, ...p,
});

describe("bidding pe valoare fara tinta", () => {
  it("il prinde si arata cat din buget trece prin el", () => {
    const r = analizeazaStructura([
      C({ nume: "Pmax - [MV]", tRoas: 0, cost: 2977, valoare: 12000, conversii: 18 }),
      C({ nume: "Pmax - [Core][R10]", tRoas: 10, cost: 105, valoare: 700, conversii: 1 }),
    ]);
    const p = r.probleme.find((x) => x.cod === "bidding-fara-tinta")!;
    expect(p).toBeDefined();
    expect(p.ron).toBe(2977);
    expect(p.detaliu).toMatch(/97% din bugetul contului/);
  });

  it("nu se plange cand tinta e setata", () => {
    const r = analizeazaStructura([C({ tRoas: 10 })]);
    expect(r.probleme.some((x) => x.cod === "bidding-fara-tinta")).toBe(false);
  });

  it("ignora campaniile oprite — nu cheltuie nimic acum", () => {
    const r = analizeazaStructura([C({ status: "PAUSED", tRoas: 0, cost: 0 })]);
    expect(r.probleme.some((x) => x.cod === "bidding-fara-tinta")).toBe(false);
  });
});

describe("protectia numelui", () => {
  it("semnaleaza lipsa totala a campaniei de brand", () => {
    const r = analizeazaStructura([C({ nume: "Pmax - [Core]" })]);
    expect(r.probleme.some((x) => x.cod === "brand-lipsa")).toBe(true);
  });

  it("semnaleaza brandul care exista dar nu cheltuie nimic", () => {
    const r = analizeazaStructura([
      C({ nume: "Pmax - [Core]", cost: 1000, valoare: 5000 }),
      C({ nume: "Search - [BP] - Dvk", bidding: "MANUAL_CPC", cost: 0, valoare: 0, conversii: 0 }),
    ]);
    expect(r.probleme.some((x) => x.cod === "brand-inactiv")).toBe(true);
  });

  it("semnaleaza brandul care depaseste 10% din buget", () => {
    const r = analizeazaStructura([
      C({ nume: "Pmax - [Core]", cost: 700, valoare: 5000 }),
      C({ nume: "Search - [BP]", cost: 300, valoare: 900, conversii: 3 }),
    ]);
    expect(r.probleme.some((x) => x.cod === "brand-scurgere")).toBe(true);
  });

  it("tace cand brandul e in banda sanatoasa", () => {
    const r = analizeazaStructura([
      C({ nume: "Pmax - [Core]", cost: 970, valoare: 4000 }),
      C({ nume: "Search - [BP]", cost: 30, valoare: 600, conversii: 4 }),
    ]);
    expect(r.probleme.some((x) => x.cod.startsWith("brand"))).toBe(false);
  });
});

describe("tipuri de campanii interzise", () => {
  it("prinde Display si TARGET_SPEND", () => {
    const r = analizeazaStructura([
      C({ nume: "Display - retarget", canal: "DISPLAY", cost: 400 }),
      C({ nume: "Search - vechi", canal: "SEARCH", bidding: "TARGET_SPEND", cost: 200 }),
      C({ nume: "Search - [BP]", cost: 20, valoare: 400 }),
    ]);
    const p = r.probleme.find((x) => x.cod === "campanii-interzise")!;
    expect(p.ron).toBe(600);
  });
});

describe("livrare franata", () => {
  it("traduce motivele in limbaj de om", () => {
    const r = analizeazaStructura([
      C({ nume: "Search - [BP]", cost: 20, valoare: 400 }),
      C({ nume: "Pmax - [Awr]", stare: "LIMITED", motive: ["BUDGET_CONSTRAINED"] }),
    ]);
    const p = r.probleme.find((x) => x.cod === "livrare-limitata")!;
    expect(p.detaliu).toMatch(/bugetul zilnic se termina prea repede/);
  });

  it("nu raporteaza UNKNOWN ca motiv — nu spune nimic nimanui", () => {
    const r = analizeazaStructura([
      C({ nume: "Search - [BP]", cost: 20, valoare: 400 }),
      C({ nume: "Pmax", stare: "LIMITED", motive: ["UNKNOWN"] }),
    ]);
    const p = r.probleme.find((x) => x.cod === "livrare-limitata")!;
    expect(p.detaliu).not.toMatch(/UNKNOWN|unknown/);
  });
});

describe("castigatori opriti", () => {
  it("ii scoate la iveala cand altii cheltuie sub randamentul lor", () => {
    const r = analizeazaStructura([
      C({ nume: "Search - [BP]", cost: 20, valoare: 400 }),
      C({ nume: "Shop - [Ap][R15]", status: "PAUSED", stare: "PAUSED", cost: 100, valoare: 2000, conversii: 10 }),
      C({ nume: "Pmax - slab", cost: 900, valoare: 1800, conversii: 9 }),
    ]);
    expect(r.probleme.some((x) => x.cod === "castigatori-opriti")).toBe(true);
  });
});

describe("ordonarea problemelor", () => {
  it("pune intai ce costa bani, apoi reglajele", () => {
    const r = analizeazaStructura([
      C({ nume: "Pmax - [MV]", tRoas: 0, cost: 3000, valoare: 9000, conversii: 20 }),
      C({ nume: "Pmax - alta", stare: "LIMITED", motive: ["BUDGET_CONSTRAINED"], cost: 100 }),
    ]);
    expect(r.probleme[0].grad).toBe("costa");
  });
});

describe("prag de materialitate", () => {
  it("tace pe o problema care misca sub 5% din buget — altfel raportul pierde credibilitate", () => {
    const r = analizeazaStructura([
      C({ nume: "Shop - [Ap]", cost: 3600, valoare: 70000, conversii: 40 }),
      C({ nume: "Search - [BP]", tRoas: 0, cost: 19, valoare: 60, conversii: 1 }),
    ]);
    expect(r.probleme.some((x) => x.cod === "bidding-fara-tinta")).toBe(false);
    expect(r.probleme.some((x) => x.cod === "brand-scurgere")).toBe(false);
  });
});

describe("cont oprit", () => {
  it("spune ca nu ruleaza, in loc sa-i regleze structura", () => {
    const r = analizeazaStructura([
      C({ nume: "Pmax", cost: 0, valoare: 0, conversii: 0 }),
      C({ nume: "Search - [BP]", status: "PAUSED", cost: 0, valoare: 0, conversii: 0 }),
    ]);
    expect(r.probleme.map((p) => p.cod)).toEqual(["cont-oprit"]);
  });
});

it("renders plural structure findings, low brand return, unknown reasons, and campaign capacity", () => {
  const r = analizeazaStructura([
    C({ nume: "No target A", tRoas: 0, cost: 400, conversii: 100, valoare: 100 }),
    C({ nume: "No target B", tRoas: 0, cost: 400, conversii: 100, valoare: 100 }),
    C({ nume: "Search - [BP]", cost: 60, conversii: 1, valoare: 80 }),
    C({ nume: "Limited A", stare: "LIMITED", motive: ["CUSTOM_REASON"], cost: 80, conversii: 1 }),
    C({ nume: "Limited B", stare: "LIMITED", motive: [], cost: 80, conversii: 1 }),
  ]);
  expect(r.probleme.find((problem) => problem.cod === "bidding-fara-tinta")?.ron).toBe(800);
  expect(r.probleme.find((problem) => problem.cod === "brand-scurgere")).toBeDefined();
  expect(r.probleme.find((problem) => problem.cod === "livrare-limitata")?.detaliu).toContain("custom reason");
  const spread = analizeazaStructura(Array.from({ length: 5 }, (_, index) => C({ nume: `Campaign ${index}`, cost: 100, conversii: 1 })));
  expect(spread.probleme.find((problem) => problem.cod === "prea-multe-campanii")).toBeDefined();
});

it("covers the zero-conversion capacity branch and a paused non-winner", () => {
  const r = analizeazaStructura([
    C({ nume: "Live", cost: 100, conversii: 0, valoare: 0 }),
    C({ nume: "Paused", status: "PAUSED", cost: 0, conversii: 0, valoare: 10 }),
  ]);
  expect(r.probleme.some((problem) => problem.cod === "prea-multe-campanii")).toBe(false);
  expect(r.probleme.some((problem) => problem.cod === "castigatori-opriti")).toBe(false);
});

it("renders an explicitly paused brand and plural learned campaign capacity", () => {
  const pausedBrand = analizeazaStructura([
    C({ nume: "Live", cost: 100, conversii: 1 }),
    C({ nume: "Search - [BP]", status: "PAUSED", cost: 0, conversii: 0 }),
  ]);
  expect(pausedBrand.probleme.find((problem) => problem.cod === "brand-inactiv")).toBeDefined();

  const campaigns = Array.from({ length: 70 }, (_, index) => C({ nume: `Campaign ${index}`, cost: 100, conversii: 1 }));
  const spread = analizeazaStructura(campaigns);
  expect(spread.probleme.find((problem) => problem.cod === "prea-multe-campanii")).toBeDefined();
});
