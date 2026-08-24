import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GROSS_MARGIN_ERROR } from "@/lib/gads-session";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  SESSION_COOKIE: "gads_session",
  unseal: () => ({ refreshToken: "token", customerId: "123", customerTimeZone: "Europe/Bucharest", exp: 9e12 }),
}));
vi.mock("@/lib/gads-oauth", () => ({ accessTokenFrom: async () => "access", oauthConfig: () => ({ developerToken: "dev" }) }));
vi.mock("@/lib/gads-intake", () => ({ fetchShoppingProducts: async () => ({ products: [] }) }));
vi.mock("@/lib/gads-demo", () => ({ demoOn: () => false, demoData: () => ({ products: [] }) }));
vi.mock("./MarginForm", () => ({ default: () => <form data-test="margin-retry" /> }));

it("renders the margin explanation and retry path after invalid submission", async () => {
  const MarginPage = (await import("./page")).default;
  const html = renderToStaticMarkup(await MarginPage({ searchParams: Promise.resolve({ eroare: "marja" }) }));
  expect(html).toContain(GROSS_MARGIN_ERROR);
  expect(html).toContain('data-public-oauth-surface="margin:error"');
  expect(html).toContain('data-test="margin-retry"');
});

it("renders the normal margin state through the canonical contract", async () => {
  const MarginPage = (await import("./page")).default;
  const html = renderToStaticMarkup(await MarginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('data-public-oauth-surface="margin:normal"');
});
