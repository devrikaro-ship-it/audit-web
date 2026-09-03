// LANG: pending full translation to EN
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product } from "@/lib/gads-audit";
import type { ReportDateRange } from "@/lib/gads-report-periods";
import { openReportSnapshot, type GadsReportSnapshot } from "@/lib/gads-report-delivery";
import { normalizePublicOutput } from "@/app/public-output-goldens";

let sessionMargin: unknown = 25;
let sessionMarginStatus: "invalid" | undefined;
let sessionVariant: "valid" | "missing" | "account" | "timezone" = "valid";
let tokenAvailable = true;
let sessionCustomerName: string | undefined = "DeHome";
let annualTotalsAvailable = false;
let returnImprovementAvailable = true;
let expandedCatalog = false;
let demoWithoutWindows = false;
let emptyCatalog = false;
let capturedReportSnapshot = "";
let exactRangeReads: ReportDateRange[] = [];
let failedExactRead: "selected" | "previous" | "previousYear" | null = null;
let mutateSnapshotBeforeSeal: ((snapshot: GadsReportSnapshot) => GadsReportSnapshot) | null = null;

// Randam PAGINA REALA, nu o copie a ei. Verificarea la nivel de date spune ca cifrele sunt
// corecte; asta spune ca ajung pe ecran — tabelul de produse chiar apare, sectiunile chiar
// exista, iar cazurile de margine (cont fara constatari, masurare stricata) nu strica pagina.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "cookie-fals" }) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => { throw new Error(`REDIRECT ${u}`); },
}));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("./ContactForm", () => ({
  default: ({ reportSnapshot }: { reportSnapshot: string }) => {
    capturedReportSnapshot = reportSnapshot;
    return <form data-test="contact" />;
  },
}));
vi.mock("./actions", () => ({ salveazaContact: async () => {} }));
vi.mock("@/lib/gads-report-delivery", async (original) => {
  const actual = await original<typeof import("@/lib/gads-report-delivery")>();
  return {
    ...actual,
    sealReportSnapshot: (snapshot: GadsReportSnapshot) =>
      actual.sealReportSnapshot(mutateSnapshotBeforeSeal?.(snapshot) ?? snapshot),
  };
});

vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  SESSION_COOKIE: "gads_session",
  unseal: () => sessionVariant === "missing" ? null : ({
    refreshToken: "r", customerId: sessionVariant === "account" ? undefined : "123", customerName: sessionCustomerName,
    customerTimeZone: sessionVariant === "timezone" ? undefined : "Europe/Bucharest", loginCustomerId: "999", marginPct: sessionMargin, marginStatus: sessionMarginStatus,
    currencyCode: "EUR", averageOrderValue: 500, goodsCost: 250, breakEvenCpa: 150, breakEvenRoas: 500 / 150, exp: 9e12,
  }),
}));
vi.mock("@/lib/gads-oauth", () => ({
  accessTokenFrom: async () => tokenAvailable ? "token" : Promise.reject(new Error("token")),
  oauthConfig: () => ({ developerToken: "dev" }),
}));

const P = (id: string, cost: number, val: number, imp: number, clicks = 100): Product =>
  ({ productId: id, title: `Canapea extensibila model ${id}`, cost, conversionValue: val,
     impressions: imp, clicks, conversions: val > 0 ? 1 : 0 });

const stareTracking = { ok: true, reasons: [] as string[], junkPrimary: [] as string[] };
const sourceState = {
  primaryCatalogFails: false,
  secondaryCatalogSuccessCount: Number.POSITIVE_INFINITY,
  structureAvailable: true,
  optionalModulesAvailable: true,
};
const demoState = { enabled: false };
let catalogReadCount = 0;

