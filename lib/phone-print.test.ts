import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// The phone PDF flows slides across pages, so a row of any table may meet a page edge. dentalview.ro, 2026-09-25:
// the SEO components table (class "perf") had a row cut in two, because the keep-whole rule named "check" rows only.
const css = readFileSync(path.join(process.cwd(), "app/r/report-deck.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const print = css.slice(css.indexOf("@media print"));
const rules = [...print.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(",").map((s) => s.trim()), body: m[2] }));

describe("the phone PDF", () => {
  it("keeps every table row whole, whatever the table", () => {
    const keepsWhole = rules.filter((r) => /break-inside\s*:\s*avoid/.test(r.body)).flatMap((r) => r.selectors);
    expect(keepsWhole).toContain(".deck.phone tr");
  });
});
