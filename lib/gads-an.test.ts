import { describe, it, expect } from "vitest";
import { anQuery, agregaAn, bugetLunarDin } from "./gads-an";

describe("totalurile contului pe 12 luni", () => {
  it("intreaba pe fereastra de un an, nu pe 30 de zile", () => {
    // Nepotrivirea gasita pe MagazinFitness.ro (20.08.2026): pagina spunea "ultimele 12 luni"
    // dar cifrele veneau din LAST_30_DAYS.
    expect(anQuery()).toContain("LAST_365_DAYS");
    expect(anQuery()).not.toContain("LAST_30_DAYS");
  });

  it("aduna toate campaniile, indiferent de stare — ca 'Toate campaniile' din interfata", () => {
    const t = agregaAn([
      { metrics: { costMicros: "100000000", conversionsValue: "1000" } },
      { metrics: { costMicros: "48816910000", conversionsValue: "1565000" } },
    ]);
    expect(t.cost).toBeCloseTo(48916.91, 2);
    expect(t.valoare).toBeCloseTo(1566000, 2);
  });

  it("randurile fara metrici nu strica suma", () => {
    const t = agregaAn([{}, { metrics: {} }, { metrics: { costMicros: "12000000" } }]);
    expect(t.cost).toBe(12);
    expect(t.valoare).toBe(0);
  });

  it("ROAS-ul e valoarea impartita la cost, ca 'Valoare conv./Cost'", () => {
    const t = agregaAn([{ metrics: { costMicros: "148816910000", conversionsValue: "1566837" } }]);
    expect(t.roas).toBeCloseTo(10.53, 2);
  });

  it("fara cheltuiala nu inventam un ROAS", () => {
    expect(agregaAn([{ metrics: { costMicros: "0", conversionsValue: "500" } }]).roas).toBeNull();
  });

  it("bugetul lunar e anul impartit la 12", () => {
    expect(bugetLunarDin({ cost: 148816.91, valoare: 0, roas: null })).toBe(12401);
  });

  it("fara totaluri pe an, cade pe cheltuiala ultimelor 30 de zile — NU impartita la 12", () => {
    // Plasa de siguranta: o luna e o luna. Vechiul cod imparte a 30 de zile la 12.
    expect(bugetLunarDin(null, 11868)).toBe(11868);
  });
});
