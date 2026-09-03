# Google Ads Reporting V2 — Contract Amendment 1

**Contract:** `2026-09-03-google-ads-reporting-v2.md`

**Recorded:** `2026-09-03T17:53:54Z`

**Approval applied:** STANDING — user said, verbatim, `gata, go cu agentii codex` on 2026-09-03.

## Correction

Point 5 owns the existing public-output inventory file in addition to its original file list.

The original contract requires Point 5 to finish with the complete test suite passing, but it did not assign the file that must register newly reachable public modules. Without this correction, the required result is impossible even when the implementation is correct.

This amendment adds no product behavior. It only authorizes Point 5 to register the two modules already observed by the existing public-output boundary test.

## Done when

The public-output boundary test observes and registers the same source list, with each newly reachable reporting module present exactly once, and the complete test suite exits successfully.

## Technical appendix

| Contract point | Added allowed path | Verification |
|---|---|---|
| Point 5 | `app/public-output-reachable-files.json` | `npx vitest run app/public-access-boundary.test.tsx` |

