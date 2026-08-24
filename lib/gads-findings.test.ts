// LANG: pending full translation to EN
import { describe, it, expect } from "vitest";
import { buildReport, segmenteaza } from "./gads-findings";
import { assessTracking, type ConversionAction } from "./gads-tracking";
import { audit, breakEvenRoas, type Product } from "./gads-audit";

// Testele de aici apara promisiunea raportului: spune cati bani pierde omul ACUM, dar nu-l
// acuza de lucruri pe care datele lui nu le pot dovedi.

// Implicit: trafic peste prag si o vanzare daca a adus valoare — asa testele scrise
// inainte de segmentarea pe trafic isi pastreaza intelesul (ele judecau randamentul).
const P = (
  id: string, cost: number, value: number, impressions: number,
  clicks = 100, conversions = value > 0 ? 1 : 0
): Product =>
  ({ productId: id, title: `Produs ${id}`, cost, conversionValue: value, impressions, clicks, conversions });

const conv = (name: string, category: string, primary: boolean): ConversionAction =>
  ({ name, category, primary });

const OK_TRACKING = assessTracking([conv("Purchase", "PURCHASE", true)]);
const BROKEN_TRACKING = assessTracking([
  conv("Purchase", "PURCHASE", false),
  conv("YouTube views", "YOUTUBE_FOLLOW_ON_VIEWS", true),
  conv("Directions", "GET_DIRECTIONS", true),
]);

describe("starea masurarii", () => {
  it("cont sanatos: vanzare marcata principala", () => {
    expect(OK_TRACKING.ok).toBe(true);
  });

  it("actiuni care nu sunt vanzare, marcate principale = masurare stricata", () => {
    expect(BROKEN_TRACKING.ok).toBe(false);
    expect(BROKEN_TRACKING.junkPrimary).toHaveLength(2);
    expect(BROKEN_TRACKING.reasons[0]).toContain("YouTube views");
  });

  it("vanzare existenta dar NEmarcata principala e tot masurare stricata", () => {
    expect(BROKEN_TRACKING.hasSalePrimary).toBe(false);
  });

  it("cont fara nicio conversie configurata", () => {
    expect(assessTracking([]).ok).toBe(false);
  });
});

describe("cand masurarea e stricata", () => {
  const products = [P("A", 1000, 0, 5000), P("B", 236, 0, 2000), P("Z", 0, 0, 0)];
  const r = audit(products, breakEvenRoas(28));
  const rep = buildReport(r, BROKEN_TRACKING, 28, breakEvenRoas(28));

  it("o anunta, si o pune PRIMA — e cea mai scumpa greseala", () => {
    expect(rep.trackingBroken).toBe(true);
    expect(rep.findings[0].key).toBe("tracking");
  });

  it("cuantifica pierderea: TOT bugetul s-a cheltuit orb", () => {
    expect(rep.findings[0].ron).toBe(1236);
    expect(rep.findings[0].tier).toBe("MASURAT");
  });

  it("NU acuza produsele ca nu vand — le carantineaza explicit", () => {
    const v = rep.findings.find((f) => f.key.startsWith("villains"))!;
    expect(v.quarantined).toBe(true);
    expect(v.ron).toBe(0);
    expect(v.title).toContain("nu pot fi judecate");
  });

  it("produsele carantinate NU intra in cifra de pe prima pagina", () => {
    expect(rep.headline.ron).toBe(1236); // doar bugetul cheltuit orb, nu si villainii
  });

  it("spune in caveats ce ramane neverificabil", () => {
    expect(rep.caveats.some((c) => c.includes("imposibil de spus"))).toBe(true);
  });

  it("produsele moarte raman valide — nu depind de masurarea vanzarilor", () => {
    expect(rep.findings.some((f) => f.key === "zombies")).toBe(true);
  });
});

describe("cand masurarea e in regula", () => {
  const products = [P("A", 1000, 500, 5000), P("B", 200, 4000, 2000)];
  const minRoas = breakEvenRoas(28);
  const rep = buildReport(audit(products, minRoas), OK_TRACKING, 28, minRoas);

  it("acuza direct produsele care nu se acopera", () => {
    const v = rep.findings.find((f) => f.key === "villains")!;
    expect(v.quarantined).toBeUndefined();
    expect(v.ron).toBe(1000);
  });

  it("explica pragul in termeni de marja, nu de jargon", () => {
    const v = rep.findings.find((f) => f.key === "villains")!;
    expect(v.body).toContain("marja ta de 28%");
  });

  it("nu pomeneste deloc masurarea stricata", () => {
    expect(rep.trackingBroken).toBe(false);
    expect(rep.findings.some((f) => f.key === "tracking")).toBe(false);
  });
});

