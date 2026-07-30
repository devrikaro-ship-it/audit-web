import { describe, it, expect } from "vitest";
import { buildShopifyCase, buildLevers, combineUplift, type CaseInput, type Lever } from "./shopify-case";
import type { PlatformEvidence } from "./platform-audit";
import type { AuditData } from "./types";

const audit = (o: Partial<AuditData> = {}): AuditData => ({
  url: "https://x.ro", domain: "x.ro", pagesAnalyzed: 50, scor: 60,
  checksRezultate: {}, seoChecks: [], continutChecks: [], keywordsChecks: [], structuraChecks: [],
  ...o,
});

const ev = (o: Partial<PlatformEvidence> = {}): PlatformEvidence => ({
  url: "https://x.ro",
  stack: { platform: "WooCommerce", cms: { name: "WordPress", version: "7.0" }, ecomEngine: null, plugins: [], pluginCount: 8, scriptCount: 55, stylesheetCount: 2, generators: [] },
  checkout: { walletsSeen: [], paymentsSeen: [], expressCheckout: false, installments: false },
  field: { lcpMs: 2682, ttfbMs: 1503, fcpMs: 2214, inpMs: 105, cls: 0.02, overall: "AVERAGE", hasData: true },
  lab: { perfScore: 55, lcpMs: 13400, ttiMs: 13500, tbtMs: 180, weightKb: 14885, unusedJsKb: 369 },
  findings: [
    { id: "ttfb", label: "", measured: "", verdict: "critic", structural: true, detail: "" },
    { id: "greutate", label: "", measured: "", verdict: "critic", structural: true, detail: "" },
  ],
  migrationCandidate: true,
  ...o,
});

const input: CaseInput = { convRatePct: 1.2, aov: 450, monthlyVisits: 20000, currency: "RON" };

describe("shopify-case — leviere", () => {
  it("fara masuratoare de viteza nu exista levier de viteza", () => {
    const levers = buildLevers(audit(), ev({ field: null }));
    expect(levers.find((l) => l.id === "viteza")).toBeUndefined();
  });

  it("server deja rapid = fara levier de viteza (nu inventam castig)", () => {
    const fast = ev({ field: { lcpMs: 1200, ttfbMs: 200, fcpMs: 900, inpMs: 90, cls: 0.01, overall: "FAST", hasData: true } });
    expect(buildLevers(audit(), fast).find((l) => l.id === "viteza")).toBeUndefined();
  });

  it("levierul de viteza citeaza masuratoarea reala si o sursa", () => {
    const l = buildLevers(audit(), ev()).find((x) => x.id === "viteza")!;
    expect(l.evidence).toContain("1503");
    expect(l.source).toMatch(/Deloitte/);
    expect(l.confidence).toBe("masurat");
  });

  it("plata rapida neconfirmata = levier marcat 'neconfirmat'", () => {
    const l = buildLevers(audit(), ev()).find((x) => x.id === "checkout")!;
    expect(l.confidence).toBe("neconfirmat");
  });
});

describe("shopify-case — compunere", () => {
  const mk = (id: string, uplift: number): Lever => ({
    id, label: "", evidence: "", mechanism: "", upliftPct: uplift, confidence: "masurat",
  });

  it("NU aduna naiv: doua leviere de +10% dau sub +21%... dar peste +10%", () => {
    const total = combineUplift([mk("a", 0.1), mk("b", 0.1)], () => true);
    expect(total).toBeGreaterThan(0.1);
    expect(total).toBeCloseTo(0.21, 5); // 1.1x1.1-1, nu 0.1+0.1 pe acelasi vizitator
  });

  it("plafon global: oricat s-ar aduna, nu trece de 45%", () => {
    const many = [mk("a", 0.3), mk("b", 0.3), mk("c", 0.3), mk("d", 0.3)];
    expect(combineUplift(many, () => true)).toBeLessThanOrEqual(0.45);
  });
});

describe("shopify-case — caz complet", () => {
  it("scenariile cresc in ordine si conservatorul e sub optimist", () => {
    const c = buildShopifyCase(audit(), ev(), input);
    const [cons, prob, opt] = c.scenarios;
    expect(cons.extraMonth).toBeLessThanOrEqual(prob.extraMonth);
    expect(prob.extraMonth).toBeLessThanOrEqual(opt.extraMonth);
    expect(cons.convPct).toBeGreaterThan(c.convNowPct);
  });

  it("fara numar de vizite: procente da, bani nu (nu inventam suma)", () => {
    const c = buildShopifyCase(audit(), ev(), { ...input, monthlyVisits: null });
    expect(c.monthlyOrders).toBeNull();
    expect(c.scenarios.every((s) => s.extraMonth === 0)).toBe(true);
    expect(c.scenarios[1].convPct).toBeGreaterThan(c.convNowPct);
    expect(c.assumptions.join(" ")).toMatch(/vizite/);
  });

  it("platforma gazduita deja = verdict nerecomandat", () => {
    const c = buildShopifyCase(audit(), ev({ migrationCandidate: false }), input);
    expect(c.verdict).toBe("nerecomandat");
  });

  it("ONESTITATE: probleme doar reparabile pe loc = NU recomandam migrarea", () => {
    const noStructural = ev({
      findings: [{ id: "lcp", label: "", measured: "", verdict: "critic", structural: false, detail: "" }],
      field: { lcpMs: 2682, ttfbMs: 300, fcpMs: 1000, inpMs: 105, cls: 0.02, overall: "AVERAGE", hasData: true },
      lab: { perfScore: 80, lcpMs: 3000, ttiMs: 4000, tbtMs: 100, weightKb: 1500, unusedJsKb: 50 },
    });
    expect(buildShopifyCase(audit(), noStructural, input).verdict).toBe("nerecomandat");
  });

  it("2+ probleme structurale = recomandat, cu motivul scris", () => {
    const c = buildShopifyCase(audit(), ev(), input);
    expect(c.verdict).toBe("recomandat");
    expect(c.verdictReason).toMatch(/platforma/);
  });

  it("raportul cara mereu si contra-argumentele", () => {
    expect(buildShopifyCase(audit(), ev(), input).tradeoffs.length).toBeGreaterThanOrEqual(3);
  });

  it("TCO: payback calculat din castigul net, nu din venitul brut", () => {
    const c = buildShopifyCase(audit(), ev(), input);
    expect(c.tco.paybackMonths).toBeGreaterThan(0);
    expect(c.tco.deltaMonth).toBe(c.tco.shopifyMonth - c.tco.currentMonth);
  });

  it("conversie necunoscuta -> media pietei, marcata ca atare", () => {
    const c = buildShopifyCase(audit(), ev(), { ...input, convRatePct: null });
    expect(c.usedMarketAverage).toBe(true);
    expect(c.convNowPct).toBe(1.3);
  });
});
