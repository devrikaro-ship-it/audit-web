import { describe, expect, it } from "vitest";
import { looksBlocked } from "./browser-fetch";

describe("looksBlocked", () => {
  it("is blocked when the homepage does not come back (spishop.ro from the server: 403)", () => {
    expect(looksBlocked(false, "")).toBe(true);
  });
  it("is blocked when the homepage is an anti-bot challenge", () => {
    expect(looksBlocked(true, "<title>Just a moment...</title>")).toBe(true);
  });
  it("is blocked when at least 30% of the pages were refused (invictusmedical.ro: 429s)", () => {
    expect(looksBlocked(true, "<html>shop</html>", [200, 200, 429, 429, 429, 200, 200, 200, 200, 200])).toBe(true);
  });
  it("is not blocked by a few dead pages", () => {
    expect(looksBlocked(true, "<html>shop</html>", [200, 200, 404, 404, 404, 200, 200, 200, 403, 200])).toBe(false);
  });
});