describe("niveluri de onestitate si ordonare", () => {
  const products = [P("A", 1000, 0, 5000)];
  const rep = buildReport(audit(products, 4), OK_TRACKING, 28, 4);

  it("CSS e ESTIMARE, niciodata MASURAT", () => {
    const css = rep.findings.find((f) => f.key === "css")!;
    expect(css.tier).toBe("ESTIMARE");
    expect(css.body).toContain("reper de piata");
  });

  it("ordoneaza pe bani, cel mai mare primul", () => {
    const sums = rep.findings.filter((f) => !f.quarantined).map((f) => f.ron);
    expect(sums).toEqual([...sums].sort((a, b) => b - a));
  });

  it("catalog necitit: tace despre produse moarte in loc sa raporteze zero", () => {
    const r2 = buildReport(audit(products, 4), OK_TRACKING, 28, 4, false);
    expect(r2.findings.some((f) => f.key === "zombies")).toBe(false);
    expect(r2.caveats.some((c) => c.includes("catalogul complet"))).toBe(true);
  });
});

describe("simularea (ce castigi daca repari)", () => {
  // A arde bani, B vinde de 6x -> raman 200 lei buget castigator la roas 6
  const products = [P("A", 100, 100, 5000), P("B", 200, 1200, 4000)];
  const rep = buildReport(audit(products, 4), OK_TRACKING, 25, 4);
  const sim = rep.findings.find((f) => f.key === "simulare");

  it("apare, si e etichetata SIMULARE", () => {
    expect(sim).toBeDefined();
    expect(sim!.tier).toBe("SIMULARE");
  });

  it("arata castigul din MUTAREA banilor, nu din marirea bugetului", () => {
    // castigatori: cost 200, roas 6 -> aduc 1200. Villains: 100 lei.
    // buget mutat = 300 -> 300*6 = 1800. Castig fata de 1200 = 600.
    // NU 1200 (care ar fi din dublarea bugetului, alt scenariu).
    expect(sim!.ron).toBe(600);
  });

  it("spune clar ca e mutare de buget, nu bani in plus", () => {
    expect(sim!.body).toMatch(/fara sa adaugi niciun leu in plus/i);
    // scenariul "mareste bugetul de 2x/5x" a fost scos: cu plafonul de mai jos devenea
    // redundant si amesteca doua discutii diferite in acelasi paragraf.
    expect(sim!.body).not.toMatch(/de cinci ori/i);
  });

  it("spune ca e plafon optimist si ca sunt incasari, nu profit", () => {
    expect(sim!.body).toMatch(/plafon optimist/i);
    expect(sim!.body).toMatch(/incasari, nu profit/i);
  });

  it("NU sta prima — o proiectie nu conduce raportul", () => {
    expect(rep.findings[0].key).not.toBe("simulare");
    const idx = rep.findings.findIndex((f) => f.key === "simulare");
    const masurate = rep.findings.filter((f) => f.tier !== "SIMULARE" && !f.quarantined).length;
    expect(idx).toBeGreaterThanOrEqual(masurate);
  });

  it("NU intra in cifra de pe prima pagina", () => {
    const masurat = rep.findings.filter((f) => f.tier === "MASURAT" && !f.quarantined)
      .reduce((s, f) => s + f.ron, 0);
    expect(rep.headline.ron).toBe(masurat);
  });

  it("lipseste cand masurarea e stricta — nu are pe ce se sprijini", () => {
    const r2 = buildReport(audit(products, 4), BROKEN_TRACKING, 25, 4);
    expect(r2.findings.some((f) => f.key === "simulare")).toBe(false);
  });
});

describe("plafonul simularii", () => {
  // castigatori foarte eficienti: cost 10, roas 100 -> aduc 1000. Villains 500.
  // inmultirea seaca: (10+500)*100 = 51.000 -> absurd fata de 1000 actual.
  const products = [P("A", 500, 100, 5000), P("B", 10, 1000, 4000)];
  const rep = buildReport(audit(products, 4), OK_TRACKING, 25, 4);
  const sim = rep.findings.find((f) => f.key === "simulare")!;

  it("nu scoate cifre absurde — plafoneaza la dublarea incasarilor", () => {
    expect(sim.ron).toBe(1000); // 2x current (1000) minus current = 1000
  });

  it("spune pe fata ca a plafonat, si de ce", () => {
    expect(sim.body).toMatch(/volum limitat de cautari/i);
  });
});

