# Restore Tracking locally

## Existing state

Before & after is independently reviewed and verified at f885912. The current report has Products and Before & after navigation. Generation already collects TrackingState but signed snapshots omit it. The actual saved Fitness report therefore has no tracking evidence. Its original source must remain unchanged.

## Authorized change

Add Tracking as the third report view, preserving the first two. Save an optional validated observation from the existing conversion-configuration read, including its timestamp and explicit collection status. Show actual enabled conversion actions, primary/secondary roles and evidence-backed configuration issues. Missing historical evidence or a failed read is unavailable; a successfully observed empty configuration is a measured issue. Limit any passing claim to the measured goal configuration.

Pass only a closed tracking projection across generation, protected manager and client portal. Preserve signed-snapshot compatibility and HMAC verification. No new provider reads, production operations, email, enrollment, credential changes, deploy or push.

## Verification plan

Use focused behavior tests with witnessed negative controls for historical absence, failed/empty/healthy/problematic observations, malformed fields, new generation persistence and consumer handoff. Independently review the exact candidate, then verify the actual local Fitness report plus explicitly labeled local demo generation/reopening. Exercise desktop/mobile and keyboard navigation. Record implemented state and evidence here after verification.

## Implemented candidate

Revision `aa20d46a1eca7e097068a2c329a43e920b1367e2` adds the third report tab and persists an optional, validated conversion observation from the existing read. Generation, manager and portal use a closed projection. Historical snapshots remain readable and show unavailable tracking. Successfully observed empty configurations remain distinct from failed reads. The panel explicitly describes the limits of conversion-configuration evidence.

Independent code review passed with no findings. The final focused run passed 72 tests, TypeScript and lint. An isolated negative control produced 13 expected failures with 59 passing controls; restoring the exact candidate passed all 72 tests. The successful Webpack build remains eligible because subsequent changes affected only check declarations and test snapshots.

Actual browser evidence covers the original Fitness report, unchanged 225-product categories and monthly simulation, keyboard navigation, and 390-pixel layouts. A separately labeled local demo generated at 2026-09-09T15:00:43.852Z retains the same two conversion actions and observation timestamp when reopened. No real account tracking was recollected. Evidence lives in `.superpowers/sdd/2026-09-09-tracking-tab/`.

Independent final local verification passed at the exact candidate. The actual Fitness portal returned 200, unknown portals returned 404, signed original source and ledger stayed unchanged, and the separately labeled demo reopened the same observation. The verifier also confirmed preserved product figures, simulation, keyboard/mobile behavior, validation and scope restrictions. See `verification/verdict.json` and `verification/local-receipt.json` in the artifact directory. The local report is available at `http://localhost:3128/google-ads/portal/local-fitness-review`. Nothing was deployed or pushed.

The delivery helper still rejects literal Next.js bracket filenames during administrative proof admission. Its existing incident remains recorded in the owning skill registry; no validator bypass or global tooling modification was made. Code and result proof files are preserved without claiming the administrative gate passed.

## Verified local V2 presentation

At source revision `cb9ffcf267d5099fb35355ddca45bbdb71a3ac1e`, `/google-ads/portal/local-fitness-review-v2` adds a separate local presentation while `/google-ads/portal/local-fitness-review` remains unchanged. The V2 route is presentation-only and preserves the same signed report fields, values, calculations, period choices, Products classifications, group controls and columns, Before & after result, and Tracking result. Verified desktop behavior includes a fixed Devrika sidebar, independently scrolling report content, and a capped vertically scrollable Products region. At a narrow viewport, the sidebar becomes compact top navigation; keyboard navigation activates each report view.

Exact-token-first routing prevents suffix aliases. The V2 page uses the sidebar Fitness fallback only when no exact `local-fitness-review-v2` portal population exists, preventing the static route from shadowing an existing classic report. The final independent review and local desktop/mobile browser verification passed at `.superpowers/sdd/2026-09-10-report-design-v2/review-final/verdict.json` and `.superpowers/sdd/2026-09-10-report-design-v2/verification/verdict.json`. This remains local only, with no push or deployment. The known administrative proof-admission defect for literal Next.js bracket filenames remains tooling-only and was not bypassed.

## Inherited translation debt

Inherited Romanian comments and identifiers remain in generation and tracking modules. New fields, copy, tests and comments use English; existing identifiers are not renamed incidentally.
