# Google Ads Web Audit — Rules

## Runtime

The audit runs in the Next.js application at `~/seo-audit`. Do not replace it with local Python,
MCC scripts, GAQL one-liners, or separate collector/report agents.

## Data window and join

1. Product performance covers exactly the latest 365 inclusive account-calendar dates.
2. The end date is today's date in `customer.time_zone`, never the web server's local or UTC date.
3. The catalog query has no date or metric filter. Products with no activity must still enter the
   audit as zero-valued rows.
4. Join catalog and performance by product item ID without duplication.
5. Distinguish all three catalog outcomes. A failed primary product intake renders the alternative
   unavailable page. A failed undated catalog subquery with readable performance keeps the report,
   marks catalog coverage incomplete, and does not report invisible products as zero. A failed
   secondary short-window read is silently omitted from the catalog map.

## Thresholds

1. Break-even ROAS comes from gross margin: `100 / marginPercent`.
2. Gross margin must be a finite numeric value in the inclusive range from 1 through 99 percent.
   Preserve valid decimals exactly. Missing, malformed, non-finite, lower, and higher values are
   refused at the server boundary and cannot be stored as a completed margin or reach the report
   or calculation. A pre-margin session may omit the field until the user submits this step.
3. A valid localized numeric string is normalized to a number before session JSON is signed and
   when a legacy signed session is read. Invalid-present is retained as a signed recovery state;
   it is never collapsed into genuinely missing.
4. The margin form accepts exactly one `marginPct` value. Zero or multiple values are invalid,
   regardless of their order or whether one value would be valid by itself.
5. Every public calculation or projection entry that accepts a margin applies the same rule before
   invoking a formula.
6. The evidence threshold for judging a product is owned by `lib/gads-audit.ts` and must not be
   duplicated in this documentation.

## Classification order

Apply a closed, mutually exclusive classification:

1. Zero impressions → Zero Zombie.
2. Limited evidence plus at least one sale → Sidekick.
3. Limited evidence without a sale → Zombie.
4. Enough evidence and ROAS below break-even → Villain.
5. Enough evidence and ROAS at or above break-even → Hero.

## Tracking gate

Check conversion measurement before presenting product return as truth. If measurement is
unreliable, retain measured spend and product identity but quarantine profitability claims and do
not display product ROAS as a verdict.

## Supporting account checks

1. Fetch tracking, account structure, Performance Max, Standard Shopping, Search campaigns,
   negative keywords, search terms, and annual totals independently. A failed optional read removes
   only the conclusions that depend on it.
2. Describe current failure visibility precisely. Tracking and primary-catalog failures are
   explicit. A specific unavailable search-term view can add a caveat. Structure, PMax, Shopping,
   Search, outer keyword-source, and short-window catalog failures are otherwise silently omitted;
   annual-total failure is logged only on the server.
3. Keep module boundaries explicit: structure, PMax, Shopping, Search, and keyword analyzers own
   their findings; the report combines their outputs but does not invent replacement thresholds.
4. PMax analysis requires both raw PMax data and account structure. Either missing input silently
   removes PMax findings in the current report.
5. Search-term waste uses its stated 30-day window and stays out of the 365-day headline total.
6. Negative keywords are checked against brand and sold-product evidence before being described as
   toxic. A negative is not automatically a defect merely because it exists.
7. Campaign and setting findings describe budget affected, not money already proven wasted.

## Report rules

1. Name the products; counts alone are not a product audit.
2. Order money-bearing findings by measured cost at stake.
3. Keep MEASURED, ESTIMATE, and SIMULATION visually separate.
4. Do not add figures from different time windows.
5. Do not describe implementation thresholds in the client-facing report.
6. Never mutate the connected Google Ads account.
7. Render the product catalog map, account-setting section, unsupported conclusions, and `Cu
   Devrika` simulator CTA only when their source conditions are satisfied.
8. Render the contact form after findings and keep the honesty/caveat section on every successful
   report.
9. Keep simulator output labeled as SIMULATION. It does not enter measured-loss totals and cannot
   claim profit because the user supplies only an approximate margin and offer terms.

## Verification commands

Run from `~/seo-audit`:

```bash
npm test -- lib/gads-audit.test.ts lib/gads-intake.test.ts app/google-ads/raport/page.test.tsx
npm run lint
npm run build
python3 ~/.claude/skills/audit-devrika/audit-google-ads/scripts/check_report_coverage.py \
  --app-root ~/seo-audit \
  --skill-root ~/.claude/skills/audit-devrika/audit-google-ads
```

The rendered report test is mandatory because pure analyzer tests do not prove that product names,
account findings, conditional sections, simulator CTA, contact form, and honesty labels reach the
user.
