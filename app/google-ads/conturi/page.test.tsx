import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";
import { publicOutputDigest, publicOutputGoldens } from "@/app/public-output-goldens";

const { listAccountsMock, demoOnMock, demoAccountsMock } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(async () => []),
  demoOnMock: vi.fn(() => false),
  demoAccountsMock: vi.fn(() => []),
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
  demoOn: demoOnMock,
  demoAccounts: demoAccountsMock,
}));
vi.mock("./actions", () => ({ alegeCont: async () => {} }));

describe("account selection recovery", () => {
  beforeEach(() => {
    listAccountsMock.mockReset();
    listAccountsMock.mockResolvedValue([]);
    demoOnMock.mockReturnValue(false);
    demoAccountsMock.mockReturnValue([]);
  });
  it("renders the successful picker state through the canonical contract", async () => {
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('data-public-oauth-surface="account-picker:success"');
    expect(publicOutputDigest(html)).toBe(publicOutputGoldens["account-picker:success-zero"]);
  });

  it.each([
    ["one", [{ customerId: "111", name: "Fixture Store", manager: false, currency: "RON", loginCustomerId: "999" }]],
    ["many", [
      { customerId: "111", name: "Fixture Store", manager: false, currency: "RON", loginCustomerId: "999" },
      { customerId: "222", name: "Fixture Manager", manager: true, currency: "EUR", loginCustomerId: "222" },
    ]],
  ])("seals the complete picker text for %s account results", async (count, accounts) => {
    listAccountsMock.mockResolvedValue(accounts);
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(publicOutputDigest(html, accounts.flatMap((account) => [
      { kind: "account" as const, value: account.name },
      { kind: "identifier" as const, value: account.customerId },
      { kind: "identifier" as const, value: account.loginCustomerId },
    ]))).toBe(publicOutputGoldens[`account-picker:success-${count}` as "account-picker:success-one" | "account-picker:success-many"]);
  });

  it("seals the complete demo picker text", async () => {
    const accounts = [{ customerId: "333", name: "Fixture Demo", manager: false, currency: "RON", loginCustomerId: "333" }];
    demoOnMock.mockReturnValue(true);
    demoAccountsMock.mockReturnValue(accounts);
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(publicOutputDigest(html, [
      { kind: "account", value: "Fixture Demo" },
      { kind: "identifier", value: "333" },
    ])).toBe(publicOutputGoldens["account-picker:demo"]);
  });

  it("identifies selected-account data as unavailable after account selection", async () => {
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({
      searchParams: Promise.resolve({ eroare: "cont" }),
    }));
    const explanation = html.match(/data-testid="account-read-error"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(html).toContain('data-error-kind="selected-account-data-unavailable"');
    expect(html).toContain('data-public-oauth-surface="account-picker:account-error"');
    expect(explanation).toBe(GADS_LOCALIZED_COPY.selectedAccountDataReadFailure);
    expect(explanation).not.toBe(GADS_LOCALIZED_COPY.accountListReadFailure);
    expect(html).toContain('href="/api/google-ads/start"');
    expect(publicOutputDigest(html)).toBe(publicOutputGoldens["account-picker:account-error"]);
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
    expect(html).toContain('data-public-oauth-surface="account-picker:list-error"');
    expect(explanation).toBe(GADS_LOCALIZED_COPY.accountListReadFailure);
    expect(publicOutputDigest(html)).toBe(publicOutputGoldens["account-picker:list-error"]);
  });
});
