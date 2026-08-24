import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "signed-session" }) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/gads-session", () => ({
  SESSION_COOKIE: "gads_session",
  unseal: () => ({ refreshToken: "refresh", exp: 9e12 }),
}));
vi.mock("@/lib/gads-oauth", () => ({
  accessTokenFrom: async () => "access",
  listAccounts: async () => [],
}));
vi.mock("@/lib/gads-demo", () => ({
  demoOn: () => false,
  demoAccounts: () => [],
}));
vi.mock("./actions", () => ({ alegeCont: async () => {} }));

describe("account selection recovery", () => {
  it("renders a visible explanation and retry path for account-data failures", async () => {
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({
      searchParams: Promise.resolve({ eroare: "cont" }),
    }));
    const explanation = html.match(/data-testid="account-read-error"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(explanation.replace(/<[^>]+>/g, "").trim().length).toBeGreaterThan(40);
    expect(html).toContain('href="/api/google-ads/start"');
  });
});
