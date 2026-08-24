import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { normalizePublicOutput } from "@/app/public-output-goldens";

let marginStatus: "invalid" | undefined;
let marginPct: number | undefined;
let sessionVariant: "valid" | "missing" | "account" | "timezone" = "valid";
let demoEnabled = false;
let tokenAvailable = true;
let structureAvailable = true;
let structureRoas: number | undefined = 3;
let annualRoas: number | undefined = 4;

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  SESSION_COOKIE: "gads_session",
  unseal: () => sessionVariant === "missing" ? null : ({
    refreshToken: "token",
    customerId: sessionVariant === "account" ? undefined : "123",
    customerTimeZone: sessionVariant === "timezone" ? undefined : "Europe/Bucharest",
    marginPct,
    marginStatus,
    exp: 9e12,
  }),
}));
vi.mock("@/lib/gads-oauth", () => ({ oauthConfig: () => ({ developerToken: "developer" }), accessTokenFrom: async () => tokenAvailable ? "access" : Promise.reject(new Error("token")) }));
vi.mock("@/lib/gads-structure", () => ({ fetchStructura: async () => structureAvailable ? ({ cheltuialaTotala: 1200, roasCont: structureRoas }) : Promise.reject(new Error("structure")) }));
vi.mock("@/lib/gads-an", () => ({ citesteAn: async () => annualRoas === undefined ? null : ({ roas: annualRoas }), bugetLunarDin: () => 100 }));
vi.mock("@/lib/gads-demo", () => ({ demoOn: () => demoEnabled, demoData: () => ({ structura: { cheltuialaTotala: 1200, roasCont: 3 } }) }));

beforeEach(() => { marginStatus = undefined; marginPct = undefined; sessionVariant = "valid"; demoEnabled = false; tokenAvailable = true; structureAvailable = true; structureRoas = 3; annualRoas = 4; });

it("keeps a missing pre-step margin on the normal margin route", async () => {
  const TogetherPage = (await import("./page")).default;
  await expect(TogetherPage()).rejects.toThrow("REDIRECT /google-ads/marja");
});

it("sends an invalid stored margin to the visible recovery state", async () => {
  marginStatus = "invalid";
  const TogetherPage = (await import("./page")).default;
  await expect(TogetherPage()).rejects.toThrow("REDIRECT /google-ads/marja?eroare=marja");
});

it("matches the complete simulator page output to its reviewed golden", async () => {
  marginPct = 28.5;
  const TogetherPage = (await import("./page")).default;
  const html = renderToStaticMarkup(await TogetherPage());
  expect(normalizePublicOutput(html, [
    { kind: "amount", value: "100", locations: [
      "root/div[0]/div[0]/div[0]/div[1]/label[2]/input[0]@value",
      "root/div[0]/div[0]/div[0]/div[3]/div[0]/dl[0]/div[0]/dd[0]/text",
      "root/div[0]/div[0]/div[0]/div[3]/div[1]/dl[0]/div[0]/dd[0]/text",
    ] },
  ])).toMatchSnapshot("simulator:page-normal");
});

it.each([
  ["missing", "/google-ads/connect?eroare=sesiune"],
  ["account", "/google-ads/conturi"],
  ["timezone", "/google-ads/conturi"],
] as const)("refuses the %s session boundary", async (variant, destination) => {
  sessionVariant = variant;
  const TogetherPage = (await import("./page")).default;
  await expect(TogetherPage()).rejects.toThrow(`REDIRECT ${destination}`);
});

it("renders demo and unavailable-data outcomes", async () => {
  marginPct = 28.5;
  demoEnabled = true;
  const TogetherPage = (await import("./page")).default;
  expect(renderToStaticMarkup(await TogetherPage())).toBeTruthy();
  demoEnabled = false;
  structureAvailable = false;
  expect(renderToStaticMarkup(await TogetherPage())).toBeTruthy();
  structureAvailable = true;
  structureRoas = undefined;
  annualRoas = undefined;
  expect(renderToStaticMarkup(await TogetherPage())).toBeTruthy();
  tokenAvailable = false;
  await expect(TogetherPage()).rejects.toThrow("REDIRECT /google-ads/connect?eroare=expirat");
});
