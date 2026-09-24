import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The report renders in the browser: nothing it imports, directly or through other files, may pull server-only code
// (a report importing the engine once broke the page: playwright-core in the client bundle).
const ROOT = process.cwd();
const SERVER_ONLY = /^(node:|playwright-core$|fs$|child_process$|net$)/;

function resolveLocal(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(from), spec);
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((f) => existsSync(f) && statSync(f).isFile()) ?? null;
}

function serverImports(entry: string): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/^(?!\s*import\s+type\b)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gm)) {
      const spec = m[1];
      if (SERVER_ONLY.test(spec)) found.push(`${path.relative(ROOT, file)} -> ${spec}`);
      else if (spec.startsWith(".") || spec.startsWith("@/")) { const next = resolveLocal(file, spec); if (next) visit(next); }
    }
  };
  visit(entry);
  return found;
}

describe("the report page imports no server-only code", () => {
  it("components/report-deck.tsx and app/r/[id]/page.tsx reach no node: module or playwright", () => {
    expect([...serverImports(path.join(ROOT, "components/report-deck.tsx")), ...serverImports(path.join(ROOT, "app/r/[id]/page.tsx"))]).toEqual([]);
  });
});
