# Google Ads Reporting Dashboard V2 Sidebar Presentation

## Record purpose

This delivery-run record documents the component before implementation and after verified local completion. It is not a replacement for the immutable reporting standards or the frozen delivery contract. It has no authority to widen the permitted change.

## Inherited component facts

1. `ReportingDashboard` renders the Google Ads report V2 and defaults to the classic presentation. Its alternate shell is selected only by `presentation="sidebar"` and exposes the sidebar marker through `data-report-presentation="sidebar"`.
2. The local V2 witness is `http://127.0.0.1:3128/google-ads/portal/local-fitness-review-v2`. The separate classic control is `http://127.0.0.1:3128/google-ads/portal/local-fitness-review`.
3. Both local routes use the same signed report meaning: fields, values, calculations, period choices, product classifications, group controls, Products columns, Before & after result, and Tracking result.
4. The report-view navigation contains Products, Before & after, and Tracking. It retains accessible tab semantics and keyboard activation.
5. The sidebar Products region is independently vertically scrollable, identified by `data-scroll-region="products"`, and capped at `max-height: 22rem` with `overflow: auto`.
6. Desktop sidebar content and report content are independently usable. At narrow widths, sidebar navigation becomes compact top navigation and remains usable.
7. Tracking evidence uses the protected vocabulary and unavailable states defined by `docs/dev/REPORT-TRACKING-LOCAL-2026-09-09.md`. Historical tracking must not be fabricated.

## Governing baseline

1. Standard: `report-tabs-local`, version `2026-09-09`.
2. Source: `docs/dev/REPORT-TABS-LOCAL-2026-09-09.md`.
3. SHA-256: `22d27011b9bd7482420acbbc8a55be7e3dc70ab1af21e28ac56f300c9e1a510b`.
4. Baseline checks: exact V2/classic route separation, accessible report tabs and keyboard navigation, preserved signed report content and results, capped independently scrollable products, and usable narrow-screen navigation.

## Measured reference visual tokens

| Element | Planned V2 sidebar token |
| --- | --- |
| Base typography | Inter at a 14 px base scale; compact utility hierarchy |
| Workspace | `#F6F8F8` |
| Primary text | `#202B35` |
| Teal selection and success | `#087C72` |
| Teal interactive state | `#08685F` |
| Active surface | `#E8F5F1` |
| Panel | White, `#E5E9EB` border, 10 px radius |
| Desktop sidebar | White, 252 px, 33 px by 22 px padding, no shadow |
| Active navigation row | 46 px high |
| Heading and target area | Compact heading hierarchy and compact white target panel |
| Semantic status colors | Existing muted red for loss/error, teal for success/selection, restrained amber only for existing simulation semantics |

The reference explicitly excludes gradients and decorative shadows.

## Planned closed change scope

Only sidebar-scoped visual classes may change in `app/google-ads/raport/ReportingDashboard.tsx`. Focused regression tests may change only in `app/google-ads/raport/ReportingDashboard.test.tsx`. This document is the sole documentation path for this role.

The intended V2-only outcome is a compact checklist-style workspace, white desktop sidebar, teal active states, bordered white panels, responsive spacing, and replacement of the dark hero with a compact heading and white target panel. No routing, data, formulas, report copy, external service, credential, or classic-presentation change is permitted.

## Frozen semantics and controls

1. The classic route's presentation and behavior remain unchanged.
2. Exact portal-token resolution and V2/classic route separation remain unchanged.
3. Signed source data, fields, values, calculations, copy, classifications, columns, and report meanings remain unchanged.
4. Products, Before & after, and Tracking remain available through click and keyboard controls.
5. The period selector, Before & after result, Tracking result, and capped product scroll behavior remain unchanged.
6. External state remains untouched: no account mutation, collection, credential operation, publication, push, deployment, or external communication.

## Required verification receipts

1. An independent current-state assessment against the governing baseline before implementation.
2. Desktop local-browser comparison of the V2 route, demonstrating every listed visual token, 252 px sidebar, 46 px active row, compact target panel, white bordered 10 px panels, teal active state, and absence of decorative gradients or shadows.
3. Narrow local-browser witness showing compact usable navigation and readable layout.
4. Focused test receipt with a witnessed negative control and passing restoration, covering all three report-view tabs, keyboard activation, product scroll cap, vertical scrolling, tables, classifications, fields, values, formulas, period selector, Before & after, and Tracking.
5. Direct classic-route control proving absence of the sidebar marker and V2 treatment while behavior remains intact.
6. Declared change-impact targeted tests and selected frontend build passing.
7. Independent immutable-revision review approval and independent local verifier result proof in both directions.
8. A scope receipt proving no external mutation, publication, push, deployment, collection, or credential operation occurred.

## Verified local completion

