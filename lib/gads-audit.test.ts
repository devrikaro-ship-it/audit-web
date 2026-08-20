import { describe, it, expect } from "vitest";
import { audit, breakEvenRoas, suggestMargin, PRAG_CLICURI, type Product } from "./gads-audit";

// Cele 12 teste portate din test_engine.py (repo audit-google-ads-devrika) — valorile
// asteptate sunt calculate de mana, nu preluate din output. Plus testele pentru stratul
// nou: pragul derivat din marja + sugestia pe industrie.

// Implicit: trafic peste prag si o vanzare daca a adus valoare — asa testele scrise
// inainte de segmentarea pe trafic isi pastreaza intelesul (ele judecau randamentul).
const P = (
  productId: string,
  cost: number,
  conversionValue: number,
  impressions: number,
  category?: string,
  clicks = 100,
  conversions = conversionValue > 0 ? 1 : 0
): Product => ({
  productId, title: `Produs ${productId}`, cost, conversionValue, impressions, category,
  clicks, conversions,
});

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

  it("produs afisat dar fara clicuri nu e villain, e zombie (si nu imparte la zero)", () => {
    const r = audit([P("A", 0, 0, 500, undefined, 0, 0)], 4);
    expect(r.villains).toEqual([]);
    expect(r.zombies.count).toBe(1);
  });

  it("produs cu 0 afisari e 0 Zombie, NU villain", () => {
    const r = audit([P("A", 0, 0, 0, undefined, 0, 0)], 4);
    expect(r.villains).toEqual([]);
    expect(r.zeroZombies.count).toBe(1);
  });

  it("cele nevazute raporteaza numar si procent din catalog", () => {
    const r = audit([
      P("A", 0, 0, 0, undefined, 0, 0), P("B", 0, 0, 0, undefined, 0, 0),
      P("C", 100, 800, 5000), P("D", 100, 800, 5000),
    ], 4);
    expect(r.zeroZombies.count).toBe(2);
    expect(r.zeroZombies.pctOfCatalog).toBe(0.5); // 2 din 4
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

describe("segmentarea pe performanta: Heroes / Sidekicks / Villains / Zombies / 0 Zombies", () => {
  // Tinta 4,00. Pragul de trafic implicit: 40 de clicuri.
  // P(id, cost, valoare, afisari, categorie, clicuri, vanzari)
  const catalog = [
    P("hero", 400, 2400, 9000, undefined, 200, 6),      // trafic destul + peste tinta
    P("hero-2", 300, 1500, 7000, undefined, 55, 3),     // idem, exact peste prag
    P("villain", 350, 350, 8000, undefined, 180, 1),    // trafic destul, sub tinta
    P("villain-0", 120, 0, 5000, undefined, 90, 0),     // trafic destul, nicio vanzare
    P("sidekick", 40, 600, 900, undefined, 12, 1),      // trafic putin, DAR a vandut
    P("zombie", 30, 0, 600, undefined, 8, 0),           // trafic putin si nicio vanzare
    P("zero", 0, 0, 0, undefined, 0, 0),                // nicio afisare
  ];
  const r = audit(catalog, 4);

  it("trafic destul + randament peste tinta = Hero", () => {
    expect(r.heroes.map((h) => h.productId).sort()).toEqual(["hero", "hero-2"]);
  });

  it("trafic destul + sub tinta = Villain, si cel fara nicio vanzare intra tot aici", () => {
    expect(r.villains.map((v) => v.productId).sort()).toEqual(["villain", "villain-0"]);
  });

  it("trafic putin DAR cu vanzare = Sidekick, nu Villain", () => {
    // Miezul regulii: produsul asta are randament bun (15x), dar nu de aia e Sidekick, ci
    // pentru ca n-a fost lasat sa se arate. Confundat cu un Villain, l-ai opri exact invers.
    expect(r.sidekicks.map((s) => s.productId)).toEqual(["sidekick"]);
    expect(r.sidekicks[0].productRoas).toBe(15);
  });

  it("trafic putin si nicio vanzare = Zombie: netestat, nu condamnat", () => {
    expect(r.zombies.count).toBe(1);
    expect(r.zombies.list[0].productId).toBe("zombie");
  });

  it("fara nicio afisare = 0 Zombie, tinut separat de Zombies", () => {
    expect(r.zeroZombies.count).toBe(1);
    expect(r.zeroZombies.list[0].productId).toBe("zero");
  });

  it("fiecare produs cade intr-o singura grupa, si toate sunt acoperite", () => {
    const total =
      r.heroes.length + r.sidekicks.length + r.villains.length +
      r.zombies.count + r.zeroZombies.count;
    expect(total).toBe(catalog.length);
  });

  it("acelasi produs isi schimba grupa cand pragul de trafic se schimba", () => {
    // Cu prag 10, produsul cu 12 clicuri are brusc "destul trafic" si e judecat pe randament.
    const cuPragMic = audit(catalog, 4, true, 10);
    expect(cuPragMic.sidekicks).toEqual([]);
    expect(cuPragMic.heroes.map((h) => h.productId)).toContain("sidekick");
  });

  it("pragul e acelasi indiferent de fereastra analizata", () => {
    // Scalat cu fereastra, pe 12 luni nu mai trecea nimic de prag si Villains ajungea la zero
    // pe un cont real (MagazinFitness, 20.08.2026). Un produs cu 40 de clicuri si nicio vanzare
    // spune acelasi lucru si intr-o luna, si intr-un an.
    expect(PRAG_CLICURI).toBe(40);
    const peAn = audit([P("v", 400, 100, 20000, undefined, 45, 0)], 4);
    expect(peAn.villains.map((v) => v.productId)).toEqual(["v"]);
  });
});
