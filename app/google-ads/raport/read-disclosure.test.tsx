import { describe, expect, it } from "vitest";
import { publicOAuthProjection } from "@/lib/gads-public-oauth-contract";
import {
  googleAdsReadCategories,
  projectGoogleAdsReadCategories,
  registeredGoogleAdsReadCategories,
  validateGoogleAdsReadCoverage,
} from "@/lib/gads-read-disclosure";
import { reportSourceReadCategories, validateReportSourceReadCategories } from "./report-contract";

describe("Google Ads read disclosure", () => {
  it("covers every category attached to the executable report sources", () => {
    expect(() => validateGoogleAdsReadCoverage(registeredGoogleAdsReadCategories)).not.toThrow();
    expect(publicOAuthProjection.auditDataCategories)
      .toBe(projectGoogleAdsReadCategories(googleAdsReadCategories));
    for (const category of googleAdsReadCategories) {
      expect(Object.values(registeredGoogleAdsReadCategories).flat()).toContain(category);
    }
    expect(Object.keys(reportSourceReadCategories)).toHaveLength(8);
    expect(() => validateReportSourceReadCategories(reportSourceReadCategories)).not.toThrow();
  });

  it("refuses an omitted category and a source without a disclosure", () => {
    const withoutAnnualTotals = Object.fromEntries(
      Object.entries(registeredGoogleAdsReadCategories).map(([source, categories]) => [
        source,
        categories.includes("annual-account-totals")
          ? ["shopping-product-performance"]
          : categories,
      ]),
    );
    expect(() => validateGoogleAdsReadCoverage(withoutAnnualTotals))
      .toThrow("annual-account-totals");
    expect(() => validateGoogleAdsReadCoverage({ hiddenSource: [] }))
      .toThrow("hiddenSource");
    expect(registeredGoogleAdsReadCategories.listAccounts)
      .toEqual(["accessible-account-metadata"]);
    expect(registeredGoogleAdsReadCategories.fetchCustomerTimeZone)
      .toEqual(["selected-account-time-zone"]);
    expect(projectGoogleAdsReadCategories(["search-terms"]))
      .toBe("termenii de cautare");
    expect(() => projectGoogleAdsReadCategories(["unknown" as never]))
      .toThrow("Unknown Google Ads read category");
    expect(() => validateReportSourceReadCategories({ hiddenSource: ["search-terms"] }))
      .toThrow("hiddenSource");
  });
});
