import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieSet, seal, redirect } = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  seal: vi.fn(() => "sealed"),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }), set: cookieSet }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/gads-session", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  unseal: () => ({ refreshToken: "token", exp: 9e12 }),
  seal,
}));

import { salveazaMarja } from "./actions";

const submission = (value: unknown) => {
  const data = new FormData();
  if (value !== undefined) data.set("marginPct", String(value));
  return salveazaMarja(data);
};

describe("gross margin server boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, "", "margin", "12 percent", "0x10", "1e1", 0, 0.5, 99.5, 100, "Infinity"])("refuses invalid input %s without sealing it", async (value) => {
    await expect(submission(value)).rejects.toThrow("REDIRECT /google-ads/marja?eroare=marja");
    expect(seal).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it.each([1, 28.5, 99])("preserves valid input %s in the sealed session", async (value) => {
    await expect(submission(value)).rejects.toThrow("REDIRECT /google-ads/raport");
    expect(seal).toHaveBeenCalledWith(expect.objectContaining({ marginPct: value }));
    expect(cookieSet).toHaveBeenCalledOnce();
  });
});
