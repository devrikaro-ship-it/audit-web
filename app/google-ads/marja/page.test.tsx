import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GROSS_MARGIN_ERROR } from "@/lib/gads-session";
import { normalizePublicOutput } from "@/app/public-output-goldens";

let sessionVariant: "valid" | "missing" | "account" | "timezone" = "valid";
let demoEnabled = false;
let productCount = 0;
let productCategory: string | undefined;

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  SESSION_COOKIE: "gads_session",
  unseal: () => sessionVariant === "missing" ? null : ({ refreshToken: "token", customerId: sessionVariant === "account" ? undefined : "123", customerTimeZone: sessionVariant === "timezone" ? undefined : "Europe/Bucharest", exp: 9e12 }),
}));
vi.mock("@/lib/gads-oauth", () => ({ accessTokenFrom: async () => "access", oauthConfig: () => ({ developerToken: "dev" }) }));
vi.mock("@/lib/gads-intake", () => ({ fetchShoppingProducts: async () => ({ products: Array.from({ length: productCount }, () => ({ title: "Product", category: productCategory })) }) }));
vi.mock("@/lib/gads-demo", () => ({ demoOn: () => demoEnabled, demoData: () => ({ products: Array.from({ length: productCount }, () => ({ title: "Product", category: productCategory })) }) }));
vi.mock("./MarginForm", () => ({ default: () => <form data-test="margin-retry" /> }));

it("renders the margin explanation and retry path after invalid submission", async () => {
  const MarginPage = (await import("./page")).default;
  const html = renderToStaticMarkup(await MarginPage({ searchParams: Promise.resolve({ eroare: "marja" }) }));
  expect(html).toContain(GROSS_MARGIN_ERROR);
  expect(html).toContain('data-public-oauth-surface="margin:error"');
  expect(html).toContain('data-test="margin-retry"');
  expect(normalizePublicOutput(html)).toMatchSnapshot("margin:error");
});

it("renders the normal margin state through the canonical contract", async () => {
  const MarginPage = (await import("./page")).default;
  const html = renderToStaticMarkup(await MarginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('data-public-oauth-surface="margin:normal"');
  expect(normalizePublicOutput(html)).toMatchSnapshot("margin:normal");
});

it.each([
  ["missing", "/google-ads/connect?eroare=sesiune"],
  ["account", "/google-ads/conturi"],
  ["timezone", "/google-ads/conturi"],
] as const)("refuses the %s margin session boundary", async (variant, destination) => {
  sessionVariant = variant;
  const MarginPage = (await import("./page")).default;
  await expect(MarginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(`REDIRECT ${destination}`);
  sessionVariant = "valid";
});

it("executes demo and populated catalog branches", async () => {
  demoEnabled = true;
  productCount = 2;
  const MarginPage = (await import("./page")).default;
  expect(renderToStaticMarkup(await MarginPage({ searchParams: Promise.resolve({}) }))).toBeTruthy();
  demoEnabled = false;
  productCategory = "436";
  expect(renderToStaticMarkup(await MarginPage({ searchParams: Promise.resolve({}) }))).toBeTruthy();
  productCount = 0;
  productCategory = undefined;
});
