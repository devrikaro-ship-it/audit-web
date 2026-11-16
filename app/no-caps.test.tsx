import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

test("the global stylesheet cancels capitals and small caps on every element", () => {
  const css = readFileSync(join(__dirname, "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = css.match(/\*\s*,\s*\*::before\s*,\s*\*::after\s*\{([^}]*)\}/);
  expect(rule?.[1]).toMatch(/text-transform:\s*none\s*!important/);
  expect(rule?.[1]).toMatch(/font-variant-caps:\s*normal\s*!important/);
});
