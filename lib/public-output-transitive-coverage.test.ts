import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => ({ implementation: vi.fn() }));

vi.mock("./net", () => ({
  googleAdsSearch: (...args: unknown[]) => search.implementation(...args),
}));

import {
  accessTokenFrom,
  authUrl,
  exchangeCode,
  fetchCustomerTimeZone,
  listAccounts,
  missingConfig,
  oauthConfig,
  validateCustomerTimeZone,
} from "./gads-oauth";
import { fetchShoppingProducts } from "./gads-intake";
import { citesteAn } from "./gads-an";
import { fetchStructura } from "./gads-structure";
import { fetchKeywordData, fetchKeywords } from "./gads-keywords";
import { fetchPmaxData } from "./gads-pmax";
import { fetchSearchData } from "./gads-search";
import { fetchShoppingData } from "./gads-shopping";
import { fetchTracking } from "./gads-tracking";

const auth = { accessToken: "access", developerToken: "developer", loginCustomerId: "root" };

describe("transitive public output helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    search.implementation.mockReset();
    process.env.GADS_OAUTH_CLIENT_ID = "client";
    process.env.GADS_OAUTH_CLIENT_SECRET = "secret";
    process.env.GADS_DEVELOPER_TOKEN = "developer";
    process.env.GADS_REDIRECT_URI = "https://example.test/callback";
    delete process.env.NEXT_PUBLIC_DEMO;
  });

  afterEach(() => vi.unstubAllGlobals());

  it("executes every OAuth configuration and token response outcome", async () => {
    expect(oauthConfig()).toEqual({
      clientId: "client",
      clientSecret: "secret",
      developerToken: "developer",
      redirectUri: "https://example.test/callback",
    });
    expect(authUrl("state")).toContain("state=state");
    expect(missingConfig()).toEqual([]);
    process.env.GADS_DEMO = "1";
    expect(missingConfig()).toEqual([]);
    delete process.env.GADS_DEMO;

    delete process.env.GADS_OAUTH_CLIENT_ID;
    delete process.env.GADS_OAUTH_CLIENT_SECRET;
    delete process.env.GADS_DEVELOPER_TOKEN;
    delete process.env.GADS_REDIRECT_URI;
    expect(missingConfig()).toEqual([
      "GADS_OAUTH_CLIENT_ID",
      "GADS_OAUTH_CLIENT_SECRET",
      "GADS_DEVELOPER_TOKEN",
    ]);
    expect(oauthConfig().redirectUri).toContain("localhost");

    const responses = [
      new Response("failure details", { status: 400 }),
      Response.json({ access_token: "access" }),
      Response.json({ refresh_token: "refresh" }),
      Response.json({ refresh_token: "refresh", access_token: "access" }),
      new Response("", { status: 401 }),
      Response.json({ access_token: "renewed" }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => responses.shift()));
    await expect(exchangeCode("code")).rejects.toThrow("400");
    await expect(exchangeCode("code")).rejects.toThrow("refresh token");
    await expect(exchangeCode("code")).rejects.toThrow("refresh token");
    await expect(exchangeCode("code")).resolves.toEqual({ refreshToken: "refresh", accessToken: "access" });
    await expect(accessTokenFrom("refresh")).rejects.toThrow("401");
    await expect(accessTokenFrom("refresh")).resolves.toBe("renewed");
  });

  it("validates and reads customer time zones", async () => {
    expect(validateCustomerTimeZone("UTC")).toBe("UTC");
    expect(() => validateCustomerTimeZone(undefined)).toThrow("unavailable");
    expect(() => validateCustomerTimeZone("Invalid/Zone")).toThrow("invalid");
    search.implementation.mockResolvedValueOnce([{ customer: { timeZone: "Europe/Bucharest" } }]);
    await expect(fetchCustomerTimeZone("123", auth)).resolves.toBe("Europe/Bucharest");
    search.implementation.mockResolvedValueOnce([]);
    await expect(fetchCustomerTimeZone("123", auth)).rejects.toThrow("unavailable");
  });

  it("enumerates account roots, fallbacks, duplicates, managers, and missing fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      resourceNames: ["customers/100", "customers/200", "customers/", "invalid"],
    })));
    search.implementation
      .mockResolvedValueOnce([
        { customerClient: { id: "1", descriptiveName: "Shop", manager: false, currencyCode: "EUR" } },
        { customerClient: { id: "1", descriptiveName: "Duplicate" } },
        { customerClient: { id: "2", manager: true } },
        { customerClient: {} },
      ])
      .mockRejectedValueOnce(new Error("root unavailable"));
    const accounts = await listAccounts("access");
    expect(accounts).toEqual([
      expect.objectContaining({ customerId: "200", name: "Cont 200", currency: "RON" }),
      expect.objectContaining({ customerId: "1", name: "Shop", currency: "EUR" }),
      expect.objectContaining({ customerId: "2", name: "Cont 2", manager: true, currency: "RON" }),
    ]);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
    await expect(listAccounts("access")).rejects.toThrow("403");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await expect(listAccounts("access")).resolves.toEqual([]);

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ resourceNames: ["customers/300", "customers/300"] })));
    search.implementation
      .mockResolvedValueOnce([{ customerClient: { id: "300", descriptiveName: "Root" } }])
      .mockRejectedValueOnce(new Error("duplicate root unavailable"));
    await expect(listAccounts("access")).resolves.toHaveLength(1);
  });

  it("normalizes complete, incomplete, and sparse shopping responses", async () => {
    search.implementation
      .mockResolvedValueOnce([
        { shoppingProduct: { itemId: "A", title: "Alpha" }, metrics: { costMicros: "1000000", conversionsValue: "5", impressions: "10", clicks: "2", conversions: "1" } },
        { shoppingProduct: {}, metrics: {} },
      ])
      .mockResolvedValueOnce([
        { shoppingProduct: { itemId: "A", categoryLevel1: "category" } },
        { shoppingProduct: {} },
      ]);
    await expect(fetchShoppingProducts("123", auth, "UTC", new Date("2026-01-01T12:00:00Z"))).resolves.toMatchObject({
      catalogComplete: true,
      products: [expect.objectContaining({ productId: "A", title: "Alpha", category: "category" })],
    });

    search.implementation
      .mockResolvedValueOnce([{ shoppingProduct: { itemId: "B" } }])
      .mockRejectedValueOnce(new Error("catalog unavailable"));
    await expect(fetchShoppingProducts("123", auth, "UTC", new Date("2026-01-01T12:00:00Z"), 30)).resolves.toMatchObject({
      catalogComplete: false,
      products: [expect.objectContaining({ productId: "B" })],
    });
  });

  it("executes annual and structure fetch success, fallback, and sparse normalization", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    search.implementation.mockResolvedValueOnce([{ metrics: { costMicros: "12000000", conversionsValue: "24" } }]);
    await expect(citesteAn("123", auth, "UTC")).resolves.toMatchObject({ cost: 12, valoare: 24, roas: 2 });
    search.implementation.mockResolvedValueOnce([]);
    await expect(citesteAn("123", auth, "UTC")).resolves.toBeNull();
    search.implementation.mockRejectedValueOnce(new Error("annual unavailable"));
    await expect(citesteAn("123", auth, "UTC")).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(2);

    search.implementation.mockResolvedValueOnce([
      {
        campaign: {
          name: "Campaign",
          status: "ENABLED",
          primaryStatus: "ELIGIBLE",
          primaryStatusReasons: [],
          advertisingChannelType: "PERFORMANCE_MAX",
          biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
          maximizeConversionValue: { targetRoas: "4" },
          targetRoas: { targetRoas: "3" },
        },
        metrics: { costMicros: "1000000", conversions: "1", conversionsValue: "5" },
      },
      { campaign: {}, metrics: {} },
    ]);
    await expect(fetchStructura("123", auth)).resolves.toMatchObject({ campanii: expect.any(Array), probleme: expect.any(Array) });
  });

  it("normalizes every optional report module and its unavailable source branches", async () => {
    search.implementation
      .mockResolvedValueOnce([{ sharedCriterion: { keyword: { text: "shared" } } }, {}])
      .mockResolvedValueOnce([{ campaignCriterion: { keyword: { text: "campaign" } } }, {}])
      .mockResolvedValueOnce([
        { searchTermView: { searchTerm: "query" }, metrics: { costMicros: "1000000", conversions: "1", clicks: "2" } },
        { searchTermView: {}, metrics: {} },
      ]);
    await expect(fetchKeywordData("123", auth)).resolves.toEqual({
      negative: ["shared", "campaign"],
      termeni: [{ termen: "query", cost: 1, conversii: 1, clicuri: 2 }],
    });
    search.implementation
      .mockRejectedValueOnce(new Error("shared unavailable"))
      .mockRejectedValueOnce(new Error("campaign unavailable"))
      .mockRejectedValueOnce(new Error("terms unavailable"));
    await expect(fetchKeywords("123", auth, [], "Account")).resolves.toMatchObject({ toxice: [] });

    search.implementation
      .mockResolvedValueOnce([
        { campaign: { name: "PMax", brandGuidelinesEnabled: true, assetAutomationSettings: [{ assetAutomationType: "FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION", assetAutomationStatus: "OPTED_IN" }] } },
        { campaign: {} },
      ])
      .mockResolvedValueOnce([
        { assetGroup: { id: "1", name: "Group", status: "ENABLED", primaryStatusReasons: [] }, campaign: { name: "PMax" } },
        { assetGroup: {}, campaign: {} },
      ])
      .mockResolvedValueOnce([
        { assetGroup: { id: "1" }, assetGroupAsset: { fieldType: "HEADLINE" } },
        { assetGroup: { id: "1" }, assetGroupAsset: { fieldType: "DESCRIPTION" } },
        { assetGroup: {}, assetGroupAsset: {} },
      ])
      .mockResolvedValueOnce([{ assetGroupSignal: { assetGroup: "customers/123/assetGroups/1" } }, {}])
      .mockResolvedValueOnce([{ campaign: { name: "PMax" }, campaignCriterion: { keyword: { text: "brand" } } }, {}]);
    await expect(fetchPmaxData("123", auth)).resolves.toMatchObject({
      campanii: [expect.objectContaining({ nume: "PMax", negativeBrand: 1 }), expect.objectContaining({ nume: "(fara nume)" })],
      grupuri: [expect.objectContaining({ id: "1", titluri: 1, descrieri: 1, semnale: 1 }), expect.objectContaining({ id: "" })],
    });

    search.implementation
      .mockResolvedValueOnce([{ campaign: { name: "Search", status: "ENABLED", advertisingChannelSubType: "SEARCH_DYNAMIC_ADS", aiMaxSetting: { enableAiMax: true } } }, {}])
      .mockResolvedValueOnce([{ campaign: { name: "Search", status: "ENABLED", advertisingChannelType: "SEARCH" }, adGroup: { name: "Group", status: "ENABLED" }, adGroupAd: { status: "ENABLED", ad: { type: "RESPONSIVE_SEARCH_AD" } } }, {}])
      .mockResolvedValueOnce([{ campaign: { name: "Search" }, adGroupCriterion: { keyword: { matchType: "BROAD" }, status: "ENABLED" } }, { adGroupCriterion: { keyword: { matchType: "BROAD" }, status: "ENABLED" } }, {}]);
    await expect(fetchSearchData("123", auth)).resolves.toMatchObject({
      campanii: [expect.objectContaining({ nume: "Search", aiMax: true, potrivireLarga: true }), expect.objectContaining({ nume: "(fara nume)" })],
      reclame: [expect.objectContaining({ tip: "RESPONSIVE_SEARCH_AD" }), expect.objectContaining({ tip: "UNKNOWN" })],
    });
    search.implementation.mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error());
    await expect(fetchSearchData("123", auth)).resolves.toEqual({ campanii: [], reclame: [] });

    search.implementation
      .mockResolvedValueOnce([
        { campaign: { name: "Shop", status: "ENABLED", biddingStrategyType: "TARGET_ROAS", advertisingChannelType: "SHOPPING", shoppingSetting: { campaignPriority: 2 } }, campaignBudget: { amountMicros: "1000000" }, metrics: { conversions: "2", costMicros: "3000000" } },
        { campaign: { advertisingChannelType: "SHOPPING" }, campaignBudget: {}, metrics: {} },
        { campaign: { advertisingChannelType: "PERFORMANCE_MAX" }, campaignBudget: {}, metrics: {} },
      ])
      .mockResolvedValueOnce([{}, {}]);
    await expect(fetchShoppingData("123", auth)).resolves.toMatchObject({ produseCuAfisari: 2, conversii30z: 2, cost30z: 3 });
    search.implementation.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error());
    await expect(fetchShoppingData("123", auth)).resolves.toMatchObject({ produseCuAfisari: 0 });

    search.implementation.mockResolvedValueOnce([
      { conversionAction: { name: "Purchase", category: "PURCHASE", primaryForGoal: true } },
      { conversionAction: {} },
    ]);
    await expect(fetchTracking("123", auth)).resolves.toMatchObject({ conversions: [expect.objectContaining({ name: "Purchase" }), expect.objectContaining({ name: "(fara nume)", category: "UNKNOWN", primary: false })] });
  });
});
