import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => vi.fn());

vi.mock("./net", () => ({ googleAdsSearch: search }));

import { fetchCustomerReportMetadata } from "./gads-oauth";

const auth = {
  accessToken: "access",
  developerToken: "developer",
  loginCustomerId: "manager",
};

describe("fetchCustomerReportMetadata", () => {
  beforeEach(() => search.mockReset());

  it("reads and validates time zone and currency from the selected customer resource", async () => {
    search.mockResolvedValue([{ customer: { timeZone: "Europe/Bucharest", currencyCode: "EUR" } }]);

    await expect(fetchCustomerReportMetadata("123", auth)).resolves.toEqual({
      timeZone: "Europe/Bucharest",
      currencyCode: "EUR",
    });
    expect(search).toHaveBeenCalledWith(
      "123",
      expect.stringMatching(/customer\.time_zone[\s\S]*customer\.currency_code/),
      auth,
    );
  });

  it.each([
    [{ customer: { currencyCode: "EUR" } }, "time zone"],
    [{ customer: { timeZone: "Europe/Bucharest" } }, "currency"],
    [{ customer: { timeZone: "Europe/Bucharest", currencyCode: "ron" } }, "currency"],
  ])("refuses incomplete or invalid selected-account metadata", async (row, expectedMessage) => {
    search.mockResolvedValue([row]);
    await expect(fetchCustomerReportMetadata("123", auth)).rejects.toThrow(expectedMessage);
  });
});
