// LANG: pending full translation to EN
import { describe, it, expect } from "vitest";
import { anQuery, agregaAn, bugetLunarDin, purchaseQuery, aggregatePurchaseBaseline } from "./gads-an";

describe("account totals over the latest 365 days", () => {
  it("intreaba pe fereastra de un an, nu pe 30 de zile", () => {
    // The report promised the latest 365 days but previously read LAST_30_DAYS.
    // dar cifrele veneau din LAST_30_DAYS.
    const q = anQuery("2025-08-20", "2026-08-20");
    expect(q).toContain("2025-08-20");
    expect(q).not.toContain("LAST_30_DAYS");
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

describe("forma interogarii", () => {
  it("reads only Purchase conversions for the financial baseline", () => {
    const query = purchaseQuery("2025-08-20", "2026-08-20");
    expect(query).toContain("segments.conversion_action_category = 'PURCHASE'");
    expect(query).toContain("metrics.conversions");
    expect(query).toContain("metrics.conversions_value");
    expect(query).not.toContain("metrics.cost_micros");
  });

  it("derives AOV, CPA, and ROAS from the same Purchase population", () => {
    expect(aggregatePurchaseBaseline(150, [
      { metrics: { conversions: "4", conversionsValue: "2000" } },
      { metrics: { conversions: "1", conversionsValue: "500" } },
    ])).toEqual({
      spend: 150,
      purchaseCount: 5,
      purchaseValue: 2500,
      averageOrderValue: 500,
      cpa: 30,
      roas: 2500 / 150,
    });
  });

  it("does not invent AOV or CPA without Purchase conversions", () => {
    expect(aggregatePurchaseBaseline(120, [
      { metrics: { conversions: "0", conversionsValue: "0" } },
    ])).toEqual({
      spend: 120,
      purchaseCount: 0,
      purchaseValue: 0,
      averageOrderValue: null,
      cpa: null,
      roas: 0,
    });
  });

  it("cere si un camp de resursa, nu doar metrici", () => {
    // Google Ads respinge un SELECT format numai din metrici. Interogarea asta a picat exact
    // asa, in tacere, si raportul a aratat cifra gresita pana cand a comparat-o cineva cu
    // interfata. Testul e aici ca sa nu se mai intample.
    const q = anQuery("2025-08-20", "2026-08-20");
    const campuri = q.slice(q.indexOf("SELECT") + 6, q.indexOf("FROM")).split(",").map((c) => c.trim());
    expect(campuri.some((c) => !c.startsWith("metrics."))).toBe(true);
  });

  it("intreaba tot contul pe un interval de date, fara filtru de status", () => {
    const q = anQuery("2025-08-20", "2026-08-20");
    expect(q).toContain("BETWEEN '2025-08-20' AND '2026-08-20'");
    expect(q).not.toContain("campaign.status");
  });

  it("NU foloseste DURING pentru ferestre mai lungi de 30 de zile", () => {
    // `DURING` accepta doar constante dintr-o lista inchisa; `LAST_365_DAYS` nu exista si
    // intoarce INVALID_VALUE_WITH_DURING_OPERATOR. Interogarea a picat asa luni intregi.
    expect(anQuery("2025-08-20", "2026-08-20")).not.toContain("DURING");
  });
});
