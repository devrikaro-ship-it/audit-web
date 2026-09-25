import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The production build must not reach the network for fonts: a failed Google Fonts fetch failed it (2026-09-25).
// Fonts are served from public/fonts (app/fonts.css, app/r/report-deck.css).
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
});

describe("fonts come from the app", () => {
  it("no file imports next/font/google or a Google Fonts stylesheet", () => {
    const root = process.cwd();
    const offenders = ["app", "components", "lib"].flatMap((d) => files(path.join(root, d)))
      .filter((f) => /next\/font\/google|fonts\.googleapis\.com/.test(readFileSync(f, "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "")))
      .map((f) => path.relative(root, f)).filter((f) => f !== "lib/no-build-time-fonts.test.ts");
    expect(offenders).toEqual([]);
  });

  it("every font file app/fonts.css names exists in public/fonts", () => {
    const css = readFileSync(path.join(process.cwd(), "app/fonts.css"), "utf8");
    const named = [...css.matchAll(/url\(\/fonts\/([^)]+)\)/g)].map((m) => m[1]);
    expect(named.length).toBe(10);
    expect(named.filter((f) => !readdirSync(path.join(process.cwd(), "public/fonts")).includes(f))).toEqual([]);
  });
});
