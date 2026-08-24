import { describe, expect, it } from "vitest";
import { publicOAuthProjection } from "@/lib/gads-public-oauth-contract";
import {
  googleAdsReadCategories,
  projectGoogleAdsReadCategories,
  validateGoogleAdsReadCoverage,
} from "@/lib/gads-read-disclosure";
import { reportSourceReadCategories } from "./report-contract";

describe("Google Ads read disclosure", () => {
  it("covers every category attached to the executable report sources", () => {
    expect(() => validateGoogleAdsReadCoverage(reportSourceReadCategories)).not.toThrow();
    expect(publicOAuthProjection.auditDataCategories)
      .toBe(projectGoogleAdsReadCategories(googleAdsReadCategories));
    for (const category of googleAdsReadCategories) {
      expect(Object.values(reportSourceReadCategories).flat()).toContain(category);
    }
  });

  it("refuses an omitted category and a source without a disclosure", () => {
    const withoutAnnualTotals = Object.fromEntries(
      Object.entries(reportSourceReadCategories).map(([source, categories]) => [
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
    expect(projectGoogleAdsReadCategories(["search-terms"]))
      .toBe("termenii de cautare");
    expect(() => projectGoogleAdsReadCategories(["unknown" as never]))
      .toThrow("Unknown Google Ads read category");
  });
});
