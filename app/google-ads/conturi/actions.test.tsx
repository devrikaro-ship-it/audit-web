import { beforeEach, expect, it, vi } from "vitest";
import { DEMO_REFRESH_TOKEN } from "@/lib/gads-demo";
import { seal, unseal } from "@/lib/gads-session";

const state = vi.hoisted(() => ({ cookie: "" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: state.cookie }),
    set: (_name: string, value: string) => { state.cookie = value; },
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));
vi.mock("@/lib/gads-demo", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  demoOn: () => true,
}));

const accountSubmission = () => {
  const data = new FormData();
  data.set("customerId", "1234567890");
  data.set("name", "Account");
  return data;
};

beforeEach(() => {
  process.env.GADS_SESSION_SECRET = "account-flow-secret";
  state.cookie = "";
});

it.each(["oauth-refresh", DEMO_REFRESH_TOKEN])("keeps the %s pre-margin account flow normalized through margin submission", async (refreshToken) => {
  state.cookie = seal({ refreshToken, website: "https://shop.example/" });
  const { alegeCont } = await import("./actions");
  await expect(alegeCont(accountSubmission())).rejects.toThrow("REDIRECT /google-ads/marja");
  expect(unseal(state.cookie)).toMatchObject({
    refreshToken,
    website: "https://shop.example/",
    customerId: "1234567890",
    customerTimeZone: "UTC",
  });
  expect(unseal(state.cookie)?.marginPct).toBeUndefined();

  const { salveazaMarja } = await import("../marja/actions");
  const financials = new FormData();
  financials.set("averageOrderValue", "500");
  financials.set("goodsCost", "300");
  await expect(salveazaMarja(financials)).rejects.toThrow("REDIRECT /google-ads/raport");
  expect(unseal(state.cookie)).toMatchObject({ averageOrderValue: 500, goodsCost: 300, breakEvenCpa: 100, breakEvenRoas: 5, marginPct: 40 });
  expect(unseal(state.cookie)?.marginStatus).toBeUndefined();
});

it("preserves an invalid stored margin across account re-selection", async () => {
  state.cookie = seal({ refreshToken: "oauth-refresh", marginStatus: "invalid" });
  const { alegeCont } = await import("./actions");
  await expect(alegeCont(accountSubmission())).rejects.toThrow("REDIRECT /google-ads/marja");
  expect(unseal(state.cookie)?.marginPct).toBeUndefined();
  expect(unseal(state.cookie)?.marginStatus).toBe("invalid");
});

it("keeps the store identity without carrying account financials into a new selection", async () => {
  state.cookie = seal({ refreshToken: "oauth-refresh", website: "https://shop.example/", averageOrderValue: 500, goodsCost: 300 });
  const { alegeCont } = await import("./actions");
  await expect(alegeCont(accountSubmission())).rejects.toThrow("REDIRECT /google-ads/marja");
  expect(unseal(state.cookie)?.website).toBe("https://shop.example/");
  expect(unseal(state.cookie)?.averageOrderValue).toBeUndefined();
  expect(unseal(state.cookie)?.goodsCost).toBeUndefined();
});
