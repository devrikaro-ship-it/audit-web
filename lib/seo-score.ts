// Scores of the ten SEO components, kept free of the engine so the report (a client component) can import them.
import type { SeoComponent } from "./types";

// Component score: mean of its measured rows; SEO score: mean of the components with a measured row.
export function componentScore(c: SeoComponent): number | null {
  const measured = c.rows.filter((r) => r.total > 0 && !r.verify);
  return measured.length ? Math.round(measured.reduce((s, r) => s + (r.ok / r.total) * 100, 0) / measured.length) : null;
}
export function seoScore(components: SeoComponent[]): number {
  const scores = components.map(componentScore).filter((s): s is number => s !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}
