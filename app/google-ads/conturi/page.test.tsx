import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";

const { listAccountsMock } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(async () => []),
}));

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
  listAccounts: listAccountsMock,
}));
vi.mock("@/lib/gads-demo", () => ({
  demoOn: () => false,
  demoAccounts: () => [],
}));
vi.mock("./actions", () => ({ alegeCont: async () => {} }));

describe("account selection recovery", () => {
  it("identifies selected-account data as unavailable after account selection", async () => {
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({
      searchParams: Promise.resolve({ eroare: "cont" }),
    }));
    const explanation = html.match(/data-testid="account-read-error"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(html).toContain('data-error-kind="selected-account-data-unavailable"');
    expect(explanation).toBe(GADS_LOCALIZED_COPY.selectedAccountDataReadFailure);
    expect(explanation).not.toBe(GADS_LOCALIZED_COPY.accountListReadFailure);
    expect(html).toContain('href="/api/google-ads/start"');
  });

  it("keeps technical recovery copy independent from marketing copy", () => {
    const localizedCopy = GADS_LOCALIZED_COPY as {
      accountDataRetention: string;
      selectedAccountDataReadFailure: string;
    };
    const originalMarketingCopy = localizedCopy.accountDataRetention;
    const expectedRecoveryCopy = localizedCopy.selectedAccountDataReadFailure;

    try {
      localizedCopy.accountDataRetention = "Changed marketing copy";
      expect(localizedCopy.selectedAccountDataReadFailure).toBe(expectedRecoveryCopy);
    } finally {
      localizedCopy.accountDataRetention = originalMarketingCopy;
    }
  });

  it("preserves the account-list explanation when listing accounts fails", async () => {
    listAccountsMock.mockRejectedValueOnce(new Error("list failed"));
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({
      searchParams: Promise.resolve({}),
    }));
    const explanation = html.match(/data-testid="account-read-error"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(html).toContain('data-error-kind="account-list-unavailable"');
    expect(explanation).toBe(GADS_LOCALIZED_COPY.accountListReadFailure);
  });
});
