import { describe, it, expect } from "vitest";
import { demoOn, demoAccounts, demoData } from "./gads-demo";
import { audit, breakEvenRoas } from "./gads-audit";
import { analizeazaCuvinte } from "./gads-keywords";
import { analizeazaPmax } from "./gads-pmax";
import { analizeazaShopping } from "./gads-shopping";
import { analizeazaSearch } from "./gads-search";
import { buildReport } from "./gads-findings";

describe("comutatorul de demo", () => {
  it("e pornit doar de GADS_DEMO=1", () => {
    expect(demoOn({ GADS_DEMO: "1" })).toBe(true);
    expect(demoOn({ GADS_DEMO: "0" })).toBe(false);
    expect(demoOn({})).toBe(false);
  });

  it("da cel putin un cont care nu e manager, altfel demonstratia se blocheaza la pasul 1", () => {
    expect(demoAccounts().filter((a) => !a.manager).length).toBeGreaterThan(0);
  });

  it("labels the simulated account in English", () => {
    expect(demoAccounts()[0].name).toBe("Demo Store (simulated data)");
  });
});

describe("datele demo, trecute prin motorul real", () => {
  const marja = 25;
  const prag = breakEvenRoas(marja);
  const d = demoData();

  it("produc si produse care ard bani, si produse moarte", () => {
    const rez = audit(d.products, prag);
    expect(rez.villains.length).toBeGreaterThan(0);
    expect(rez.zombies.count).toBeGreaterThan(0);
    expect(rez.villainsTotalCost).toBeGreaterThan(0);
  });

  it("produc un raport cu cifra de impact si cu constatari, nu o pagina goala", () => {
    const rep = buildReport(
      audit(d.products, prag),
      d.tracking,
      marja,
      prag,
      d.catalogComplete,
      {
        structura: d.structura,
        cuvinte: analizeazaCuvinte(d.brutCuvinte.negative, d.products, d.brutCuvinte.termeni, "Magazin Demo"),
        pmax: analizeazaPmax(d.brutPmax, d.structura.campanii),
        shopping: analizeazaShopping(d.brutShop, d.tracking.ok),
        cautari: analizeazaSearch(d.brutCautari),
      }
    );
    expect(rep.headline.ron).toBeGreaterThan(0);
    expect(rep.findings.length).toBeGreaterThan(1);
    expect(rep.puncte.length).toBeGreaterThan(0);
  });

  it("are cheltuiala si ROAS de cont, ca sa poata alimenta simularea colaborarii", () => {
    expect(d.structura.cheltuialaTotala).toBeGreaterThan(0);
    expect(d.structura.roasCont).toBeGreaterThan(0);
  });

  it("keeps authored analytical explanations in English while preserving external names", () => {
    expect(d.structura.probleme.map((problem) => problem.titlu)).toEqual([
      "One campaign bids without a return target",
      "The brand campaign pays for clicks that may have arrived anyway",
    ]);
    expect(d.structura.probleme[0].exemple).toEqual(["PMax — Catalog complet"]);
  });
});
