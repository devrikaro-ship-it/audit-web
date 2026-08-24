import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";
import { normalizePublicOutput } from "@/app/public-output-goldens";

const { listAccountsMock, demoOnMock, demoAccountsMock, sessionState } = vi.hoisted(() => ({
  listAccountsMock: vi.fn(async () => []),
  demoOnMock: vi.fn(() => false),
  demoAccountsMock: vi.fn(() => []),
  sessionState: { available: true },
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
  unseal: () => sessionState.available ? ({ refreshToken: "refresh", exp: 9e12 }) : null,
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
    sessionState.available = true;
  });
  it("redirects an absent picker session", async () => {
    sessionState.available = false;
    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT /google-ads/connect?eroare=sesiune");
  });

  it("renders a non-Error account-list failure", async () => {
    listAccountsMock.mockRejectedValue("failure");
    const Page = (await import("./page")).default;
    expect(renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }))).toBeTruthy();
  });
  it("renders the successful picker state through the canonical contract", async () => {
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('data-public-oauth-surface="account-picker:success"');
    expect(normalizePublicOutput(html)).toMatchSnapshot("account-picker:success-zero");
  });

  it.each([
    ["one", [{ customerId: "111", name: "Fixture Store", manager: false, currency: "RON", loginCustomerId: "999" }]],
    ["many", [
      { customerId: "111", name: "Fixture Store", manager: false, currency: "RON", loginCustomerId: "999" },
      { customerId: "222", name: "Fixture Second Store", manager: false, currency: "EUR", loginCustomerId: "888" },
    ]],
  ])("seals the complete picker text for %s account results", async (count, accounts) => {
    listAccountsMock.mockResolvedValue(accounts);
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(normalizePublicOutput(html, accounts.flatMap((account, index) => {
      const form = `root/div[0]/div[0]/div[0]/div[0]/form[${index}]`;
      return [
        { kind: "account" as const, value: account.name, locations: [`${form}/input[1]@value`, `${form}/button[0]/span[0]/span[0]/text`] },
        { kind: "identifier" as const, value: account.customerId, locations: [`${form}/input[0]@value`, `${form}/button[0]/span[0]/span[1]/text`] },
        { kind: "identifier" as const, value: account.loginCustomerId, locations: [`${form}/input[2]@value`] },
      ];
    }))).toMatchSnapshot(`account-picker:success-${count}`);
    expect(html.match(/name="customerId"/g)).toHaveLength(accounts.length);
  });

  it("seals the complete demo picker text", async () => {
    const accounts = [{ customerId: "333", name: "Fixture Demo", manager: false, currency: "RON", loginCustomerId: "333" }];
    demoOnMock.mockReturnValue(true);
    demoAccountsMock.mockReturnValue(accounts);
    const Page = (await import("./page")).default;
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(normalizePublicOutput(html, [
      { kind: "account", value: "Fixture Demo", locations: [
        "root/div[0]/div[0]/div[0]/div[0]/form[0]/input[1]@value",
        "root/div[0]/div[0]/div[0]/div[0]/form[0]/button[0]/span[0]/span[0]/text",
      ] },
      { kind: "identifier", value: "333", locations: [
        "root/div[0]/div[0]/div[0]/div[0]/form[0]/input[0]@value",
        "root/div[0]/div[0]/div[0]/div[0]/form[0]/input[2]@value",
        "root/div[0]/div[0]/div[0]/div[0]/form[0]/button[0]/span[0]/span[1]/text",
      ] },
    ])).toMatchSnapshot("account-picker:demo");
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
    expect(normalizePublicOutput(html)).toMatchSnapshot("account-picker:account-error");
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
    expect(normalizePublicOutput(html)).toMatchSnapshot("account-picker:list-error");
  });
});