vi.mock("@/lib/gads-intake", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchShoppingProducts: async () => {
    catalogReadCount += 1;
    if (catalogReadCount > sourceState.secondaryCatalogSuccessCount) throw new Error("Google Ads API 503");
    return {
      products: emptyCatalog ? [] : [P("A", 900, 100, 500), P("B", 300, 0, 200), P("C", 0, 0, 0, 0), P("D", 50, 900, 300), ...(expandedCatalog ? Array.from({ length: 20 }, (_, index) => P(`X${index}`, 100, 0, 100)) : [])],
      catalogComplete: true,
    };
  },
  fetchShoppingProductsForRange: async (_customerId: string, _auth: unknown, _timeZone: string, range: ReportDateRange) => {
    const readIndex = exactRangeReads.length;
    exactRangeReads.push(range);
    const key = (["selected", "previous", "previousYear"] as const)[readIndex];
    if ((sourceState.primaryCatalogFails && key === "selected") || failedExactRead === key) {
      throw new Error("Google Ads API unavailable");
    }
    return {
      products: emptyCatalog ? [] : [P("A", 900, 100, 500), P("B", 300, 0, 200), P("C", 0, 0, 0, 0), P("D", 50, 900, 300), ...(expandedCatalog ? Array.from({ length: 20 }, (_, index) => P(`X${index}`, 100, 0, 100)) : [])],
      catalogComplete: true,
    };
  },
}));
vi.mock("@/lib/calc", async (orig) => {
  const actual = await orig<{ roasImbunatatit: (...values: unknown[]) => number }>();
  return {
    ...actual,
    roasImbunatatit: (...args: unknown[]) => returnImprovementAvailable ? actual.roasImbunatatit(...args) : null,
  };
});
vi.mock("@/lib/gads-tracking", () => ({ fetchTracking: async () => stareTracking }));
vi.mock("@/lib/gads-structure", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchStructura: async () => sourceState.structureAvailable ? ({
    campanii: [], cheltuialaTotala: 3000, roasCont: 4,
    probleme: [{ cod: "bidding-fara-tinta", titlu: "O campanie liciteaza fara nicio tinta", ron: 2977, detaliu: "Detaliu.", grad: "costa" }],
  }) : undefined,
}));
vi.mock("@/lib/gads-pmax", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchPmaxData: async () => sourceState.optionalModulesAvailable ? ({ campanii: [], grupuri: [] }) : undefined,
}));
vi.mock("@/lib/gads-shopping", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchShoppingData: async () => sourceState.optionalModulesAvailable ? ({ campanii: [], produseCuAfisari: 0, conversii30z: 0, cost30z: 0 }) : undefined,
}));
vi.mock("@/lib/gads-search", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchSearchData: async () => sourceState.optionalModulesAvailable ? ({ campanii: [], reclame: [] }) : undefined,
}));
vi.mock("@/lib/gads-keywords", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchKeywordData: async () => sourceState.optionalModulesAvailable ? ({
    negative: ["dehome"],
    termeni: [{ termen: "canapea ieftina", cost: 120, conversii: 0, clicuri: 40 }],
  }) : undefined,
}));
vi.mock("@/lib/gads-an", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  citesteAn: async () => annualTotalsAvailable ? ({ roas: 4, cheltuiala: 1200 }) : null,
}));
vi.mock("@/lib/gads-demo", async (orig) => {
  const actual = await orig<{ demoData: () => unknown }>();
  return {
  ...actual,
  demoOn: () => demoState.enabled,
  demoData: () => demoWithoutWindows ? ({
    products: [P("DEMO", 100, 0, 100)],
    catalogComplete: true,
    tracking: stareTracking,
    structura: { campanii: [], cheltuialaTotala: 100, roasCont: 1, probleme: [] },
    an: null,
    ferestre: undefined,
  }) : actual.demoData(),
};
});

async function html(): Promise<string> {
  const Raport = (await import("./page")).default;
  return renderToStaticMarkup(await Raport());
}

const reportPlaceholders = () => [
  { kind: "account" as const, value: "DeHome", locations: ["root/div[0]/main[0]/div[1]/div[0]/p[0]/text"] },
  { kind: "product" as const, value: "Canapea extensibila model A", locations: ["root/div[0]/main[0]/div[2]/div[1]/article[0]/div[1]/div[0]/table[0]/tbody[0]/tr[0]/td[0]/text"] },
  { kind: "product" as const, value: "Canapea extensibila model B", locations: ["root/div[0]/main[0]/div[2]/div[1]/article[0]/div[1]/div[0]/table[0]/tbody[0]/tr[1]/td[0]/text"] },
  { kind: "product" as const, value: "Canapea extensibila model C", locations: ["root/div[0]/main[0]/div[2]/div[1]/article[3]/div[1]/div[0]/table[0]/tbody[0]/tr[0]/td[0]/text"] },
];

