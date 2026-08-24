import { describe, it, expect } from "vitest";
import { analizeazaCuvinte, contineCuvant, normalizeaza } from "./gads-keywords";
import type { Product } from "./gads-audit";

// Testele apara regula care face diferenta intre un finding credibil si o acuzatie falsa:
// potrivirea se face pe CUVANT INTREG. Cazurile "ana" in canapea si "trip" in tripla sunt
// reale, gasite pe catalogul DeHome (06-08-2026).

const P = (titlu: string): Product =>
  ({ productId: titlu.slice(0, 8), title: titlu, cost: 10, conversionValue: 0, impressions: 100,
     clicks: 5, conversions: 0 });

const CATALOG = [
  P("Canapea extensibila DeHome Luna, 3 locuri, gri"),
  P("Set mobilier gradina DeHome MG781, canapea tripla si 2 fotolii"),
  P("Leagan DeHome Joy 500 cu suport otel"),
  P("Masa cafea sticla securizata"),
];

describe("potrivire pe cuvant intreg", () => {
  it("gaseste cuvantul cand chiar e cuvant", () => {
    expect(contineCuvant("Canapea extensibila DeHome Luna", "dehome")).toBe(true);
    expect(contineCuvant("Leagan DeHome Joy 500", "leagan")).toBe(true);
  });

  it("NU se aprinde pe subsir — 'ana' din canapea", () => {
    expect(contineCuvant("Canapea extensibila gri", "ana")).toBe(false);
  });

  it("NU se aprinde pe subsir — 'trip' din tripla", () => {
    expect(contineCuvant("canapea tripla si 2 fotolii", "trip")).toBe(false);
  });

  it("ignora diacriticele in ambele sensuri", () => {
    expect(contineCuvant("Canapea extensibilă", "extensibila")).toBe(true);
    expect(normalizeaza("Șezlong Tapițat")).toBe("sezlong tapitat");
  });

  it("ignora cuvintele prea scurte, ca sa nu produca zgomot", () => {
    expect(contineCuvant("Masa cafea", "ma")).toBe(false);
  });
});

describe("negative toxice", () => {
  const r = analizeazaCuvinte(
    ["dehome", "ana", "trip", "second hand", "reparatii"],
    CATALOG,
    [],
    "DeHome Store"
  );

  it("prinde doar negativele care chiar blocheaza produse", () => {
    expect(r.toxice.map((t) => t.cuvant)).toEqual(["dehome"]);
  });

  it("marcheaza auto-blocarea brandului si o pune prima", () => {
    expect(r.toxice[0].eBrand).toBe(true);
    expect(r.toxice[0].produseBlocate).toBe(3);
  });

  it("da exemple concrete, ca omul sa vada despre ce e vorba", () => {
    expect(r.toxice[0].exemple.length).toBeGreaterThan(0);
    expect(r.toxice[0].exemple[0]).toMatch(/DeHome/);
  });

  it("numara toate negativele, nu doar pe cele toxice", () => {
    expect(r.negativeTotal).toBe(5);
  });

  it("un negativ legitim nu apare ca toxic", () => {
    expect(r.toxice.some((t) => t.cuvant === "second hand")).toBe(false);
  });
});

describe("termeni care ard bani", () => {
  const termeni = [
    { termen: "canapea ieftina", cost: 120, conversii: 0, clicuri: 40 },
    { termen: "canapea dehome", cost: 80, conversii: 3, clicuri: 20 },
    { termen: "mobila gradina", cost: 45, conversii: 0, clicuri: 15 },
    { termen: "vizualizare fara cost", cost: 0, conversii: 0, clicuri: 0 },
  ];
  const r = analizeazaCuvinte([], CATALOG, termeni, "DeHome");

  it("ia doar termenii cu cost SI zero conversii", () => {
    expect(r.risipa.map((t) => t.termen)).toEqual(["canapea ieftina", "mobila gradina"]);
    expect(r.risipaTotal).toBe(165);
  });

  it("ii ordoneaza dupa cat au costat", () => {
    expect(r.risipa[0].cost).toBeGreaterThan(r.risipa[1].cost);
  });

  it("nu atinge termenii care convertesc — aia e parghie de bidding, nu negativ", () => {
    expect(r.risipa.some((t) => t.termen === "canapea dehome")).toBe(false);
  });
});

describe("vizibilitate pe termeni", () => {
  it("semnaleaza cand contul nu are date pe termeni (fara Shopping standard)", () => {
    const r = analizeazaCuvinte([], CATALOG, [{ termen: "x", cost: 1, conversii: 0, clicuri: 1 }], "DeHome");
    expect(r.areVizibilitateTermeni).toBe(false);
  });

  it("confirma vizibilitatea cand exista termeni reali", () => {
    const multi = Array.from({ length: 20 }, (_, i) => ({ termen: `t${i}`, cost: 5, conversii: 0, clicuri: 2 }));
    expect(analizeazaCuvinte([], CATALOG, multi, "DeHome").areVizibilitateTermeni).toBe(true);
  });
});

it("skips empty negatives and orders multiple toxic terms by brand then product count", () => {
  const result = analizeazaCuvinte(["", "canapea", "masa", "dehome"], CATALOG, [], "DeHome");
  expect(result.toxice.map((item) => item.cuvant)).toEqual(["dehome", "canapea", "masa"]);
});
