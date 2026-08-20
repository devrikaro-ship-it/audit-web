import { describe, it, expect } from "vitest";
import { audit, breakEvenRoas, suggestMargin, type Product } from "./gads-audit";

// Cele 12 teste portate din test_engine.py (repo audit-google-ads-devrika) — valorile
// asteptate sunt calculate de mana, nu preluate din output. Plus testele pentru stratul
// nou: pragul derivat din marja + sugestia pe industrie.

const P = (
  productId: string,
  cost: number,
  conversionValue: number,
  impressions: number,
  category?: string
): Product => ({ productId, title: `Produs ${productId}`, cost, conversionValue, impressions, category });

describe("clasificare", () => {
  it("produs sub minRoas e villain", () => {
    const r = audit([P("A", 100, 200, 500)], 4);
    expect(r.villains.map((v) => v.productId)).toEqual(["A"]);
    expect(r.villainsTotalCost).toBe(100);
  });

  it("produs peste minRoas nu e villain", () => {
    const r = audit([P("A", 100, 800, 500)], 4);
    expect(r.villains).toEqual([]);
    expect(r.villainsTotalCost).toBe(0);
  });

  it("pragul e exclusiv: fix pe minRoas NU e villain", () => {
    const r = audit([P("A", 100, 400, 500)], 4); // roas fix 4.0
    expect(r.villains).toEqual([]);
  });

  it("produs cu cost 0 nu e niciodata villain (si nu imparte la zero)", () => {
    const r = audit([P("A", 0, 0, 500)], 4);
    expect(r.villains).toEqual([]);
  });

  it("produs cu 0 afisari e zombie, NU villain", () => {
    const r = audit([P("A", 0, 0, 0)], 4);
    expect(r.villains).toEqual([]);
    expect(r.zombies.count).toBe(1);
  });

  it("zombies raporteaza numar si procent din catalog", () => {
    const r = audit([P("A", 0, 0, 0), P("B", 0, 0, 0), P("C", 100, 800, 5), P("D", 100, 800, 5)], 4);
    expect(r.zombies.count).toBe(2);
    expect(r.zombies.pctOfCatalog).toBe(0.5); // 2 din 4
  });
});

describe("CSS (ESTIMARE)", () => {
  it("e 20% din cheltuiala totala cand ruleaza direct prin Google", () => {
    const r = audit([P("A", 200, 100, 5), P("B", 200, 2000, 5)], 4, true);
    expect(r.cssOverpaid).toBeCloseTo(80); // 0.20 * 400
  });

  it("lipseste cand magazinul are deja CSS", () => {
    const r = audit([P("A", 200, 100, 5)], 4, false);
    expect(r.cssOverpaid).toBeNull();
  });
});

describe("simulare post-curatare (SIMULARE, venit nu profit)", () => {
  it("porneste de la bugetul ramas dupa taierea villainilor", () => {
    const r = audit([P("A", 100, 100, 5), P("B", 200, 1200, 5)], 4);
    const sim = r.zone2Simulation!;
    expect(sim.current).toBe(1200); // venitul real al castigatorilor
    expect(sim.x2).toBe(2400); // 6.0 * 2 * 200
    expect(sim.x5).toBe(6000); // 6.0 * 5 * 200
  });

  it("e null cand nu ramane spend castigator", () => {
    const r = audit([P("A", 100, 100, 5)], 4);
    expect(r.zone2Simulation).toBeNull();
  });
});

describe("totaluri si cazuri limita", () => {
  it("expune cifrele contului si ale castigatorilor", () => {
    const r = audit([P("A", 100, 100, 5), P("B", 100, 800, 5)], 4);
    const t = r.totals;
    expect(t.totalCost).toBe(200);
    expect(t.totalConversionValue).toBe(900);
    expect(t.accountRoas).toBe(4.5); // 900 / 200
    expect(t.survivorsCost).toBe(100); // doar B
    expect(t.survivorsRoas).toBe(8); // 800 / 100
  });

  it("catalog gol nu arunca", () => {
    const r = audit([], 4);
    expect(r.villains).toEqual([]);
    expect(r.villainsTotalCost).toBe(0);
    expect(r.cssOverpaid).toBe(0);
    expect(r.zone2Simulation).toBeNull();
    expect(r.zombies.count).toBe(0);
    expect(r.zombies.pctOfCatalog).toBe(0);
  });
});

