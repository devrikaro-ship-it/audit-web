import { describe, it, expect } from "vitest";
import { analizeazaPmax, type PmaxData } from "./gads-pmax";
import type { Campanie } from "./gads-structure";

// Cazurile de aici vin din conturi reale (DeHome / Granox, 06-08-2026): extindere URL pornita
// pe campania cu 93% din buget, un grup cu un singur titlu lung, si grupuri NOT_ELIGIBLE doar
// pentru ca stau sub o campanie oprita.

const camp = (nume: string, p: Partial<Campanie> = {}): Campanie => ({
  nume, status: "ENABLED", stare: "ELIGIBLE", motive: [], canal: "PERFORMANCE_MAX",
  bidding: "MAXIMIZE_CONVERSION_VALUE", tRoas: 10, cost: 1000, conversii: 10, valoare: 8000, ...p,
});

const pmax = (nume: string, p: Partial<PmaxData["campanii"][0]> = {}) =>
  ({ nume, areListaBrand: true, negativeBrand: 0, extindereUrl: false, ...p });

const grup = (nume: string, campanie: string, p: Partial<PmaxData["grupuri"][0]> = {}) => ({
  id: nume, nume, campanie, stare: "ENABLED", motive: [] as string[],
  titluri: 0, descrieri: 0, imagini: 0, video: 0, semnale: 0, total: 0, ...p,
});

describe("extinderea automata a paginilor", () => {
  it("o prinde si arata cat buget trece prin campanie", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("Pmax - [MV]", { extindereUrl: true })], grupuri: [] },
      [camp("Pmax - [MV]", { cost: 2977 })]
    );
    const p = r.probleme.find((x) => x.cod === "extindere-url")!;
    expect(p.ron).toBe(2977);
    expect(p.exemple).toEqual(["Pmax - [MV]"]);
  });

  it("nu se plange pe o campanie oprita — nu cheltuie nimic acum", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("Pmax - vechi", { extindereUrl: true })], grupuri: [] },
      [camp("Pmax - vechi", { status: "PAUSED" })]
    );
    expect(r.probleme).toEqual([]);
  });
});

describe("protectia brandului pe PMax", () => {
  it("tace cand lista oficiala de brand e activa", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("Pmax - [Core]", { areListaBrand: true })], grupuri: [] },
      [camp("Pmax - [Core]")]
    );
    expect(r.probleme.some((x) => x.cod === "pmax-fara-brand")).toBe(false);
  });

  it("tace si cand protectia vine din negative de campanie", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("Pmax - [Core]", { areListaBrand: false, negativeBrand: 4 })], grupuri: [] },
      [camp("Pmax - [Core]")]
    );
    expect(r.probleme.some((x) => x.cod === "pmax-fara-brand")).toBe(false);
  });

  it("semnaleaza cand nu exista niciuna din cele doua", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("Pmax - [Core]", { areListaBrand: false, negativeBrand: 0 })], grupuri: [] },
      [camp("Pmax - [Core]", { cost: 1500 })]
    );
    expect(r.probleme.find((x) => x.cod === "pmax-fara-brand")!.ron).toBe(1500);
  });
});

describe("grupuri de anunturi", () => {
  it("un grup fara niciun material e alegere legitima, nu defect", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("C")], grupuri: [grup("NoAds / NoSg", "C", { total: 0, semnale: 6 })] },
      [camp("C")]
    );
    expect(r.probleme.some((x) => x.cod === "grup-schelet")).toBe(false);
  });

  it("un grup cu un singur titlu si nimic altceva e ramas la jumatate", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("C")], grupuri: [grup("Ap", "C", { titluri: 1, total: 1 })] },
      [camp("C")]
    );
    const p = r.probleme.find((x) => x.cod === "grup-schelet")!;
    expect(p.exemple).toEqual(["C › Ap — 1 material"]);
  });

  it("un grup complet nu e semnalat", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("C")], grupuri: [grup("Awr", "C", { titluri: 7, descrieri: 3, imagini: 6, video: 5, semnale: 6, total: 21 })] },
      [camp("C")]
    );
    expect(r.probleme).toEqual([]);
  });

  it("NU raporteaza ca franat un grup care sta sub o campanie oprita", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("C")], grupuri: [grup("G", "C", { motive: ["CAMPAIGN_PAUSED"] })] },
      [camp("C")]
    );
    expect(r.probleme.some((x) => x.cod === "grup-franat")).toBe(false);
  });

  it("raporteaza materialele respinse, cu motivul in limbaj de om", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("C")], grupuri: [grup("G", "C", { motive: ["ASSET_GROUP_LIMITED"], total: 12, titluri: 8 })] },
      [camp("C")]
    );
    expect(r.probleme.find((x) => x.cod === "grup-franat")!.exemple?.[0]).toMatch(/respinse de politicile/);
  });

  it("ignora grupurile din campanii care nu ruleaza", () => {
    const r = analizeazaPmax(
      { campanii: [pmax("C")], grupuri: [grup("G", "C", { titluri: 1, total: 1 })] },
      [camp("C", { status: "PAUSED" })]
    );
    expect(r.probleme).toEqual([]);
  });
});

describe("ordonare", () => {
  it("ce costa bani sta inaintea reglajelor", () => {
    const r = analizeazaPmax(
      {
        campanii: [pmax("C", { extindereUrl: true })],
        grupuri: [grup("G", "C", { motive: ["ASSET_GROUP_LIMITED"], total: 9, titluri: 6 })],
      },
      [camp("C", { cost: 800 })]
    );
    expect(r.probleme[0].cod).toBe("extindere-url");
  });
});

it("renders plural and zero-cost findings plus every group reason fallback", () => {
  const campaigns = [camp("A", { cost: 1 }), camp("B", { cost: 1 })];
  const result = analizeazaPmax({
    campanii: [
      pmax("A", { extindereUrl: true, areListaBrand: false }),
      pmax("B", { extindereUrl: true, areListaBrand: false }),
    ],
    grupuri: [
      grup("A1", "A", { total: 1, motive: ["CUSTOM_REASON"] }),
      grup("B1", "B", { total: 2, motive: ["CAMPAIGN_PAUSED", "ASSET_GROUP_DISAPPROVED"] }),
      grup("B2", "B", { total: 8, motive: ["", "CAMPAIGN_PAUSED", "ASSET_GROUP_LIMITED"] }),
    ],
  }, campaigns);
  expect(result.probleme.find((problem) => problem.cod === "extindere-url")?.exemple).toHaveLength(2);
  expect(result.probleme.find((problem) => problem.cod === "grup-schelet")?.exemple).toHaveLength(2);
  expect(result.probleme.find((problem) => problem.cod === "grup-franat")?.exemple?.join(" ")).toContain("custom reason");
  const zeroCost = analizeazaPmax({ campanii: [pmax("Zero", { extindereUrl: true })], grupuri: [] }, [camp("Zero", { cost: 0 })]);
  expect(zeroCost.probleme.find((problem) => problem.cod === "extindere-url")?.ron).toBe(0);
});
