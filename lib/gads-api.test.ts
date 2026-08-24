// LANG: pending full translation to EN
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 19.08.2026: auditul a picat pe cont real cu "listare conturi esuata: 404 <!DOCTYPE html>".
// Cauza: v21 fusese retrasa de Google (probat direct: v21 -> 404, v22..v26 -> 401), iar
// versiunea era scrisa de mana in doua fisiere. Testele astea apara trei lucruri:
// versiunea sta intr-un singur loc, se poate schimba din env fara rebuild, iar o valoare
// gresita crapa la noi cu mesaj limpede, nu cu o pagina HTML de la Google.

const VECHI = process.env.GADS_API_VERSION;

beforeEach(() => {
  delete process.env.GADS_API_VERSION;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  if (VECHI === undefined) delete process.env.GADS_API_VERSION;
  else process.env.GADS_API_VERSION = VECHI;
});

describe("versiunea Google Ads API", () => {
  it("implicit e una pe care Google inca o serveste", async () => {
    const { gadsApiVersion } = await import("./gads-api");
    // v21 si tot ce e sub ea au fost retrase — verificat pe 19.08.2026 lovind direct API-ul.
    expect(Number(gadsApiVersion().replace("v", ""))).toBeGreaterThanOrEqual(22);
  });

  it("se poate schimba din env, fara sa umblam prin cod", async () => {
    process.env.GADS_API_VERSION = "v24";
    const { gadsApiVersion, gadsApiUrl } = await import("./gads-api");
    expect(gadsApiVersion()).toBe("v24");
    expect(gadsApiUrl("customers:listAccessibleCustomers")).toBe(
      "https://googleads.googleapis.com/v24/customers:listAccessibleCustomers"
    );
  });

  it("o versiune scrisa aiurea crapa la noi, cu mesaj limpede", async () => {
    process.env.GADS_API_VERSION = "21";
    const { gadsApiVersion } = await import("./gads-api");
    expect(() => gadsApiVersion()).toThrow(/GADS_API_VERSION/);
  });
});

describe("cine cheama Google Ads", () => {
  it("interogarea GAQL foloseste versiunea configurata", async () => {
    process.env.GADS_API_VERSION = "v25";
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((u: string) => {
        urls.push(u);
        return Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 }));
      })
    );
    const { googleAdsSearch } = await import("./net");
    await googleAdsSearch("123-456-7890", "SELECT customer.id FROM customer", {
      accessToken: "at",
      developerToken: "dt",
    });
    expect(urls[0]).toBe("https://googleads.googleapis.com/v25/customers/1234567890/googleAds:search");
  });

  it("listarea conturilor foloseste versiunea configurata", async () => {
    process.env.GADS_API_VERSION = "v25";
    process.env.GADS_OAUTH_CLIENT_ID = "ci";
    process.env.GADS_OAUTH_CLIENT_SECRET = "cs";
    process.env.GADS_DEVELOPER_TOKEN = "dt";
    process.env.GADS_REDIRECT_URI = "http://localhost:3000/api/google-ads/callback";
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((u: string) => {
        urls.push(u);
        return Promise.resolve(new Response(JSON.stringify({ resourceNames: [] }), { status: 200 }));
      })
    );
    const { listAccounts } = await import("./gads-oauth");
    await listAccounts("at");
    expect(urls[0]).toBe("https://googleads.googleapis.com/v25/customers:listAccessibleCustomers");
  });

  it("reads the selected account time zone from the customer resource", async () => {
    process.env.GADS_OAUTH_CLIENT_ID = "ci";
    process.env.GADS_OAUTH_CLIENT_SECRET = "cs";
    process.env.GADS_DEVELOPER_TOKEN = "dt";
    process.env.GADS_REDIRECT_URI = "http://localhost:3000/api/google-ads/callback";
    const queries: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: string, init?: RequestInit) => {
        queries.push(String(init?.body));
        return Promise.resolve(new Response(JSON.stringify({
          results: [{ customer: { timeZone: "America/Los_Angeles" } }],
        }), { status: 200 }));
      })
    );
    const { fetchCustomerTimeZone } = await import("./gads-oauth");
    const timeZone = await fetchCustomerTimeZone("123", {
      accessToken: "at",
      developerToken: "dt",
      loginCustomerId: "999",
    });
    expect(timeZone).toBe("America/Los_Angeles");
    expect(queries[0]).toContain("customer.time_zone");
  });

  it("accepts a valid IANA customer time zone", async () => {
    const { validateCustomerTimeZone } = await import("./gads-oauth");
    expect(validateCustomerTimeZone("Europe/Bucharest")).toBe("Europe/Bucharest");
  });

  it("rejects a missing customer time zone", async () => {
    const { validateCustomerTimeZone } = await import("./gads-oauth");
    expect(() => validateCustomerTimeZone(undefined)).toThrow(/unavailable/);
  });

  it("rejects an invalid customer time zone", async () => {
    const { validateCustomerTimeZone } = await import("./gads-oauth");
    expect(() => validateCustomerTimeZone("Not/A_Time_Zone")).toThrow(/invalid/);
  });

  it("validates the account time zone before sealing and routes failures back to selection", () => {
    const action = readFileSync(join("app", "google-ads", "conturi", "actions.ts"), "utf8");
    expect(action.indexOf("fetchCustomerTimeZone")).toBeLessThan(action.indexOf("seal({"));
    expect(action).toMatch(/fetchCustomerTimeZone[\s\S]*\.catch\(\(\) => redirect\(/);
    expect(action).toContain("/google-ads/conturi?eroare=cont");
  });

  it("nimeni in afara de lib/gads-api.ts nu mai scrie versiunea de mana", () => {
    const rada = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return rada(p);
        return /\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts") ? [p] : [];
      });
    const detinator = join("lib", "gads-api.ts"); // acolo e locul ei, plus exemplul de curl din comentariu
    const vinovate = [...rada("lib"), ...rada("app")]
      .filter((f) => f !== detinator)
      .filter((f) => /googleads\.googleapis\.com\/v\d+/.test(readFileSync(f, "utf8")));
    expect(vinovate).toEqual([]);
  });
});
