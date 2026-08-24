import { beforeEach, expect, it, vi } from "vitest";

let marginStatus: "invalid" | undefined;

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  SESSION_COOKIE: "gads_session",
  unseal: () => ({
    refreshToken: "token",
    customerId: "123",
    customerTimeZone: "Europe/Bucharest",
    marginStatus,
    exp: 9e12,
  }),
}));

beforeEach(() => { marginStatus = undefined; });

it("keeps a missing pre-step margin on the normal margin route", async () => {
  const TogetherPage = (await import("./page")).default;
  await expect(TogetherPage()).rejects.toThrow("REDIRECT /google-ads/marja");
});

it("sends an invalid stored margin to the visible recovery state", async () => {
  marginStatus = "invalid";
  const TogetherPage = (await import("./page")).default;
  await expect(TogetherPage()).rejects.toThrow("REDIRECT /google-ads/marja?eroare=marja");
});
