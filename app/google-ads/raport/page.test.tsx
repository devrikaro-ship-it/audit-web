import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product } from "@/lib/gads-audit";

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
    loginCustomerId: "999", marginPct: 25, exp: 9e12,
  }),
}));
vi.mock("@/lib/gads-oauth", () => ({
  accessTokenFrom: async () => "token",
  oauthConfig: () => ({ developerToken: "dev" }),
}));

const P = (id: string, cost: number, val: number, imp: number): Product =>
  ({ productId: id, title: `Canapea extensibila model ${id}`, cost, conversionValue: val, impressions: imp });

const stareTracking = { ok: true, reasons: [] as string[], junkPrimary: [] as string[] };

const stareCatalog = { cade: false };

vi.mock("@/lib/gads-intake", () => ({
  fetchShoppingProducts: async () => {
    if (stareCatalog.cade) throw new Error("Google Ads API 401");
    return {
      products: [P("A", 900, 100, 500), P("B", 300, 0, 200), P("C", 0, 0, 0), P("D", 50, 900, 300)],
      catalogComplete: true,
    };
  },
}));
vi.mock("@/lib/gads-tracking", () => ({ fetchTracking: async () => stareTracking }));
vi.mock("@/lib/gads-structure", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchStructura: async () => ({
    campanii: [], cheltuialaTotala: 3000, roasCont: 4,
    probleme: [{ cod: "bidding-fara-tinta", titlu: "O campanie liciteaza fara nicio tinta", ron: 2977, detaliu: "Detaliu.", grad: "costa" }],
  }),
}));
vi.mock("@/lib/gads-pmax", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchPmaxData: async () => ({ campanii: [], grupuri: [] }),
}));
vi.mock("@/lib/gads-shopping", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchShoppingData: async () => ({ campanii: [], produseCuAfisari: 0, conversii30z: 0, cost30z: 0 }),
}));
vi.mock("@/lib/gads-search", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchSearchData: async () => ({ campanii: [], reclame: [] }),
}));
vi.mock("@/lib/gads-keywords", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchKeywordData: async () => ({
    negative: ["dehome"],
    termeni: [{ termen: "canapea ieftina", cost: 120, conversii: 0, clicuri: 40 }],
  }),
}));

async function html(): Promise<string> {
  const Raport = (await import("./page")).default;
  return renderToStaticMarkup(await Raport());
}

describe("pagina de raport, randata", () => {
  beforeEach(() => { stareTracking.ok = true; stareCatalog.cade = false; });

  it("arata produsele pe nume, nu doar numarul lor", async () => {
    const h = await html();
    expect(h).toContain("Canapea extensibila model A");
    expect(h).toContain("900 RON");
  });

  it("are amandoua sectiunile, si banda de sumar deasupra lor", async () => {
    const h = await html();
    expect(h).toContain("Unde pierzi bani");
    expect(h).toContain("Ce e setat gresit in cont");
    expect(h).toContain("Produse analizate");
  });

  it("arata si cautarile care au ars bani", async () => {
    expect(await html()).toContain("canapea ieftina");
  });

  it("pune eticheta de onestitate pe fiecare constatare", async () => {
    const h = await html();
    expect(h).toContain("MASURAT");
    expect(h).toContain("SIMULARE");
  });

  it("formularul de contact vine dupa constatari, nu inaintea lor", async () => {
    const h = await html();
    expect(h.indexOf("Unde pierzi bani")).toBeLessThan(h.indexOf('data-test="contact"'));
  });

  it("cand catalogul nu se poate citi, spune asta cinstit in loc sa cada cu 500", async () => {
    stareCatalog.cade = true;
    const h = await html();
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
});
