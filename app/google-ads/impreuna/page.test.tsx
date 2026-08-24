import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { publicOutputDigest, publicOutputGoldens } from "@/app/public-output-goldens";

let marginStatus: "invalid" | undefined;
let marginPct: number | undefined;

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  SESSION_COOKIE: "gads_session",
  unseal: () => ({
    refreshToken: "token",
    customerId: "123",
    customerTimeZone: "Europe/Bucharest",
    marginPct,
    marginStatus,
    exp: 9e12,
  }),
}));
vi.mock("@/lib/gads-oauth", () => ({ oauthConfig: () => ({ developerToken: "developer" }), accessTokenFrom: async () => "access" }));
vi.mock("@/lib/gads-structure", () => ({ fetchStructura: async () => ({ cheltuialaTotala: 1200, roasCont: 3 }) }));
vi.mock("@/lib/gads-an", () => ({ citesteAn: async () => ({ roas: 4 }), bugetLunarDin: () => 100 }));
vi.mock("@/lib/gads-demo", () => ({ demoOn: () => false, demoData: () => ({}) }));

beforeEach(() => { marginStatus = undefined; marginPct = undefined; });

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
  expect(publicOutputDigest(html, [
    { kind: "account", value: "123" },
    { kind: "amount", value: "100" },
  ])).toBe(publicOutputGoldens["simulator:page-normal"]);
});