// ─── Ce a fost adaugat dupa ce raportul a devenit prea sarac: produsele concrete,
//     risipa pe termeni si punctele de atac din structura contului.

describe("produsele din spatele cifrei", () => {
  const products: Product[] = [
    { productId: "a", title: "Canapea Luna gri", cost: 900, conversionValue: 100, impressions: 500, clicks: 180, conversions: 1 },
    { productId: "b", title: "Masa cafea sticla", cost: 300, conversionValue: 0, impressions: 200, clicks: 60, conversions: 0 },
    { productId: "c", title: "Leagan Joy 500", cost: 0, conversionValue: 0, impressions: 0, clicks: 0, conversions: 0 },
    { productId: "d", title: "Fotoliu Nord", cost: 50, conversionValue: 900, impressions: 300, clicks: 90, conversions: 2 },
  ];

  it("numeste produsele care ard bani, cele mai scumpe primele", () => {
    const rep = buildReport(audit(products, 4), OK_TRACKING, 25, 4);
    const f = rep.findings.find((x) => x.key === "villains")!;
    expect(f.produse?.[0].titlu).toBe("Canapea Luna gri");
    expect(f.produse?.[0].cost).toBe(900);
    expect(f.produse?.[0].roas).toBeCloseTo(0.11, 2);
  });

  it("NU pune ROAS pe produse cand masurarea e stricata — ar fi o acuzatie fara acoperire", () => {
    const rep = buildReport(audit(products, 4), BROKEN_TRACKING, 25, 4);
    const f = rep.findings.find((x) => x.key === "villains-quarantined")!;
    expect(f.produse?.length).toBeGreaterThan(0);
    expect(f.produse?.every((p) => p.roas === undefined)).toBe(true);
  });

  it("numeste si produsele care n-au fost vazute niciodata", () => {
    const rep = buildReport(audit(products, 4), OK_TRACKING, 25, 4);
    const f = rep.findings.find((x) => x.key === "zombies")!;
    expect(f.produse?.map((p) => p.titlu)).toContain("Leagan Joy 500");
  });
});

describe("risipa pe cautari", () => {
  const cuvinte = {
    negativeTotal: 0,
    toxice: [],
    risipa: [{ termen: "canapea ieftina", cost: 120, clicuri: 40 }],
    risipaTotal: 120,
    areVizibilitateTermeni: true,
  };

  it("apare ca finding cu banii ei", () => {
    const rep = buildReport(audit([], 4), OK_TRACKING, 25, 4, true, { cuvinte });
    const f = rep.findings.find((x) => x.key === "termeni-risipa")!;
    expect(f.ron).toBe(120);
    expect(f.termeni?.[0].termen).toBe("canapea ieftina");
  });

  it("excludes 30-day findings from the latest-365-day headline", () => {
    const rep = buildReport(audit([], 4), OK_TRACKING, 25, 4, true, { cuvinte });
    expect(rep.headline.ron).toBe(0);
    expect(rep.findings.find((x) => x.key === "termeni-risipa")!.body).toMatch(/30 de zile/);
  });

  it("spune pe fata cand nu are vizibilitate pe termeni", () => {
    const orb = { ...cuvinte, areVizibilitateTermeni: false };
    const rep = buildReport(audit([], 4), OK_TRACKING, 25, 4, true, { cuvinte: orb });
    expect(rep.caveats.some((c) => /Performance Max/.test(c))).toBe(true);
  });
});

