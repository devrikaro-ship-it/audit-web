import { describe, it, expect } from "vitest";
import { buildReport } from "./gads-findings";
import { assessTracking, type ConversionAction } from "./gads-tracking";
import { audit, breakEvenRoas, type Product } from "./gads-audit";

// Testele de aici apara promisiunea raportului: spune cati bani pierde omul ACUM, dar nu-l
// acuza de lucruri pe care datele lui nu le pot dovedi.

const P = (id: string, cost: number, value: number, impressions: number): Product =>
  ({ productId: id, title: `Produs ${id}`, cost, conversionValue: value, impressions });

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
