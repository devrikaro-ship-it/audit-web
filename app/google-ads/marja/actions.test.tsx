import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieSet, seal, redirect, sessionState } = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  seal: vi.fn(() => "sealed"),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }),
  sessionState: { value: { refreshToken: "token", exp: 9e12 } as object | null },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }), set: cookieSet }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  unseal: () => sessionState.value,
  seal,
}));

import { salveazaMarja } from "./actions";

const submission = (averageOrderValues: unknown[], goodsCosts: unknown[]) => {
  const data = new FormData();
  for (const value of averageOrderValues) data.append("averageOrderValue", String(value));
  for (const value of goodsCosts) data.append("goodsCost", String(value));
  return salveazaMarja(data);
};

describe("gross margin server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.value = { refreshToken: "token", exp: 9e12 };
  });

  it("redirects an absent session before reading margin input", async () => {
    sessionState.value = null;
    await expect(submission([500], [250])).rejects.toThrow("REDIRECT /google-ads/connect?eroare=sesiune");
  });

  it.each([undefined, "", "money", "12 RON", "0x10", "1e2", 0, "Infinity"])("refuses invalid AOV %s without sealing it", async (value) => {
    await expect(submission([value], [20])).rejects.toThrow("REDIRECT /google-ads/marja?eroare=financiar");
    expect(seal).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("persists validated break-even economics in the sealed session", async () => {
    await expect(submission([500], [250])).rejects.toThrow("REDIRECT /google-ads/raport");
    expect(seal).toHaveBeenCalledWith(expect.objectContaining({
      averageOrderValue: 500,
      goodsCost: 250,
      marginPct: 50,
      breakEvenCpa: 150,
      breakEvenRoas: 500 / 150,
    }));
    expect(cookieSet).toHaveBeenCalledOnce();
  });

  it("refuses duplicate financial fields independently of order", async () => {
    await expect(submission([500, 600], [250])).rejects.toThrow("REDIRECT /google-ads/marja?eroare=financiar");
    await expect(submission([500], [250, 300])).rejects.toThrow("REDIRECT /google-ads/marja?eroare=financiar");
    expect(seal).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("refuses a goods cost that leaves no contribution for advertising", async () => {
    await expect(submission([500], [400])).rejects.toThrow("REDIRECT /google-ads/marja?eroare=financiar");
    expect(seal).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
