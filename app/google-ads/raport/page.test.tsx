// LANG: pending full translation to EN
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product } from "@/lib/gads-audit";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";

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
vi.mock("./ContactForm", () => ({ default: () => <form data-test="contact" /> }));
vi.mock("./actions", () => ({ salveazaContact: async () => {} }));

vi.mock("@/lib/gads-session", () => ({
  SESSION_COOKIE: "gads_session",
  unseal: () => ({
    refreshToken: "r", customerId: "123", customerName: "DeHome",
    customerTimeZone: "Europe/Bucharest", loginCustomerId: "999", marginPct: 25, exp: 9e12,
  }),
}));
vi.mock("@/lib/gads-oauth", () => ({
  accessTokenFrom: async () => "token",
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
let catalogReadCount = 0;

vi.mock("@/lib/gads-intake", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchShoppingProducts: async () => {
    catalogReadCount += 1;
    if (sourceState.primaryCatalogFails && catalogReadCount === 1) throw new Error("Google Ads API 401");
    if (catalogReadCount > sourceState.secondaryCatalogSuccessCount + 1) throw new Error("Google Ads API 503");
    return {
      products: [P("A", 900, 100, 500), P("B", 300, 0, 200), P("C", 0, 0, 0, 0), P("D", 50, 900, 300)],
      catalogComplete: true,
    };
  },
}));
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
  citesteAn: async () => null,
}));

async function html(): Promise<string> {
  const Raport = (await import("./page")).default;
  return renderToStaticMarkup(await Raport());
}

describe("pagina de raport, randata", () => {
  beforeEach(() => {
    stareTracking.ok = true;
    stareTracking.reasons = [];
    sourceState.primaryCatalogFails = false;
    sourceState.secondaryCatalogSuccessCount = Number.POSITIVE_INFINITY;
    sourceState.structureAvailable = true;
    sourceState.optionalModulesAvailable = true;
    catalogReadCount = 0;
  });


  // Legenda de la finalul raportului explica nivelurile de onestitate. SIMULARE era folosit ca
  // eticheta pe o constatare si lipsea din legenda — clientul vedea un cuvant pe care raportul
  // nu i-l explica nicaieri. SPEC: trei niveluri, fiecare etichetat oriunde apare.
  it("renders honesty labels on every successful report", async () => {
    const h = await html();
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

  it("renders the shared localized 365-day label instead of the legacy window label", async () => {
    const h = await html();
    expect(h).toContain('data-report-surface="headline-summary"');
    const visibleText = h.replace(/<[^>]*>/g, " ");
    expect(h).toContain(AUDIT_WINDOW_LABEL);
    expect(visibleText).not.toMatch(/\b12\s+\p{L}+/u);
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

  it("renders the alternative recovery surface when the primary catalog read fails", async () => {
    sourceState.primaryCatalogFails = true;
    const h = await html();
    expect(h).toContain('data-report-surface="catalog-unavailable-recovery"');
    expect(h).toContain("Nu am putut citi catalogul de Shopping");
    expect(h).toContain("Incearca din nou");
  });

  it("pe masurare stricata nu afiseaza ROAS pe produse", async () => {
    stareTracking.ok = false;
    stareTracking.reasons = ["nicio actiune de vanzare configurata"];
    const h = await html();
    expect(h).toContain("nu se poate judeca inca");
    expect(h).toContain("necunoscut");
  });

  it("exercises both catalog-map guard branches", async () => {
    sourceState.secondaryCatalogSuccessCount = 0;
    expect(await html()).not.toContain('data-report-surface="catalog-map"');
    catalogReadCount = 0;
    sourceState.secondaryCatalogSuccessCount = 1;
    expect(await html()).toContain('data-report-surface="catalog-map"');
    catalogReadCount = 0;
    sourceState.secondaryCatalogSuccessCount = 7;
    expect(await html()).toContain('data-report-surface="catalog-map"');
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
