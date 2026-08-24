import { describe, it, expect } from "vitest";
import { buildProducts, dateRange, perfQuery, catalogQuery, type PerfRow, type CatalogRow } from "./gads-intake";
import { audit, suggestMargin } from "./gads-audit";

// Join-ul catalog<->performanta e locul unde Zombies traiesc sau mor. Testele de aici apara
// exact invariantul care se pierde cel mai usor: un produs nevandut TREBUIE sa ajunga in
// motor ca rand 0/0/0, nu sa lipseasca.

const PET = "productCategoryConstants/LEVEL1~1"; // Animals & Pet Supplies

const perf = (
  itemId: string, costMicros: number, conversionsValue: number, impressions: number,
  clicks = 100, conversions = conversionsValue > 0 ? 1 : 0
): PerfRow =>
  ({ itemId, title: `Produs ${itemId}`, costMicros, conversionsValue, impressions, clicks, conversions });

const cat = (itemId: string, category?: string): CatalogRow =>
  ({ itemId, title: `Produs ${itemId}`, category });

describe("join catalog <-> performanta", () => {
  it("converteste micros in unitati monetare", () => {
    const { products } = buildProducts([perf("A", 1_500_000, 300, 20)], []);
    expect(products[0].cost).toBe(1.5);
  });

  it("produsul din catalog fara activitate devine rand 0/0/0 (Zombie)", () => {
    const { products } = buildProducts([perf("A", 1_000_000, 400, 10)], [cat("A"), cat("B")]);
    const b = products.find((p) => p.productId === "B")!;
    expect(b).toBeDefined();
    expect([b.cost, b.conversionValue, b.impressions]).toEqual([0, 0, 0]);
  });

  it("nu dubleaza produsul prezent in ambele interogari", () => {
    const { products } = buildProducts([perf("A", 1_000_000, 400, 10)], [cat("A")]);
    expect(products).toHaveLength(1);
  });

  it("fara catalog semnaleaza incompletitudine in loc sa raporteze zero Zombies", () => {
    const { products, catalogComplete } = buildProducts([perf("A", 1_000_000, 400, 10)], null);
    expect(catalogComplete).toBe(false);
    expect(products).toHaveLength(1);
  });

  it("imprumuta categoria din catalog pe randurile de performanta", () => {
    const { products } = buildProducts([perf("A", 1_000_000, 400, 10)], [cat("A", "productCategoryConstants/LEVEL1~1")]);
    expect(products[0].category).toBe("productCategoryConstants/LEVEL1~1");
  });

  it("ignora randurile fara item id in loc sa creeze produse fantoma", () => {
    const { products } = buildProducts([perf("A", 1_000_000, 400, 10)], [cat("A"), cat("B")]);
    expect(products.every((p) => p.productId)).toBe(true);
  });
});

describe("interogari", () => {
  it("uses exactly 365 inclusive calendar dates for the 12-month window", () => {
    const { from, to } = dateRange(new Date("2026-08-06T12:00:00Z"));
    expect(to).toBe("2026-08-06");
    expect(from).toBe("2025-08-07");

    const inclusiveDates =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
    expect(inclusiveDates).toBe(365);
  });

  it("keeps every configured window exact under inclusive GAQL boundaries", () => {
    expect(dateRange(new Date("2026-08-06T23:59:59Z"), 30)).toEqual({
      from: "2026-07-08",
      to: "2026-08-06",
    });
  });

  it("catalogul NU e filtrat pe data — altfel produsele moarte dispar", () => {
    expect(catalogQuery()).not.toMatch(/segments\.date/);
    expect(catalogQuery()).not.toMatch(/metrics\./);
  });

  it("performanta cere metricile pe care le foloseste motorul", () => {
    const q = perfQuery("2025-08-06", "2026-08-06");
    expect(q).toMatch(/metrics\.impressions/);
    expect(q).toMatch(/metrics\.cost_micros/);
    expect(q).toMatch(/metrics\.conversions_value/);
  });
});

describe("intake -> motor, cap la cap", () => {
  it("un catalog realist produce Villains si Zombies corect separati", () => {
    // A arde bani (roas 1x), B vinde bine (roas 8x), C si D n-au rulat niciodata.
    const { products } = buildProducts(
      [perf("A", 100_000_000, 100, 5000), perf("B", 100_000_000, 800, 4000)],
      [cat("A", PET), cat("B", PET), cat("C", PET), cat("D", PET)]
    );
    const r = audit(products, 4);

    expect(r.villains.map((v) => v.productId)).toEqual(["A"]);
    expect(r.villainsTotalCost).toBe(100);
    expect(r.zeroZombies.count).toBe(2); // C si D, fara nicio afisare
    expect(r.zeroZombies.pctOfCatalog).toBe(0.5); // 2 din 4

    // industria se deduce din categoria standard venita prin join
    expect(suggestMargin(products).detected).toBe(true);
  });
});
