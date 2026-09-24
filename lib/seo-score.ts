// The SEO checklist is binary (operator, 2026-09-24): a row is ✓ when every page checked passes, ✗ otherwise, and
// "de verificat" (null) when it could not be measured or confirmed. Scores are the share of ✓ among judged rows.
// Kept free of the engine so the report (a client component) can import it.
import type { SeoComponent, SeoRow } from "./types";

export function rowPass(r: SeoRow): boolean | null {
  return r.total > 0 && !r.verify ? r.ok === r.total : null;
}

const share = (rows: SeoRow[]): number | null => {
  const judged = rows.map(rowPass).filter((p): p is boolean => p !== null);
  return judged.length ? Math.round((judged.filter(Boolean).length / judged.length) * 100) : null;
};

export function componentScore(c: SeoComponent): number | null {
  return share(c.rows);
}
export function seoScore(components: SeoComponent[]): number {
  return share(components.flatMap((c) => c.rows)) ?? 0;
}
