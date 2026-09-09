# Restore report navigation locally

## Authorized outcome

The operator requested two missing report tabs: Before & after and Tracking. Implement and verify them sequentially on local only. Publication, production writes, Google collection, email, and recurring reporting are excluded. Keep the current English interface and existing product report intact.

## Measured baseline

Revision 23ed883 retains the V2 product report, automatic snapshot persistence, protected saved reports and portal access. ReportingDashboard accepts only a V2 report view. All three consumers discard the rest of the saved snapshot for rendering. ProfitabilitySimulator and gads-product-simulation preserve the older simulation. Historical ReportingDashboard at 2defc7b embedded that simulator, and docs/artifacts/google-ads-reporting-dashboard.html contains a before/after design. The older deployed Romanian renderer at 4b4dfc7 contains only V2 product groups.

The signed snapshot preserves current/optimized monthly equivalents and productAnalysis, while reportV2 contains selected-period totals. These periods must never be compared as if identical. TrackingState is collected during generation but is not persisted in GadsReportSnapshot. Historical records must display tracking as unavailable rather than fabricate a healthy result.

## Point 1: Before & after

Add report-level Products and Before & after tabs. Preserve the four product-category tabs within Products. Present measured baseline and simulated outcome for the same explicit period, with budget, sales, conversions, CPA, ROAS and target-based profit/loss; show assumptions and allow local scenario exploration using the existing model where its inputs are valid. Surface the report through generation, protected manager and client portal. Missing simulation inputs receive an honest unavailable state. Keep all runtime additions inside already reachable report modules unless a properly reviewed inventory amendment is necessary.

## Point 2: Tracking

Point 1 is implemented at f8859125503f83d87fee33c6a9e6e19b894e5137 and independently reviewed and verified locally with PASS. Seventy-one focused tests, TypeScript, lint and the Webpack production build passed. Actual Fitness browser checks cover monthly comparisons, budget changes, keyboard navigation and a 390-pixel viewport. Local HTTP verification proves known-report access, unknown-token refusal, unchanged source and ledger, and no enrollment. Evidence: `.superpowers/sdd/2026-09-09-report-tabs/review/verdict.json` and `verification/verdict.json`. Nothing was published. Administrative proof admission remains blocked by the delivery helper rejecting literal Next.js bracket filenames; the exact error and scoped repair are recorded in `root/governance-path-incident.md`, without modifying that global helper.

Point 2 is implemented and independently reviewed and verified locally at `aa20d46a1eca7e097068a2c329a43e920b1367e2`. Tracking persists the existing conversion observation and displays its timestamp, actions, roles and configuration issues. Historical Fitness tracking is explicitly unavailable. The existing two views remain intact. All 72 focused tests, witnessed negative controls, types, lint, eligible build and real local verification passed. The detailed result is recorded in `REPORT-TRACKING-LOCAL-2026-09-09.md` and `.superpowers/sdd/2026-09-09-tracking-tab/verification/verdict.json`. No deploy or push occurred.

## Verification

Use witnessed failing behavior tests and focused passing controls. Review exact committed revisions independently. Open the real local application with a local copy of the existing Fitness snapshot, verify desktop/mobile and keyboard tab navigation, and preserve product figures, report access, signed integrity and consent behavior. Mark any demo data explicitly. Do not claim deployed results.