describe("pragul derivat din marja (nu-l mai intrebam pe om)", () => {
  it("break-even ROAS = 1 / marja", () => {
    expect(breakEvenRoas(50)).toBe(2); // marja 50% -> 2x
    expect(breakEvenRoas(25)).toBe(4); // marja 25% -> 4x
    expect(breakEvenRoas(30)).toBeCloseTo(3.333, 3);
  });

  it("refuza marje imposibile in loc sa scoata un prag absurd", () => {
    expect(() => breakEvenRoas(0)).toThrow(RangeError);
    expect(() => breakEvenRoas(-10)).toThrow(RangeError);
    expect(() => breakEvenRoas(100)).toThrow(RangeError);
  });

  it("marja mica cere ROAS mare — legatura care se explica in raport", () => {
    expect(breakEvenRoas(10)).toBeGreaterThan(breakEvenRoas(60));
  });
});

describe("marja sugerata din industria lui", () => {
  it("o deduce din categoriile produselor din contul lui", () => {
    const s = suggestMargin([P("A", 10, 10, 5, "productCategoryConstants/LEVEL1~1")]);
    expect(s.detected).toBe(true);
    expect(s.label).toBe("hrana si accesorii animale");
    expect(s.marginPct).toBe(28);
  });

  it("cade pe implicit cand categoriile lipsesc — si o spune", () => {
    const s = suggestMargin([P("A", 10, 10, 5)]);
    expect(s.detected).toBe(false);
    expect(s.marginPct).toBe(35);
  });

  it("alege industria dominanta cand catalogul e mixt", () => {
    const s = suggestMargin([
      P("A", 1, 1, 1, "productCategoryConstants/LEVEL1~166"),
      P("B", 1, 1, 1, "productCategoryConstants/LEVEL1~166"),
      P("C", 1, 1, 1, "productCategoryConstants/LEVEL1~222"),
    ]);
    expect(s.label).toBe("imbracaminte si accesorii");
  });
});

describe("segmentarea ProductHero: Heroes / Sidekicks / Villains / Zombies", () => {
  // Prag 4. Cheltuiesc ceva: 400 / 300 / 200 / 100 / 350 -> sortate 100,200,300,350,400,
  // deci mediana 300. Villainul intra si el in mediana: linia "cheltuie mult" se trage peste
  // tot ce consuma buget, nu doar peste castigatori.
  const catalog = [
    P("hero-mare", 400, 2400, 9000),   // roas 6,0 · peste mediana -> Hero
    P("hero-mic", 300, 1500, 7000),    // roas 5,0 · exact peste mediana -> Hero
    P("sidekick", 200, 1600, 4000),    // roas 8,0 · sub mediana -> Sidekick
    P("sidekick-2", 100, 500, 2000),   // roas 5,0 · sub mediana -> Sidekick
    P("villain", 350, 350, 8000),      // roas 1,0 -> Villain, indiferent cat cheltuie
    P("neclicat", 0, 0, 3000),         // afisat, zero clicuri
    P("zombie", 0, 0, 0),              // nevazut
  ];
  const r = audit(catalog, 4);

  it("mediana se ia doar pe produsele care au cheltuit ceva", () => {
    expect(r.medianaCost).toBe(300);
  });

  it("randament bun + cheltuiala peste mediana = Hero", () => {
    expect(r.heroes.map((h) => h.productId)).toEqual(["hero-mare", "hero-mic"]);
  });

  it("randament bun + cheltuiala mica = Sidekick, nu Hero", () => {
    expect(r.sidekicks.map((h) => h.productId)).toEqual(["sidekick", "sidekick-2"]);
  });

  it("Sidekicks vin sortate dupa randament — cine merita crescut primul", () => {
    expect(r.sidekicks[0].productId).toBe("sidekick");
    expect(r.sidekicks[0].productRoas).toBe(8);
  });

  it("sub prag ramane Villain oricat ar cheltui", () => {
    expect(r.villains.map((v) => v.productId)).toEqual(["villain"]);
  });

  it("produsul afisat pe care nu da nimeni clic nu mai dispare din raport", () => {
    expect(r.neClicate.count).toBe(1);
    expect(r.neClicate.list[0].productId).toBe("neclicat");
  });

  it("nevazutul ramane Zombie, separat de cel neclicat", () => {
    expect(r.zombies.count).toBe(1);
    expect(r.zombies.list[0].productId).toBe("zombie");
  });

  it("fiecare produs cade intr-o singura grupa, si toate sunt acoperite", () => {
    const total =
      r.heroes.length + r.sidekicks.length + r.villains.length +
      r.neClicate.count + r.zombies.count;
    expect(total).toBe(catalog.length);
  });

  it("fara niciun produs cu cheltuiala nu exista mediana de impartit", () => {
    const gol = audit([P("z", 0, 0, 0)], 4);
    expect(gol.medianaCost).toBe(0);
    expect(gol.heroes).toEqual([]);
    expect(gol.sidekicks).toEqual([]);
  });
});
