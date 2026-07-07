import { describe, it, expect } from "vitest";
import { verdict, scoreToStatus, scoreToUxStatus, statusScore, VERDICT_GOOD, VERDICT_MID } from "./scoring";

describe("scoring — praguri spec §6 (70/40)", () => {
  it("verdict pe granite", () => {
    expect(verdict(70)).toBe("bun");
    expect(verdict(69)).toBe("de-reglat");
    expect(verdict(40)).toBe("de-reglat");
    expect(verdict(39)).toBe("slab");
  });
  it("scoreToStatus mapeaza la ok/atentie/critic", () => {
    expect(scoreToStatus(70)).toBe("ok");
    expect(scoreToStatus(55)).toBe("atentie");
    expect(scoreToStatus(39)).toBe("critic");
  });
  it("scoreToUxStatus mapeaza la bun/partial/slab", () => {
    expect(scoreToUxStatus(70)).toBe("bun");
    expect(scoreToUxStatus(40)).toBe("partial");
    expect(scoreToUxStatus(0)).toBe("slab");
  });
  it("statusScore: ok=100, atentie=55, critic=10", () => {
    expect(statusScore("ok")).toBe(100);
    expect(statusScore("atentie")).toBe(55);
    expect(statusScore("critic")).toBe(10);
  });
  it("constantele sunt cele din spec", () => {
    expect(VERDICT_GOOD).toBe(70);
    expect(VERDICT_MID).toBe(40);
  });
});
