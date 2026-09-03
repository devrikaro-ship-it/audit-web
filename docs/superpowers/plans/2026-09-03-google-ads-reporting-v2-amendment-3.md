# Google Ads Reporting V2 — Contract Amendment 3

**Contract:** `2026-09-03-google-ads-reporting-v2.md`

**Recorded:** `2026-09-03T18:47:19Z`

**Approval applied:** STANDING — user said, verbatim, `gata, go cu agentii codex` on 2026-09-03.

## Correction

Point 4 may extend the shared V2 view model and its tests when the renderer needs a decision-bearing presentation state that Point 2 did not expose.

The original file perimeter required React to perform presentation only, but it did not authorize the shared model files needed to supply current-target status and authoritative Romanian copy. Without this correction, the renderer can satisfy the visible design only by duplicating business decisions.

This amendment does not change formulas, classification rules, or report scope. It moves threshold status and customer-facing business copy to the existing authoritative model so every renderer consumes the same answer.

## Done when

The renderer compares no report metric values and derives no displayed count from report arrays. An adversarial hand-built view model controls the rendered target status and quarantined total. Customer-facing model copy uses correct Romanian, while the explicitly approved headers `Volum vanzari` and `Nr. vanzari` remain unchanged.

## Technical appendix

| Contract point | Added allowed path | Verification |
|---|---|---|
| Point 4 | `lib/gads-report-metrics.ts` | Focused model and renderer tests |
| Point 4 | `lib/gads-report-metrics.test.ts` | Negative control for supplied presentation status |
