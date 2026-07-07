// Praguri de verdict + mapari scor↔status — SURSA UNICA (spec AUDIT-SPEC.md §6).
// Inainte, pragurile 70/40 erau copiate in ~7 locuri (renderer + engine). Aici traiesc o data.
// Pur: fara retea, fara React. Testabil izolat.

import type { StatusCheck, UxStatus } from "./types";

// Verdict pe scor 0-100: >=70 bun · >=40 de reglat · altfel slab.
export const VERDICT_GOOD = 70;
export const VERDICT_MID = 40;

export type Verdict = "bun" | "de-reglat" | "slab";

export function verdict(score: number): Verdict {
  return score >= VERDICT_GOOD ? "bun" : score >= VERDICT_MID ? "de-reglat" : "slab";
}

// Scor 0-100 -> stare de check (ok/atentie/critic).
export function scoreToStatus(score: number): StatusCheck {
  return score >= VERDICT_GOOD ? "ok" : score >= VERDICT_MID ? "atentie" : "critic";
}

// Scor 0-100 -> stare UX (bun/partial/slab). Necunoscut se decide separat (lipsa datelor).
export function scoreToUxStatus(score: number): Exclude<UxStatus, "necunoscut"> {
  return score >= VERDICT_GOOD ? "bun" : score >= VERDICT_MID ? "partial" : "slab";
}

// Stare de check -> scor numeric, pentru mediere.
export function statusScore(s: StatusCheck): number {
  return s === "ok" ? 100 : s === "atentie" ? 55 : 10;
}
