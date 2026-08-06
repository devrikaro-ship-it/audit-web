import { describe, it, expect } from "vitest";
import { analizeazaSearch, type SearchData } from "./gads-search";

// Cazul negativ e luat din conturi reale (DeHome / Granox, 06-08-2026): ambele au RSA in grupul
// activ, reclama veche EDSA sta intr-o campanie OPRITA, AI Max e nepornit. Testele apara tocmai
// tacerea pe conturile curate — un audit care raporteaza ceva pe un cont in regula e mai rau
// decat unul care nu raporteaza nimic.

const rec = (p: Partial<SearchData["reclame"][0]> = {}) => ({
  campanie: "Search - [BP]", campanieActiva: true, canal: "SEARCH",
  grup: "BP", grupActiv: true, tip: "RESPONSIVE_SEARCH_AD", activa: true, ...p,
});

const camp = (p: Partial<SearchData["campanii"][0]> = {}) => ({
  nume: "Search - [BP]", activa: true, subtip: null as string | null, aiMax: false, potrivireLarga: false, ...p,
});

describe("contul curat", () => {
  it("nu raporteaza nimic cand fiecare grup activ are RSA", () => {
    const r = analizeazaSearch({ campanii: [camp()], reclame: [rec()] });
    expect(r.probleme).toEqual([]);
  });
});

describe("grupuri fara reclama moderna", () => {
  it("prinde grupul care are doar o reclama de tip vechi", () => {
    const r = analizeazaSearch({
      campanii: [camp({ nume: "Search - vechi" })],
      reclame: [rec({ campanie: "Search - vechi", grup: "Generic", tip: "EXPANDED_TEXT_AD" })],
    });
    expect(r.probleme.find((p) => p.cod === "grup-fara-rsa")!.exemple).toEqual(["Search - vechi › Generic"]);
  });

  it("nu socoteste un RSA OPRIT drept reclama moderna", () => {
    const r = analizeazaSearch({
      campanii: [camp()], reclame: [rec({ activa: false })],
    });
    expect(r.probleme.some((p) => p.cod === "grup-fara-rsa")).toBe(true);
  });

  it("ignora grupurile din campanii oprite — nu costa nimic pe nimeni", () => {
    const r = analizeazaSearch({
      campanii: [camp({ activa: false })],
      reclame: [rec({ campanieActiva: false, tip: "EXPANDED_DYNAMIC_SEARCH_AD" })],
    });
    expect(r.probleme).toEqual([]);
  });

  it("nu se uita la grupuri de Shopping — acolo nu exista RSA", () => {
    const r = analizeazaSearch({
      campanii: [], reclame: [rec({ canal: "SHOPPING", tip: "SHOPPING_PRODUCT_AD" })],
    });
    expect(r.probleme).toEqual([]);
  });
});

describe("reclame scoase din uz", () => {
  it("le semnaleaza cand chiar sunt pornite intr-o campanie activa", () => {
    const r = analizeazaSearch({
      campanii: [camp()],
      reclame: [rec(), rec({ tip: "EXPANDED_TEXT_AD" })],
    });
    const p = r.probleme.find((x) => x.cod === "reclame-vechi")!;
    expect(p.detaliu).toMatch(/dau\s+impresia ca grupul are reclame/);
  });
});

describe("migrarea automata catre AI Max", () => {
  it("semnaleaza campaniile dinamice nepregatite", () => {
    const r = analizeazaSearch({
      campanii: [camp({ nume: "Search - [DSA]", subtip: "SEARCH_DYNAMIC" })], reclame: [],
    });
    expect(r.probleme.find((p) => p.cod === "ai-max-expunere")!.exemple).toEqual(["Search - [DSA]"]);
  });

  it("semnaleaza si potrivirea larga", () => {
    const r = analizeazaSearch({ campanii: [camp({ potrivireLarga: true })], reclame: [] });
    expect(r.probleme.some((p) => p.cod === "ai-max-expunere")).toBe(true);
  });

  it("tace cand AI Max e deja pornit deliberat", () => {
    const r = analizeazaSearch({
      campanii: [camp({ subtip: "SEARCH_DYNAMIC", aiMax: true })], reclame: [],
    });
    expect(r.probleme).toEqual([]);
  });

  it("NU raporteaza potrivirea exacta sau de fraza — doctrina exclude asta explicit", () => {
    const r = analizeazaSearch({ campanii: [camp({ potrivireLarga: false })], reclame: [] });
    expect(r.probleme.some((p) => p.cod === "ai-max-expunere")).toBe(false);
  });
});
