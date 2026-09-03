import { describe, expect, it } from "vitest";
import { comparisonRanges } from "./gads-report-periods";

describe("comparisonRanges", () => {
  it("builds adjacent inclusive comparison ranges with the same date count", () => {
    expect(comparisonRanges({ from: "2026-08-01", to: "2026-08-31" })).toEqual({
      selected: { from: "2026-08-01", to: "2026-08-31" },
      previous: { from: "2026-07-01", to: "2026-07-31" },
      previousYear: { from: "2025-08-01", to: "2025-08-31" },
    });
  });

  it("preserves selected month and day in the prior calendar year", () => {
    expect(comparisonRanges({ from: "2026-03-10", to: "2026-04-08" }).previousYear).toEqual({
      from: "2025-03-10",
      to: "2025-04-08",
    });
  });

  it("clamps leap-day boundaries to the final valid day of the prior-year month", () => {
    expect(comparisonRanges({ from: "2024-02-29", to: "2024-02-29" }).previousYear).toEqual({
      from: "2023-02-28",
      to: "2023-02-28",
    });
  });

  it.each([
    { from: "2026-08-31", to: "2026-08-01" },
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "08-01-2026", to: "2026-08-31" },
  ])("refuses an invalid selected range: $from through $to", (range) => {
    expect(() => comparisonRanges(range)).toThrow(/report date range/i);
  });
});
