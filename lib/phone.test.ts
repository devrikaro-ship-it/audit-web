import { describe, expect, it } from "vitest";
import { withCountryCode } from "./phone";

describe("withCountryCode", () => {
  it("prefixes the chosen country code and drops the trunk zero", () => {
    expect(withCountryCode("+40", "0740 123 456")).toBe("+40 740123456");
    expect(withCountryCode("+44", "7911 123456")).toBe("+44 7911123456");
  });
  it("keeps the number as typed when the code is not valid, and empty stays empty", () => {
    expect(withCountryCode("other", "0740 123 456")).toBe("0740 123 456");
    expect(withCountryCode("+40", "")).toBe("");
  });
});
