// LANG: pending full translation to EN
import { beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

const search = vi.hoisted(() => vi.fn());

vi.mock("./net", () => ({ googleAdsSearch: search }));

import {
  AUDIT_WINDOW_LABEL,
  FERESTRE,
  buildProducts,
  dateRange,
  formatAuditWindowLabel,
  perfQuery,
  catalogQuery,
  fetchShoppingProductsForRange,
  type PerfRow,
  type CatalogRow,
} from "./gads-intake";
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

  it("uses a catalog identifier when the catalog title is absent", () => {
    expect(buildProducts([], [{ itemId: "catalog-only", title: "" }]).products[0].title).toBe("catalog-only");
  });
});

describe("interogari", () => {
  beforeEach(() => search.mockReset());

  it("formats the 365-day label independently of neighboring window order and copy", () => {
    const adversarialNeighbors = [...FERESTRE]
      .reverse()
      .map((window, index) => ({ ...window, eticheta: `neighbor-${index}` }));
    expect(adversarialNeighbors[0].eticheta).not.toBe(FERESTRE[0].eticheta);
    expect(formatAuditWindowLabel(365)).toBe(AUDIT_WINDOW_LABEL);
    expect(formatAuditWindowLabel.toString()).not.toContain("FERESTRE");
    const moduleSource = readFileSync("lib/gads-intake.ts", "utf8");
    expect(moduleSource).toMatch(
      /export const AUDIT_WINDOW_LABEL = formatAuditWindowLabel\(WINDOW_DAYS\)/
    );
  });

  it("rejects standalone legacy period promises on every client-facing surface", () => {
    const surfaces = [
      "app/confidentialitate/page.tsx",
      "app/google-ads/connect/page.tsx",
      "app/google-ads/impreuna/page.tsx",
      "app/google-ads/page.tsx",
      "app/google-ads/raport/page.tsx",
      "app/hub/page.tsx",
      "lib/gads-findings.ts",
    ];
    for (const path of surfaces) {
      const source = readFileSync(path, "utf8");
      const executableSource = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/className="[^"]*"/g, "");
      expect(executableSource).not.toMatch(/\b(?:latest )?365 days\b/i);
      expect(executableSource).not.toMatch(/\b12\s+\p{L}+/u);
    }
  });

  it("uses exactly 365 inclusive account-calendar dates", () => {
    const { from, to } = dateRange(new Date("2026-08-06T12:00:00Z"), 365, "Europe/Bucharest");
    expect(to).toBe("2026-08-06");
    expect(from).toBe("2025-08-07");

    const inclusiveDates =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
    expect(inclusiveDates).toBe(365);
  });

  it("keeps every configured window exact under inclusive GAQL boundaries", () => {
    expect(dateRange(new Date("2026-08-06T23:59:59Z"), 30, "Europe/Bucharest")).toEqual({
      from: "2026-07-09",
      to: "2026-08-07",
    });
  });

  it("uses the account calendar date on opposite sides of UTC midnight", () => {
    const now = new Date("2026-08-06T23:30:00Z");
    expect(dateRange(now, 365, "America/Los_Angeles").to).toBe("2026-08-06");
    expect(dateRange(now, 365, "Pacific/Kiritimati").to).toBe("2026-08-07");
  });

  it("counts exact account-calendar dates across a leap day and DST boundary", () => {
    expect(dateRange(new Date("2024-03-10T09:30:00Z"), 30, "America/Los_Angeles")).toEqual({
      from: "2024-02-10",
      to: "2024-03-10",
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

  it("reads Shopping performance with the supplied exact inclusive boundaries", async () => {
    search
      .mockResolvedValueOnce([{
        shoppingProduct: { itemId: "A", title: "Alpha" },
        metrics: { costMicros: "1000000", conversionsValue: "5", impressions: "10", clicks: "2", conversions: "1" },
      }])
      .mockResolvedValueOnce([{ shoppingProduct: { itemId: "A", categoryLevel1: "category" } }]);

    await expect(fetchShoppingProductsForRange(
      "123",
      { accessToken: "access", developerToken: "developer" },
      "Europe/Bucharest",
      { from: "2026-07-01", to: "2026-07-31" },
    )).resolves.toMatchObject({
      catalogComplete: true,
      products: [expect.objectContaining({ productId: "A", category: "category" })],
    });

    expect(search.mock.calls[0][1]).toContain(
      "segments.date BETWEEN '2026-07-01' AND '2026-07-31'",
    );
    expect(search.mock.calls[1][1]).not.toContain("segments.date");
  });

  it.each([
    { from: "2026-07-01' OR segments.date > '1900-01-01", to: "2026-07-31" },
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-08-31", to: "2026-08-01" },
  ])("refuses an unsafe exact range before constructing GAQL", async (range) => {
    search.mockResolvedValue([]);
    await expect(fetchShoppingProductsForRange(
      "123",
      { accessToken: "access", developerToken: "developer" },
      "Europe/Bucharest",
      range,
    )).rejects.toThrow(/date range/i);
    expect(search).not.toHaveBeenCalled();
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