describe("pagina de raport, randata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T08:00:00Z"));
    stareTracking.ok = true;
    stareTracking.reasons = [];
    sourceState.primaryCatalogFails = false;
    sourceState.secondaryCatalogSuccessCount = Number.POSITIVE_INFINITY;
    sourceState.structureAvailable = true;
    sourceState.optionalModulesAvailable = true;
    demoState.enabled = false;
    sessionMargin = 25;
    sessionMarginStatus = undefined;
    sessionVariant = "valid";
    tokenAvailable = true;
    sessionCustomerName = "DeHome";
    annualTotalsAvailable = false;
    returnImprovementAvailable = true;
    expandedCatalog = false;
    demoWithoutWindows = false;
    emptyCatalog = false;
    catalogReadCount = 0;
    capturedReportSnapshot = "";
    exactRangeReads = [];
    failedExactRead = null;
    mutateSnapshotBeforeSeal = null;
  });

  afterEach(() => vi.useRealTimers());

  it.each([
    ["missing", "/google-ads/connect?eroare=sesiune"],
    ["account", "/google-ads/conturi"],
    ["timezone", "/google-ads/conturi"],
  ] as const)("refuses the %s report session boundary", async (variant, destination) => {
    sessionVariant = variant;
    await expect(html()).rejects.toThrow(`REDIRECT ${destination}`);
  });

  it("redirects when the access token cannot be refreshed", async () => {
    tokenAvailable = false;
    await expect(html()).rejects.toThrow("REDIRECT /google-ads/connect?eroare=expirat");
  });

  it("renders annual totals and the anonymous account fallback", async () => {
    annualTotalsAvailable = true;
    sessionCustomerName = undefined;
    expect(await html()).toBeTruthy();
  });

  it("renders fallback return and remaining-product output", async () => {
    returnImprovementAvailable = false;
    expandedCatalog = true;
    expect(await html()).toBeTruthy();
  });

  it("renders a demo source without short-window data", async () => {
    demoState.enabled = true;
    demoWithoutWindows = true;
    expect(await html()).toBeTruthy();
  });

  it("sends a truly missing pre-step margin through the normal margin flow", async () => {
    sessionMargin = undefined;
    await expect(html()).rejects.toThrow("REDIRECT /google-ads/marja");
  });

  it("sends an invalid stored margin to the visible recovery state", async () => {
    sessionMargin = undefined;
    sessionMarginStatus = "invalid";
    await expect(html()).rejects.toThrow("REDIRECT /google-ads/marja?eroare=marja");
  });


  // Legenda de la finalul raportului explica nivelurile de onestitate. SIMULARE era folosit ca
  // eticheta pe o constatare si lipsea din legenda — clientul vedea un cuvant pe care raportul
  // nu i-l explica nicaieri. SPEC: trei niveluri, fiecare etichetat oriunde apare.
  it("renders honesty labels on every successful report", async () => {
    const h = await html();
    expect(normalizePublicOutput(h, reportPlaceholders())).toMatchSnapshot("report:success");
    expect(h).toContain('data-public-oauth-surface="report:success"');
    expect(h).toContain('data-report-surface="honesty-and-caveats"');
    expect(h).toContain("MASURAT");
    expect(h).toContain("ESTIMARE");
    expect(h).toMatch(/<b>SIMULARE<\/b>/);
  });

  it("arata produsele pe nume, nu doar numarul lor", async () => {
    const h = await html();
    expect(h).toContain("Canapea extensibila model A");
    expect(h).toContain("900 RON");
  });

  it("keeps the measured 365-day window in the live dashboard", async () => {
    const h = await html();
    expect(h).toContain('data-report-section="brand-header"');
    const visibleText = h.replace(/<[^>]*>/g, " ");
    expect(visibleText).toContain("28 august 2025 – 27 august 2026");
    expect(visibleText).toContain("Audit doar în citire");
  });

  it("stores exact selected, previous, and prior-year ranges with complete labeled products", async () => {
    vi.setSystemTime(new Date("2024-08-27T08:00:00Z"));
    await html();

    expect(exactRangeReads).toEqual([
      { from: "2023-08-29", to: "2024-08-27" },
      { from: "2022-08-29", to: "2023-08-28" },
      { from: "2022-08-29", to: "2023-08-27" },
    ]);
    const stored = openReportSnapshot(capturedReportSnapshot);
    expect(stored?.reportV2).toMatchObject({
      version: 2,
      currencyCode: "EUR",
      productPopulationStatus: "COMPLETE",
      periods: {
        selected: {
          range: { from: "2023-08-29", to: "2024-08-27" },
          spend: 1_250,
          salesVolume: 1_000,
          numberOfSales: 2,
        },
        previous: { range: { from: "2022-08-29", to: "2023-08-28" } },
        previousYear: { range: { from: "2022-08-29", to: "2023-08-27" } },
      },
    });
    expect(stored?.reportV2?.products.map(({ productId, sourceLabel }) => [productId, sourceLabel])).toEqual([
      ["A", "LOSS_MAKER"],
      ["B", "LOSS_MAKER"],
      ["C", "NOT_PROMOTED"],
      ["D", "UNDERPROMOTED_POTENTIAL"],
    ]);
    expect(new Set(stored?.reportV2?.products.map(({ productId }) => productId)).size).toBe(4);
  });

  it("stores a failed comparison read as unavailable instead of a zero period", async () => {
    failedExactRead = "previous";
    await html();

    const stored = openReportSnapshot(capturedReportSnapshot);
    expect(stored?.reportV2?.periods.previous).toBeNull();
    expect(stored?.reportV2?.periods.selected).toMatchObject({
      spend: 1_250,
      salesVolume: 1_000,
      numberOfSales: 2,
    });
  });

  it("renders the shared V2 hierarchy and reconciles the visible loss conclusion with its tab", async () => {
    const h = await html();
    const sectionOrder = Array.from(
      h.matchAll(/data-report-section="([^"]+)"/g),
      (match) => match[1],
    );
    const lossConclusion = h.match(
      /data-testid="conclusion-MEASURED_PRODUCT_LOSS"[^>]*data-raw-value="([^"]+)"/,
    );
    const lossGroup = h.match(
      /data-testid="group-claim-LOSS_MAKER"[^>]*data-raw-value="([^"]+)"/,
    );

    expect(h).toContain('data-report-dashboard="v2"');
    expect(sectionOrder).toEqual([
      "brand-header",
      "account-summary",
      "primary-conclusions",
      "period-comparison",
      "product-actions",
    ]);
    expect(h).toContain("EUR");
    expect(h).toContain("28 august 2025 – 27 august 2026");
    expect(lossConclusion?.[1]).toBe(lossGroup?.[1]);
    expect(h).not.toContain('data-legacy-permanent-labels');
  });

  it("renders every immediate V2 decision from the opened signed snapshot sent to contact", async () => {
    mutateSnapshotBeforeSeal = (snapshot) => ({
      ...snapshot,
      breakEvenCpa: 777,
      breakEvenRoas: 10,
      reportV2: snapshot.reportV2 ? {
        ...snapshot.reportV2,
        currencyCode: "GBP",
        periods: {
          ...snapshot.reportV2.periods,
          selected: {
            range: { from: "2026-07-01", to: "2026-07-31" },
            spend: 2_000,
            salesVolume: 4_000,
            numberOfSales: 4,
          },
        },
        products: snapshot.reportV2.products.map((product, index) =>
          index === 0
            ? { ...product, title: "Signed snapshot product", cost: 1_111 }
            : product,
        ),
      } : undefined,
    });

    const h = await html();
    const stored = openReportSnapshot(capturedReportSnapshot);

    expect(stored?.reportV2).toMatchObject({
      currencyCode: "GBP",
      periods: {
        selected: {
          range: { from: "2026-07-01", to: "2026-07-31" },
          spend: 2_000,
          salesVolume: 4_000,
          numberOfSales: 4,
        },
      },
    });
    expect(stored?.reportV2?.products[0]).toMatchObject({
      title: "Signed snapshot product",
      cost: 1_111,
    });
    expect(stored?.breakEvenRoas).toBe(10);
    expect(stored?.breakEvenCpa).toBe(777);
    expect(h).toContain("Signed snapshot product");
    expect(h).toContain("1–31 iulie 2026");
    expect(h).toContain("GBP");
    expect(h).toContain('data-testid="conclusion-MEASURED_PRODUCT_LOSS" data-raw-value="1401"');
    expect(h).toContain("10×");
    expect(h).toContain("777");
  });

  it("marks demo output visibly and stores it through the same V2 snapshot contract", async () => {
    demoState.enabled = true;
    await html();

    const stored = openReportSnapshot(capturedReportSnapshot);
    expect(stored?.reportV2).toMatchObject({
      version: 2,
      currencyCode: "EUR",
      productPopulationStatus: "COMPLETE",
    });
    expect(stored?.reportV2?.periods.previous).not.toBeNull();
    expect(stored?.reportV2?.periods.previousYear).not.toBeNull();
  });

  it("are amandoua sectiunile, si banda de sumar deasupra lor", async () => {
    const h = await html();
    expect(h).toContain("Unde pierzi bani");
    expect(h).toContain("Ce e setat gresit in cont");
    expect(h).toContain("Produse analizate");
  });

  it("arata harta catalogului pe cele cinci grupe, cu perioada comutabila", async () => {
    const h = await html();
    expect(h).toContain("Cum sta catalogul tau");
    for (const grupa of ["Heroes", "Sidekicks", "Villains", "Zombies", "0 Zombies"]) {
      expect(h).toContain(grupa);
    }
    // Cele trei lentile peste aceleasi grupe — ele fac argumentul, nu grupele singure.
    expect(h).toContain("Cat mananca");
    expect(h).toContain("Cat aduc");
    expect(h).toContain("30 de zile");
  });

  it("nu scapa in raportul clientului mecanica din spatele clasificarii", async () => {
    // Pragul de trafic e o setare de-a noastra. Daca ajunge pe pagina, clientul incepe sa
    // negocieze parametrul in loc sa se uite la produse.
    const h = await html();
    expect(h).not.toContain("prag de clicuri");
    expect(h).not.toContain("Producthero");
    expect(h).not.toContain("ProductHero");
  });

  it("arata si cautarile care au ars bani", async () => {
    expect(await html()).toContain("canapea ieftina");
  });

  it("pune eticheta de onestitate pe fiecare constatare", async () => {
    const h = await html();
    expect(h).toContain("MASURAT");
    expect(h).toContain("SIMULARE");
  });

  it("are sectiunea 'cu Devrika' la final, inaintea formularului de contact", async () => {
    const h = await html();
    expect(h).toContain("Vezi calculul pe cifrele tale");
    expect(h).toContain("Simulare");
    expect(h.indexOf("Vezi calculul pe cifrele tale")).toBeLessThan(h.indexOf('data-test="contact"'));
  });

  it("formularul de contact vine dupa constatari, nu inaintea lor", async () => {
    const h = await html();
    expect(h.indexOf("Unde pierzi bani")).toBeLessThan(h.indexOf('data-test="contact"'));
  });

  it("keeps the report contact form target available", async () => {
    const h = await html();
    expect(h).toContain('id="contact-form"');
  });

  it("renders the alternative recovery surface when the primary catalog read fails", async () => {
    sourceState.primaryCatalogFails = true;
    const h = await html();
    expect(h).toContain('data-report-surface="catalog-unavailable-recovery"');
    expect(h).toContain('data-public-oauth-surface="report:catalog-unavailable"');
    expect(h).toContain("Nu am putut citi catalogul de Shopping");
    expect(h).toContain("Incearca din nou");
    expect(normalizePublicOutput(h)).toMatchSnapshot("report:catalog-unavailable");
  });

  it("pe masurare stricata nu afiseaza ROAS pe produse", async () => {
    stareTracking.ok = false;
    stareTracking.reasons = ["nicio actiune de vanzare configurata"];
    const h = await html();
    expect(h).toContain("nu se poate judeca inca");
    expect(h).toContain("necunoscut");
  });

  it("renders an unsupported conclusion without product rows", async () => {
    stareTracking.ok = false;
    emptyCatalog = true;
    expect(await html()).toBeTruthy();
  });

  it("renders the catalog map at one and many windows but not zero", async () => {
    sourceState.secondaryCatalogSuccessCount = 0;
    const zero = await html();
    expect(zero).not.toContain('data-report-surface="catalog-map"');
    expect(normalizePublicOutput(zero, reportPlaceholders())).toMatchSnapshot("report:catalog-map-zero");
    catalogReadCount = 0;
    sourceState.secondaryCatalogSuccessCount = 1;
    const one = await html();
    expect(one).toContain('data-report-surface="catalog-map"');
    expect(normalizePublicOutput(one, reportPlaceholders())).toMatchSnapshot("report:catalog-map-one");
    catalogReadCount = 0;
    sourceState.secondaryCatalogSuccessCount = 7;
    const many = await html();
    expect(many).toContain('data-report-surface="catalog-map"');
    expect(normalizePublicOutput(many, reportPlaceholders())).toMatchSnapshot("report:catalog-map-many");
  });

  it("renders every unconditional report surface", async () => {
    const h = await html();
    expect(h).toContain('data-report-surface="navigation"');
    expect(h).toContain('data-report-surface="headline-summary"');
    expect(h).toContain('data-report-surface="money-findings"');
    expect(h).toContain('data-report-surface="contact-form"');
    expect(h).toContain('data-report-surface="honesty-and-caveats"');
  });

  it("renders the V2 dashboard with the complete product action groups", async () => {
    const h = await html();
    expect(h).toContain('data-report-dashboard="v2"');
    expect(h).toContain('aria-label="Produse: Consumă buget"');
    expect(h).toContain("Consumă buget");
    expect(h).toContain("Insuficient promovate");
    expect(h).not.toContain("Profit after advertising");
    expect(h).toContain('data-report-version="profitability-v3-original"');
  });

  it("visually suppresses every legacy report section in the profitability report", async () => {
    const h = await html();
    for (const surface of ["headline-summary", "money-findings", "catalog-map", "account-settings", "simulator-call-to-action"]) {
      expect(h).toMatch(new RegExp(`data-report-surface="${surface}"[^>]*style="display:none"`));
    }
  });

  it("renders all evidence tiers inside money findings", async () => {
    const h = await html();
    expect(h).toContain('data-report-surface="money-findings"');
    const start = h.indexOf('data-report-surface="money-findings"');
    const end = h.indexOf('data-report-surface="catalog-map"', start);
    const moneySurface = h.slice(start, end);
    expect(moneySurface).toContain("MASURAT");
    expect(moneySurface).toContain("ESTIMARE");
    expect(moneySurface).toContain("SIMULARE");
  });

  it("renders the demo banner only in demo mode", async () => {
    expect(await html()).not.toContain('data-report-surface="demo-banner"');
    catalogReadCount = 0;
    demoState.enabled = true;
    const demo = await html();
    expect(demo).toContain('data-report-surface="demo-banner"');
    const normalizedDemo = normalizePublicOutput(demo, [{ kind: "account", value: "DeHome", locations: ["root/div[0]/main[0]/div[2]/div[0]/p[0]/text"] }]);
    expect(normalizedDemo).toMatchSnapshot("report:demo");
    expect(normalizedDemo).toContain("MOD DEMO");
  });

  it("renders the V2 account targets instead of the legacy KPI strip", async () => {
    const h = await html();
    expect(h).toContain('data-report-dashboard="v2"');
    expect(h).toContain('aria-label="Țintele contului"');
    expect(h).not.toContain('class="kpis"');
    expect(h).not.toContain("Current report");
  });

  it("exercises account, simulator, and contact availability branches", async () => {
    const available = await html();
    expect(available).toContain('data-report-surface="account-settings"');
    expect(available).toContain('data-report-surface="simulator-call-to-action"');
    expect(available).toContain('data-report-surface="contact-form"');
    catalogReadCount = 0;
    sourceState.structureAvailable = false;
    sourceState.optionalModulesAvailable = false;
    const h = await html();
    expect(h).toContain('data-report-surface="contact-form"');
    expect(h).not.toContain('data-report-surface="account-settings"');
    expect(h).not.toContain('data-report-surface="simulator-call-to-action"');
  });

  it("exercises both unsupported-conclusion guard branches", async () => {
    expect(await html()).not.toContain('data-report-surface="unsupported-conclusions"');
    catalogReadCount = 0;
    stareTracking.ok = false;
    stareTracking.reasons = ["tracking unavailable"];
    expect(await html()).toContain('data-report-surface="unsupported-conclusions"');
  });
});
