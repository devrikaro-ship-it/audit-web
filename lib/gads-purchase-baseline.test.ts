import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();

vi.mock("./net", () => ({ googleAdsSearch: search }));
vi.mock("./gads-intake", () => ({
  WINDOW_DAYS: 365,
  dateRange: () => ({ from: "2025-08-25", to: "2026-08-25" }),
}));

describe("Purchase baseline reader", () => {
  beforeEach(() => search.mockReset());

  it("reads total spend and Purchase conversions over the same account-calendar dates", async () => {
    search
      .mockResolvedValueOnce([{ metrics: { costMicros: "150000000", conversionsValue: "9999" } }])
      .mockResolvedValueOnce([{ metrics: { conversions: "5", conversionsValue: "2500" } }]);

    const { readPurchaseBaseline } = await import("./gads-an");
    await expect(readPurchaseBaseline("123", { accessToken: "token", developerToken: "dev" }, "Europe/Bucharest"))
      .resolves.toEqual({
        spend: 150,
        purchaseCount: 5,
        purchaseValue: 2500,
        averageOrderValue: 500,
        cpa: 30,
        roas: 2500 / 150,
      });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][1]).toContain("BETWEEN '2025-08-25' AND '2026-08-25'");
    expect(search.mock.calls[1][1]).toContain("BETWEEN '2025-08-25' AND '2026-08-25'");
    expect(search.mock.calls[1][1]).toContain("segments.conversion_action_category = 'PURCHASE'");
  });

  it("returns null when the measured account baseline cannot be read", async () => {
    search.mockRejectedValueOnce(new Error("Google Ads unavailable"));
    const { readPurchaseBaseline } = await import("./gads-an");
    await expect(readPurchaseBaseline("123", { accessToken: "token", developerToken: "dev" }, "UTC"))
      .resolves.toBeNull();
  });
});
