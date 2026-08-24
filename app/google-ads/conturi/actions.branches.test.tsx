import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { refreshToken: string; marginPct?: number; marginStatus?: "invalid" },
  cookieSet: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }),
  fetchCustomerTimeZone: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }), set: state.cookieSet }),
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/lib/gads-session", () => ({
  SESSION_COOKIE: "session",
  unseal: () => state.session,
  seal: (value: unknown) => JSON.stringify(value),
  cookieOptions: () => ({}),
}));
vi.mock("@/lib/gads-demo", () => ({ demoOn: () => false }));
vi.mock("@/lib/gads-oauth", () => ({
  accessTokenFrom: async () => "access",
  fetchCustomerTimeZone: state.fetchCustomerTimeZone,
  oauthConfig: () => ({ developerToken: "developer" }),
}));

import { alegeCont } from "./actions";

const form = (customerId?: string, loginCustomerId?: string, name?: string) => {
  const data = new FormData();
  if (customerId !== undefined) data.set("customerId", customerId);
  if (loginCustomerId !== undefined) data.set("loginCustomerId", loginCustomerId);
  if (name !== undefined) data.set("name", name);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { refreshToken: "refresh" };
  state.fetchCustomerTimeZone.mockResolvedValue("Europe/Bucharest");
});

it("redirects missing sessions and account identifiers", async () => {
  state.session = null;
  await expect(alegeCont(form("123"))).rejects.toThrow("REDIRECT /google-ads/connect?eroare=sesiune");
  state.session = { refreshToken: "refresh" };
  await expect(alegeCont(form())).rejects.toThrow("REDIRECT /google-ads/conturi");
  await expect(alegeCont(form("letters"))).rejects.toThrow("REDIRECT /google-ads/conturi");
});

it("persists normalized optional account fields through the real time-zone path", async () => {
  await expect(alegeCont(form("123-456", "999-000", ""))).rejects.toThrow("REDIRECT /google-ads/marja");
  expect(state.fetchCustomerTimeZone).toHaveBeenCalledWith("123456", expect.objectContaining({ loginCustomerId: "999000" }));
  expect(JSON.parse(state.cookieSet.mock.calls[0][1])).toMatchObject({ customerId: "123456", customerTimeZone: "Europe/Bucharest" });
  expect(JSON.parse(state.cookieSet.mock.calls[0][1]).customerName).toBeUndefined();

  state.cookieSet.mockClear();
  await expect(alegeCont(form("789"))).rejects.toThrow("REDIRECT /google-ads/marja");
  expect(JSON.parse(state.cookieSet.mock.calls[0][1]).customerName).toBeUndefined();
});

it("renders a recoverable account error when selected-account data is unavailable", async () => {
  state.fetchCustomerTimeZone.mockRejectedValue(new Error("unavailable"));
  await expect(alegeCont(form("123"))).rejects.toThrow("REDIRECT /google-ads/conturi?eroare=cont");
  expect(state.cookieSet).not.toHaveBeenCalled();
});
