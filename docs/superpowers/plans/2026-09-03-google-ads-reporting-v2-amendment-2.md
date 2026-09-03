# Google Ads Reporting V2 — Contract Amendment 2

**Contract:** `2026-09-03-google-ads-reporting-v2.md`

**Recorded:** `2026-09-03T18:05:14Z`

**Approval applied:** STANDING — user said, verbatim, `gata, go cu agentii codex` on 2026-09-03.

## Correction

Point 3 snapshots must describe only application code committed by the end of Point 3. The approved removal of the duplicate permanent-label section is owned by the V2 renderer in Point 4 and by the final route snapshots in Point 5.

The original Point 3 implementation brief incorrectly required an intermediate snapshot to preserve output from uncommitted Point 4 code. That made Point 3 pass only in a mixed working tree and fail when checked as a frozen revision.

This amendment changes no final interface or product behavior. It makes the component boundaries executable: Point 3 proves data and signed-snapshot compatibility; Point 4 replaces the renderer; Point 5 records the final renderer output in both routes.

## Done when

Point 3 passes its focused suite from its exact committed revision without working-tree overlays. After Point 5, the final snapshots contain no duplicate permanent-label section and match the approved V2 renderer.

## Technical appendix

| Contract point | Ownership clarification | Verification |
|---|---|---|
| Point 3 | Intermediate page snapshots match the committed Point 3 renderer | Run the Point 3 focused suite from a clean archive |
| Point 4 | The V2 renderer contains no duplicate permanent-label section | Run the renderer tests against the committed component |
| Point 5 | Final immediate and portal snapshots contain no duplicate permanent-label section | Run both route suites and search the rendered snapshots for zero duplicate sections |