1. Status: verified local completion (PASS).
2. Exact dashboard source candidate: `b25d8ccb3de12424caaffd2c5a0bcc2611155de5`.
3. Evidence revision: `38ca50b8ae57151fbee201780737cee0785ab03f`. The verifier confirmed that the source-to-evidence diff contains only implementation repair receipts and does not alter dashboard source.
4. The implemented visual system is scoped to `.reportV2Sidebar`: Inter at 14 px, the measured workspace, ink, teal, active-surface, panel, sidebar, navigation-row, target-panel, and shadow/gradient exclusions stated above. The classic root remains outside that selector scope.

## Repair history

1. R1 restored Inter for rendered target values, conclusion values, group claims, Before & after and Tracking headings, and summary controls that had explicit Sora declarations.
2. R2 applied the white, `#E5E9EB`-bordered, 10 px-radius panel system to the rendered comparison, Before & after, and Tracking wrappers while preserving table scrolling.
3. R3 preserved target-tile semantics: muted red `#B65357` for warnings, teal `#087C72` for positive states, restrained amber `#A46A16` for unavailable states, and ink `#202B35` for neutral states.
4. R4 set the sidebar brand mark to `#202B35` with a 12 px radius.
5. R5 set the sidebar period action to white with a `#DCE3E4` border, 6 px radius, and `#202B35` text.
6. R6 set V2 target metadata to compact uppercase `#65717A` text on white.
7. R7 set the V2 Before & after range input accent to `#087C72`.

## Automated checks and negative controls

1. The declared bounded focused Vitest command passed: two files and 23 tests.
2. Declared bounded ESLint, strict TypeScript, and `npm run build -- --webpack` checks passed.
3. Negative controls were witnessed and restored: a 253 px sidebar expectation failed before restoration to 252 px; `#087C73` failed before restoration to `#087C72`; a 13 px brand-mark-radius expectation failed before restoration to 12 px. Each failed only the intended assertion while 22 controls passed.
4. Independent immutable-revision review approved the final source candidate and confirmed that all R1–R7 selectors are nested under `.reportV2Sidebar`; `git diff --check` from the frozen base reported no whitespace errors.

## Local verification receipts

1. Desktop reference comparison measured the 14 px Inter base, `rgb(246, 248, 248)` workspace, `rgb(32, 43, 53)` primary text, 252 px white sidebar, `rgb(8, 124, 114)` teal, `rgb(232, 245, 241)` active surface, and white `rgb(229, 233, 235)`-bordered 10 px panels without decorative shadows or gradients.
2. Desktop V2 layout measured a 252 px sidebar with 33 px by 22 px padding, 46 px active navigation rows, a separately usable 1188 px workspace, and a shadow-free white target panel with a 1 px `rgb(229, 233, 235)` border and 10 px radius. The title was 31 px; target metadata was muted `rgb(101, 113, 122)` and the range accent was `rgb(8, 124, 114)`.
3. The Products region retained `display: block`, `overflow: auto`, and `max-height: 352px` (22 rem); `clientHeight` was 352 and `scrollHeight` was 3635. A browser gesture changed `scrollTop` from 0 to 280.
4. Real browser click and keyboard controls activated Before & after, Tracking, then Products; the three tab IDs and `aria-controls` relationships remained present.
5. At 390 by 844, the page had no unintended horizontal overflow (390 px scroll width and client width). The report tablist remained a readable horizontal control with three 46 px rows and a compact 25 px heading.
6. V2 and classic exposed the same labels, period option, product groups and counts (58, 34, 1, 132), columns, product IDs and values, comparison fields, Before & after values, and Tracking content. The classic control had no `data-report-presentation` marker and retained its Arial/white presentation.
7. HTTP controls returned 200 for the classic and V2 witnesses and 404 for `unknown-token-v2`. Browser errors and warnings were empty after interaction.
8. Screenshots: `verification/reference-desktop.png`, `verification/v2-products-desktop.png`, `verification/v2-before-after-desktop.png`, `verification/v2-tracking-desktop.png`, `verification/classic-desktop.png`, and `verification/v2-mobile.png`.
9. The independent verifier performed only local reads, browser interactions, screenshots, and receipt writes. It recorded no external collection, account mutation, publication, push, deployment, email, credential operation, or production operation.

## Evidence sources

1. Implementation and repair receipts: `implementation/implement-result.json`, `implementation/repair-result-r1-r3.json`, and `implementation/repair-result-r4-r7.json`.
2. Check declaration: `implementation/checks.json`.
3. Independent review receipts: `review-final/result.json` and `review-browser-final/result.json`.
4. Independent local result proof: `verification/receipt.json`.

## Documentation status

Reconciled after direct local result proof. This document records only the verified component result and receipts; it does not alter the governing standard, frozen contract, or application scope.
