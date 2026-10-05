# Google Ads Web Audit — Proven Patterns

## Inventory the rendered report before describing the product

Treat the report pipeline and its rendered surfaces as separate contracts. Derive every source and
analysis call from the report implementation, then map each one to explicit availability,
dependencies, and failure visibility. Record rendered surfaces as always, conditional, or
alternative without treating a source substring as rendering proof.

Verified by the TypeScript compiler validator behind `scripts/check_report_coverage.py`. The report
consumes one typed execution and rendering contract; the validator follows reachable declarations,
rejects ungoverned platform calls and visible surfaces, and runs the rendered boundary tests.

## Join the full catalog to product performance

Use the full catalog as the population and attach performance from the latest 365 days by product item ID. This
keeps products with no impressions visible and makes the invisible-product share measurable.

Verified by `lib/gads-intake.test.ts`.

## Derive break-even return from margin

Ask for approximate gross margin and derive break-even ROAS. This gives the user an input they can
reasonably know and prevents an invented account target from governing the audit.

Verified by `lib/gads-audit.test.ts` and the margin step in `app/google-ads/marja/`.

## Render the real report in tests

Test the client-facing report component, not a duplicate of its logic. This proves that product
names, classifications, missing-data disclosures, and tracking caveats reach the screen.

Verified by `app/google-ads/raport/page.test.tsx`.
