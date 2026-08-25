import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState, normalizeStoreWebsite } from "./gads-website";

describe("Google Ads store website intake", () => {
  it.each([
    ["fitn4ss.ro", "https://fitn4ss.ro/"],
    ["https://shop.example/path", "https://shop.example/path"],
  ])("normalizes a public store URL", (input, expected) => {
    expect(normalizeStoreWebsite(input)).toBe(expected);
  });

  it.each(["", "localhost", "http://127.0.0.1", "ftp://shop.example", "https://user:pass@shop.example"])(
    "rejects a missing, local, credentialed, or unsupported URL",
    (input) => expect(normalizeStoreWebsite(input)).toBeNull()
  );

  it("round-trips the website inside the exact OAuth state", () => {
    const encoded = encodeOAuthState("fixed-nonce", "https://fitn4ss.ro/");
    expect(decodeOAuthState(encoded)).toEqual({ nonce: "fixed-nonce", website: "https://fitn4ss.ro/" });
    expect(decodeOAuthState("not-valid-state")).toBeNull();
  });
});