describe("puncte de atac", () => {
  it("auto-blocarea brandului sta prima si e critica", () => {
    const cuvinte = {
      negativeTotal: 2,
      toxice: [
        { cuvant: "masa", produseBlocate: 1, exemple: ["Masa cafea"], eBrand: false },
        { cuvant: "dehome", produseBlocate: 30, exemple: ["Canapea DeHome"], eBrand: true },
      ],
      risipa: [],
      risipaTotal: 0,
      areVizibilitateTermeni: true,
    };
    const rep = buildReport(audit([], 4), OK_TRACKING, 25, 4, true, { cuvinte });
    expect(rep.puncte[0].cod).toBe("negativ-brand");
    expect(rep.puncte[0].grad).toBe("critic");
    expect(rep.puncte[0].exemple).toContain("Canapea DeHome");
  });

  it("renders singular brand impact and plural non-brand toxic impact", () => {
    const cuvinte = {
      negativeTotal: 3,
      toxice: [
        { cuvant: "brand", produseBlocate: 1, exemple: ["Brand product"], eBrand: true },
        { cuvant: "chair", produseBlocate: 1, exemple: ["Chair"], eBrand: false },
        { cuvant: "table", produseBlocate: 2, exemple: ["Table"], eBrand: false },
      ],
      risipa: [],
      risipaTotal: 0,
      areVizibilitateTermeni: true,
    };
    const report = buildReport(audit([], 4), OK_TRACKING, 25, 4, true, { cuvinte });
    expect(report.puncte.find((point) => point.cod === "negativ-brand")?.exemple).toHaveLength(1);
    expect(report.puncte.find((point) => point.cod === "negative-toxice")?.exemple).toHaveLength(2);
  });

  it("banii din structura NU se aduna in cifra mare a raportului", () => {
    const structura = {
      campanii: [],
      cheltuialaTotala: 3000,
      roasCont: 4,
      probleme: [
        { cod: "bidding-fara-tinta", titlu: "Fara tinta", ron: 2977, detaliu: "…", grad: "costa" as const },
      ],
    };
    const rep = buildReport(audit([], 4), OK_TRACKING, 25, 4, true, { structura });
    expect(rep.puncte[0].ron).toBe(2977);
    expect(rep.headline.ron).toBe(0);
  });
});

describe("cifra mare se potriveste cu interfata Google Ads", () => {
  // MagazinFitness.ro, 20.08.2026: raportul pe produse dadea 129.155 RON, interfata 148.817.
  // Diferenta = campanii Search fara produs in spate. Prospectul deschide interfata si compara.
  const products = [P("A", 100000, 0, 5000), P("B", 29155, 0, 2000)];
  const r = audit(products, breakEvenRoas(30));
  const an = { cost: 148817, valoare: 1567000, roas: 10.53 };

  it("cu totalurile contului, cifra e a CONTULUI, nu doar a produselor", () => {
    const rep = buildReport(r, BROKEN_TRACKING, 30, breakEvenRoas(30), true, { an });
    expect(rep.findings[0].ron).toBe(148817);
    expect(rep.headline.ron).toBe(148817);
  });

  it("spune si cat s-a dus pe Shopping, ca sa nu para ca am ascuns diferenta", () => {
    const rep = buildReport(r, BROKEN_TRACKING, 30, breakEvenRoas(30), true, { an });
    expect(rep.findings[0].body).toContain("148.817 RON");
    expect(rep.findings[0].body).toContain("129.155 RON");
    expect(rep.findings[0].body).toContain("Shopping");
  });

  it("fara campanii Search nu desface cifra in doua degeaba", () => {
    const egal = { cost: 129155, valoare: 0, roas: null };
    const rep = buildReport(r, BROKEN_TRACKING, 30, breakEvenRoas(30), true, { an: egal });
    expect(rep.findings[0].ron).toBe(129155);
    expect(rep.findings[0].body).not.toContain("Shopping —");
  });

  it("fara totalurile contului ramane pe cifra pe produse, ca pana acum", () => {
    const rep = buildReport(r, BROKEN_TRACKING, 30, breakEvenRoas(30));
    expect(rep.findings[0].ron).toBe(129155);
  });

  it("un total al contului mai MIC decat cel pe produse nu e crezut", () => {
    // Nu se poate cheltui pe produse mai mult decat pe tot contul: daca iese asa, interogarea
    // anuala e trunchiata, si atunci cifra sigura e cea pe produse.
    const rupt = { cost: 90000, valoare: 0, roas: null };
    const rep = buildReport(r, BROKEN_TRACKING, 30, breakEvenRoas(30), true, { an: rupt });
    expect(rep.findings[0].ron).toBe(129155);
  });
});

describe("catalogul impartit pe performanta ajunge in raport", () => {
  const prag = breakEvenRoas(25); // tinta 4,00
  // P(id, cost, valoare, afisari, clicuri, vanzari) — pragul de trafic implicit e 40.
  const catalog = [
    P("H", 400, 2400, 9000, 200, 6),  // trafic destul, peste tinta -> Hero
    P("V", 350, 350, 8000, 180, 1),   // trafic destul, sub tinta   -> Villain
    P("S", 40, 600, 900, 12, 1),      // trafic putin, dar a vandut -> Sidekick
    P("S2", 25, 300, 700, 9, 1),      // idem
    P("Zz", 30, 0, 600, 8, 0),        // trafic putin, nicio vanzare -> Zombie
    P("O", 0, 0, 0, 0, 0),            // nicio afisare -> 0 Zombie
  ];

  it("fiecare grupa ajunge in raport cu numarul, banii si valoarea ei", () => {
    const rep = { segmentare: segmenteaza(audit(catalog, prag), OK_TRACKING.ok) };
    expect(rep.segmentare.heroes.count).toBe(1);
    expect(rep.segmentare.heroes.cost).toBe(400);
    expect(rep.segmentare.heroes.valoare).toBe(2400);
    expect(rep.segmentare.villains.count).toBe(1);
    expect(rep.segmentare.sidekicks.count).toBe(2);
    expect(rep.segmentare.zombies.count).toBe(1);
    expect(rep.segmentare.zeroZombies.count).toBe(1);
    expect(rep.segmentare.judecabila).toBe(true);
  });

  it("randamentul pe produs se afiseaza doar cand masurarea e de incredere", () => {
    const bun = segmenteaza(audit(catalog, prag), OK_TRACKING.ok);
    expect(bun.heroes.produse[0].roas).toBeCloseTo(6, 5);

    const rupt = segmenteaza(audit(catalog, prag), BROKEN_TRACKING.ok);
    expect(rupt.judecabila).toBe(false);
    expect(rupt.heroes.produse[0].roas).toBeUndefined();
  });

  it("grupele care nu depind de vanzari se numara corect si cu masurarea stricata", () => {
    const rupt = segmenteaza(audit(catalog, prag), BROKEN_TRACKING.ok);
    expect(rupt.zeroZombies.count).toBe(1);
    expect(rupt.zombies.count).toBe(1);
  });
});

// Acordul in limba romana, la UN singur element. Un raport care ii spune clientului "1 produse"
// arata a iesire de masina, si defectul e invizibil in orice cont cu doua sau mai multe — adica
// in aproape toate datele pe care s-a testat pana acum. Gasit plimband fluxul in modul demo,
// unde un singur cuvant blocat oprea un singur produs.
describe("acordul la un singur produs", () => {
  const unSingurVillain = [P("A", 1000, 500, 5000), P("B", 200, 4000, 2000)];
  const minRoas = breakEvenRoas(28);
  const rep = buildReport(audit(unSingurVillain, minRoas), OK_TRACKING, 28, minRoas);

  it("titlul spune 'Un produs', nu '1 produse'", () => {
    const v = rep.findings.find((f) => f.key === "villains")!;
    expect(v.title).toContain("Un produs consuma");
    expect(v.title).not.toMatch(/\b1 produse\b/);
  });

  it("corpul acorda verbul si scoate 'impreuna', care nu are sens la unul singur", () => {
    const v = rep.findings.find((f) => f.key === "villains")!;
    expect(v.body).toContain("Un produs sta sub pragul asta si a consumat");
    expect(v.body).not.toContain("impreuna");
  });

  it("catalogul mort, la un singur produs, acorda participiul", () => {
    const unuNevazut = [P("A", 500, 2000, 3000), P("Z", 0, 0, 0)];
    const r = buildReport(audit(unuNevazut, 4), OK_TRACKING, 28, 4);
    const z = r.findings.find((f) => f.key === "zombies");
    if (z) {
      expect(z.title).toContain("Un produs nu a fost vazut");
      expect(z.title).not.toMatch(/\b1 produse\b/);
    }
  });
});

// Nivelul SIMULARE era folosit ca eticheta pe o constatare, dar lipsea din legenda de la finalul
// raportului, unde erau explicate doar MASURAT si ESTIMARE. SPEC-ul cere trei niveluri, fiecare
// etichetat oriunde apare — un client vedea un cuvant pe care raportul nu i-l explica nicaieri.
describe("cele trei niveluri sunt toate folosite", () => {
  it("simularea exista ca nivel in raport", () => {
    const products = [P("A", 1000, 500, 5000), P("B", 200, 4000, 2000)];
    const minRoas = breakEvenRoas(28);
    const rep = buildReport(audit(products, minRoas), OK_TRACKING, 28, minRoas);
    expect(rep.findings.some((f) => f.tier === "SIMULARE")).toBe(true);
  });
});
