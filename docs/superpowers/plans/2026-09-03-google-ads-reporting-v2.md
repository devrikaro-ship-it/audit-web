# Google Ads Reporting V2 Implementation Contract and Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan one point at a time. Preserve unrelated working-tree changes. Each point uses test-driven development and is complete only after its stated production acceptance test passes.

**Goal:** Replace the dense Google Ads product dashboard with the approved Romanian-language V2 report, backed by one shared reporting calculation layer and compatible with every previously signed report snapshot.

**Architecture:** Add explicit period, currency, source-label, completeness, and comparison data to new signed snapshots while keeping every legacy field optional and readable. A pure reporting layer derives all account and product outcomes once; the immediate report and token-scoped portal pass that same view model to one accessible V2 component modeled on the approved prototype.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript, Vitest 4.1.10, Testing Library, Google Ads GAQL, signed JSON report snapshots, CSS Modules or component-scoped CSS consistent with the existing route.

**Spec:** `docs/superpowers/specs/2026-09-02-google-ads-reporting-v2-design.md`

**Approved prototype:** `.superpowers/brainstorm/38788-1788341823/content/report-v2-metrics.html`

**Approved by the user:** "Da, acesta este, hai sa il implementam"

## Objective

A non-technical store owner can open the immediate or saved Google Ads report and understand, in Romanian, whether the selected period made or lost money against the configured advertising target, how that period compares, and what action each product needs.

## Results

1. The owner can see whether the selected period produced profit or loss against the advertising profitability target, without the report presenting accounting net profit.
2. The owner sees the three largest conclusions first: measured product loss, simulated missed sales volume, and products that still need enough promotion to be judged.
3. Every product remains visible in one of four action tabs, and each tab's count and financial statement reconcile exactly with the summary above it.
4. The selected period can be compared with the previous equivalent period and the same period one year earlier, with unavailable data shown honestly rather than estimated.
5. Previously signed snapshots still open without changing their bytes or signatures; fields they never stored are visibly unavailable.
6. The same V2 report is live in the immediate report and the token-scoped portal, works on desktop and mobile, and changes no Google Ads campaign, budget, bid, label, or setting.

## Model Recommendation

- Task class: `complex`
- Model: `gpt-5.6-sol`
- Reasoning effort: `high`
- Rationale: `Multi-step implementation and debugging need a reliable model with deep reasoning.`
- Catalog source: `codex debug models`
- Catalog checked at: `2026-09-03T16:26:10.805333+00:00`

## Frozen Delivery Handoff

- Repository root: `/Users/VladMoloso/seo-audit`
- Revision inspected: `2defc7b25356e8db208ead8d1463bb909b945d0c`
- Contract path: `/Users/VladMoloso/seo-audit/docs/superpowers/plans/2026-09-03-google-ads-reporting-v2.md`
- Target environment: `https://audit.devrika.ro`
- Money status: no point moves or authorizes advertising money; all Google Ads access remains read-only.
- Existing working-tree changes in `ReportingDashboard.tsx`, `ReportingDashboard.test.tsx`, and the report snapshot are user-owned inputs. Implementers must integrate with their final state and must not discard or overwrite them wholesale.
- Allowed application paths:
  - `lib/gads-report-periods.ts`
  - `lib/gads-report-periods.test.ts`
  - `lib/gads-intake.ts`
  - `lib/gads-intake.test.ts`
  - `lib/gads-oauth.ts`
  - `lib/gads-oauth.test.ts`
  - `lib/gads-session.ts`
  - `lib/gads-session.test.ts`
  - `app/google-ads/conturi/actions.ts`
  - `app/google-ads/conturi/actions.test.tsx`
  - `app/google-ads/conturi/actions.branches.test.tsx`
  - `lib/gads-product-classification.ts`
  - `lib/gads-product-classification.test.ts`
  - `lib/gads-report-metrics.ts`
  - `lib/gads-report-metrics.test.ts`
  - `lib/gads-report-delivery.ts`
  - `lib/gads-report-delivery.test.ts`
  - `lib/gads-demo.ts`
  - `app/google-ads/raport/page.tsx`
  - `app/google-ads/raport/page.test.tsx`
  - `app/google-ads/raport/ReportingDashboard.tsx`
  - `app/google-ads/raport/ReportingDashboard.test.tsx`
  - `app/google-ads/raport/ReportingDashboard.module.css`
  - `app/google-ads/raport/__snapshots__/page.test.tsx.snap`
  - `app/google-ads/portal/[token]/page.tsx`
  - `app/google-ads/portal/[token]/page.test.tsx`
- No database migration is expected: report snapshots are immutable signed files and the added payload is backward-compatible.

## Recorded Defaults

1. Period selection does not gain a new arbitrary date picker. The immediate report keeps the period chosen by its existing server-side report source; the portal keeps selecting only report IDs that belong to its token-scoped signed-snapshot population.
2. Every new snapshot stores the selected period's exact account-calendar `from` and `to` dates. The previous equivalent period is the immediately preceding range with the same number of inclusive dates. The prior-year comparison shifts the selected boundaries back one calendar year, clamping leap-day dates to the last valid day of the target month.
3. The period length comes from the existing configured report window, never from a new client-specific literal. The approved prototype's August figures are visual examples, not production defaults.
4. Account currency comes from Google Ads account metadata and is carried through the signed session and snapshot. A legacy snapshot without currency remains readable and labels monetary units as unavailable; it is never silently treated as RON.
5. The four visible V2 categories are `LOSS_MAKER`, `NOT_PROMOTED`, `UNDERPROMOTED_POTENTIAL`, and `PERFORMER`. The existing audit classification supplies the source label; V2 validates it against the approved rules instead of silently replacing it.
6. A missing or contradictory source classification remains visible as a quarantined row in the closest source tab with the written status `Clasificare indisponibilă`; it is excluded from the tab's business claim and financial total. Legacy `INSUFFICIENT_DATA` rows are quarantined in the insufficient-promotion tab, so the page keeps four tabs and loses no product.
7. The report's `averageClicksPerSale` benchmark is the approved account-level formula, total selected-period clicks divided by total selected-period sales. It is unavailable when sales are zero.
8. A partial catalog keeps every measured row but labels all group totals as partial. It never presents those totals as account-wide.
9. V2 introduces no PDF export and no forecast guarantee. The existing report-delivery PDF pipeline is left untouched unless a compile-time type adjustment is strictly required by the backward-compatible snapshot change.
10. The current CSV action, simulator, campaign view, tracking view, side rail, search, and arbitrary sorting controls are not part of the five-section V2 products report. They do not appear in the V2 report unless the approved design explicitly requires them.
11. Missing comparison periods, missing targets, zero-denominator metrics, and invalid classifications render unavailable states. Zero is shown only when zero was measured.
12. All implementation identifiers and new file prose are English. Romanian appears only in customer-facing copy required by the approved design and in quoted approved source text.

## Global Constraints

- Read the current version of every allowed file before editing it; the inspected tree already contains unrelated uncommitted report changes.
- Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before changing App Router server/client boundaries.
- Add no client name, account ID, target, period, currency, threshold, URL, or product value to production code.
- Use one authoritative target source for both calculations and display. Do not duplicate configured ROAS or CPA values in V2 state.
- Derive every displayed summary, comparison cell, tab total, and product result through the shared reporting layer.
- Preserve snapshot signature verification and the exact successful decoding of old snapshots.
- Keep all Google Ads calls read-only. No campaign or account mutation is in scope.
- Use the approved business terms `Volum vanzari` for conversion value and `Nr. vanzari` for conversions everywhere the owner reads the report.
- Keep the existing token-scoped portal selection boundary: a requested report outside the portal token population must not render.
- Every new test must be observed failing before implementation, then passing after implementation. Reintroduce the behavior defect and observe the test fail before restoring the correct code.
- A point is not complete on a branch. After deployment, run its observable acceptance test against `https://audit.devrika.ro` and retain the request, response, rendered value, or screenshot as evidence.

---

## Point 1 — Authoritative report periods and account currency

**Context:** The report already queries Google Ads using the selected account's calendar time zone and stores a signed session before rendering.

**Problem:** The snapshot does not record exact period boundaries or account currency, so V2 cannot prove its comparison windows and currently formats every account as RON.

**Today:** `GadsSession` stores `customerTimeZone` but no currency. `GadsReportSnapshot` stores `evidenceMonths` but no `from` or `to`. The dashboard's money formatter appends `RON` unconditionally.

**Fix:** Read time zone and ISO currency code from the selected Google Ads account, store both in the signed session, derive three exact comparison ranges from the selected range, and expose an exact-range Shopping reader without changing the existing latest-window reader.

**Dependencies:** None.

**Target environment:** `https://audit.devrika.ro`.

**Acceptance test:** On production with a read-only connected account, the rendered period boundaries match the account-calendar dates and every monetary value uses the account's Google Ads currency. A planted leap-day selected period yields valid prior-year dates locally. A planted invalid or absent currency is refused or rendered unavailable and never becomes RON.

**Files:**

- Create: `lib/gads-report-periods.ts`
- Create: `lib/gads-report-periods.test.ts`
- Modify: `lib/gads-intake.ts`
- Modify: `lib/gads-intake.test.ts`
- Modify: `lib/gads-oauth.ts`
- Modify: `lib/gads-oauth.test.ts`
- Modify: `lib/gads-session.ts`
- Modify: `lib/gads-session.test.ts`
- Modify: `app/google-ads/conturi/actions.ts`
- Modify: `app/google-ads/conturi/actions.test.tsx`
- Modify: `app/google-ads/conturi/actions.branches.test.tsx`

**Interfaces:**

```ts
export type ReportDateRange = {
  from: string;
  to: string;
};

export type ReportPeriodRanges = {
  selected: ReportDateRange;
  previous: ReportDateRange;
  previousYear: ReportDateRange;
};

export function comparisonRanges(selected: ReportDateRange): ReportPeriodRanges;

export type CustomerReportMetadata = {
  timeZone: string;
  currencyCode: string;
};

export async function fetchCustomerReportMetadata(
  customerId: string,
  auth: GoogleAdsAuth,
): Promise<CustomerReportMetadata>;

export async function fetchShoppingProductsForRange(
  customerId: string,
  auth: GoogleAdsAuth,
  customerTimeZone: string,
  range: ReportDateRange,
): Promise<{ products: Product[]; catalogComplete: boolean }>;
```

- [ ] **Step 1: Inspect the current state and preserve active edits**

Run:

```bash
git status --short
git diff -- lib/gads-intake.ts lib/gads-oauth.ts lib/gads-session.ts app/google-ads/conturi/actions.ts
```

Record any pre-existing changes and integrate around them.

- [ ] **Step 2: Write failing range, currency, and session tests**

Add tests that require inclusive adjacent ranges, prior-year month/day preservation, leap-day clamping, exact GAQL boundaries, ISO currency validation, and currency survival through the real seal/unseal path.

```ts
expect(comparisonRanges({ from: "2026-08-01", to: "2026-08-31" })).toEqual({
  selected: { from: "2026-08-01", to: "2026-08-31" },
  previous: { from: "2026-07-01", to: "2026-07-31" },
  previousYear: { from: "2025-08-01", to: "2025-08-31" },
});

expect(comparisonRanges({ from: "2024-02-29", to: "2024-02-29" }).previousYear)
  .toEqual({ from: "2023-02-28", to: "2023-02-28" });
```

- [ ] **Step 3: Run the RED tests**

```bash
npx vitest run lib/gads-report-periods.test.ts lib/gads-intake.test.ts lib/gads-oauth.test.ts lib/gads-session.test.ts app/google-ads/conturi/actions.test.tsx app/google-ads/conturi/actions.branches.test.tsx
```

Expected: FAIL because the range builder, exact-range reader, currency metadata, and session field do not exist.

- [ ] **Step 4: Implement the minimum authoritative input layer**

Use `customer.time_zone` and `customer.currency_code` from the selected account. Validate the time zone through the existing validator and require `/^[A-Z]{3}$/` for currency. Make `fetchShoppingProducts` delegate to the exact-range reader so the catalog/performance join remains one implementation.

- [ ] **Step 5: Run the GREEN tests**

Run the Step 3 command. Expected: all focused tests pass.

- [ ] **Step 6: Run the negative control**

Temporarily restore the RON fallback or make `previous.to` overlap `selected.from`. Run the focused test that governs that branch and confirm it fails. Restore the implementation and rerun the full Step 3 command green.

- [ ] **Step 7: Commit the point**

```bash
git add lib/gads-report-periods.ts lib/gads-report-periods.test.ts lib/gads-intake.ts lib/gads-intake.test.ts lib/gads-oauth.ts lib/gads-oauth.test.ts lib/gads-session.ts lib/gads-session.test.ts app/google-ads/conturi/actions.ts app/google-ads/conturi/actions.test.tsx app/google-ads/conturi/actions.branches.test.tsx
git commit -m "feat: add authoritative Google Ads report periods"
```

---

## Point 2 — One reporting layer for formulas, labels, totals, and unavailable states

**Context:** V2 repeats the same figures in the headline, three conclusion cards, comparison table, tab headers, and product rows.

**Problem:** The current component calculates label totals and profit directly while the classifier calculates financial impact separately. That allows two visible copies of the same claim to disagree.

**Today:** Product loss uses one field, card profit uses another formula, the opportunity calculation estimates one product at a time, and the existing classifier uses a median traffic benchmark rather than the approved account-level average.

**Fix:** Create one pure view-model builder that calculates every core metric, period result, product result, group total, missed-sales simulation, completeness state, and classification diagnostic from snapshot inputs.

**Dependencies:** Point 1.

**Target environment:** `https://audit.devrika.ro`.

**Acceptance test:** On production, each of the three conclusion cards equals its corresponding selected tab. The selected-period and product profit/loss figures match the approved formulas when recomputed from the displayed spend, sales volume, sales count, and target. A planted contradictory source label produces `Clasificare indisponibilă`, creates one diagnostic, and contributes nothing to the business total.

**Files:**

- Modify: `lib/gads-product-classification.ts`
- Modify: `lib/gads-product-classification.test.ts`
- Create: `lib/gads-report-metrics.ts`
- Create: `lib/gads-report-metrics.test.ts`

**Interfaces:**

```ts
export type V2ProductLabel =
  | "LOSS_MAKER"
  | "NOT_PROMOTED"
  | "UNDERPROMOTED_POTENTIAL"
  | "PERFORMER";

export type ReportMetric<T> =
  | { status: "AVAILABLE"; value: T }
  | { status: "UNAVAILABLE"; reason: string };

export type ReportPeriodInput = {
  range: ReportDateRange;
  spend: number;
  salesVolume: number;
  numberOfSales: number;
};

export type ReportProductInputV2 = ReportProductInput & {
  sourceLabel?: V2ProductLabel | "INSUFFICIENT_DATA";
};

export function buildGoogleAdsReportV2(
  input: GoogleAdsReportV2Input,
): GoogleAdsReportV2ViewModel;
```

The view model must carry, without recomputation in React:

- selected, previous, and previous-year rows with budget, sales volume, number of sales, CPA, ROAS, and profit/loss;
- the four target values/statuses and the plain-language account headline;
- three primary conclusions linked by group key to tab totals;
- exactly four tab groups, with valid rows, quarantined rows, totals, benchmark, explanation, and empty state;
- `classificationDiagnostics`, `productPopulationStatus`, and explicit measured/simulated/unavailable labels.

- [ ] **Step 1: Write hand-calculated RED tests**

Use the approved example and an adversarial mixed population:

```ts
expect(periodResult({ spend: 14950, salesVolume: 44850, numberOfSales: 31 }, 4))
  .toMatchObject({ profitOrLoss: -3737.5, displayAmount: -3738 });

expect(productLoss({ spend: 5400, salesVolume: 9800 }, 4)).toBe(2950);

expect(missedSalesVolume({
  lossProductSpend: 10860,
  opportunitySpend: 1115,
  opportunitySalesVolume: 7860,
})).toBeCloseTo(76589.42, 2);
```

Also assert zero denominators, missing targets, missing comparisons, zero-product groups, partial catalogs, four-way exclusivity, source-label validity, weighted opportunity ROAS, and exact card-to-tab equality.

The source-label validity matrix must exercise all four directions: opportunity requires at least one sale and ROAS at or above target; insufficient promotion requires zero sales and clicks below the account benchmark; loss requires measurable spend and negative financial result; profitable requires non-negative financial result and enough source evidence to leave the insufficient-promotion groups.

- [ ] **Step 2: Run the RED tests**

```bash
npx vitest run lib/gads-product-classification.test.ts lib/gads-report-metrics.test.ts
```

Expected: FAIL because the V2 metric status and view-model builder do not exist and the current traffic benchmark is different.

- [ ] **Step 3: Implement the pure V2 reporting layer**

Implement the approved formulas exactly:

```ts
const roas = spend > 0 ? salesVolume / spend : null;
const cpa = numberOfSales > 0 ? spend / numberOfSales : null;
const averageClicksPerSale = numberOfSales > 0 ? clicks / numberOfSales : null;
const profitOrLoss = minimumRoasTarget > 0
  ? salesVolume / minimumRoasTarget - spend
  : null;
const productLoss = minimumRoasTarget > 0
  ? spend - salesVolume / minimumRoasTarget
  : null;
const weightedOpportunityRoas = opportunitySpend > 0
  ? opportunitySalesVolume / opportunitySpend
  : null;
const missedSalesVolume = weightedOpportunityRoas === null
  ? null
  : lossProductSpend * weightedOpportunityRoas;
```

Round only display amounts. Keep raw values available for totals and tests. Never turn `null` into zero.

- [ ] **Step 4: Run the GREEN tests**

Run the Step 2 command. Expected: all focused tests pass.

- [ ] **Step 5: Run negative controls in both directions**

Temporarily sum loss-product spend instead of product loss and confirm the approved example test fails. Then temporarily accept an opportunity with zero sales and confirm the validity test fails. Restore both defects and rerun the complete Step 2 command green.

- [ ] **Step 6: Commit the point**

```bash
git add lib/gads-product-classification.ts lib/gads-product-classification.test.ts lib/gads-report-metrics.ts lib/gads-report-metrics.test.ts
git commit -m "feat: centralize Google Ads V2 report metrics"
```

---

## Point 3 — Versioned signed snapshots and complete live data

**Context:** The immediate route seals a report snapshot; the contact flow stores those exact signed bytes; the portal later verifies and opens them.

**Problem:** New snapshots lack currency, exact ranges, comparison totals, source labels, and completeness metadata. Requiring those fields at the top level would invalidate every already signed snapshot.

**Today:** `openReportSnapshot` accepts optional V1 traffic and product fields, the current route reads one primary product period, and old snapshots can contain only loss/opportunity excerpts.

**Fix:** Add an optional versioned V2 payload, populate it from three read-only exact-range queries plus the existing classification output, and preserve the V1 validator and fallback path byte-for-byte.

**Dependencies:** Points 1 and 2.

**Target environment:** `https://audit.devrika.ro`.

**Acceptance test:** On production, a newly generated signed report contains exact selected/previous/prior-year ranges, account currency, complete selected-period products, source labels, and completeness state. An older production snapshot still opens through its original portal link and renders unavailable comparison/currency fields without a crash or invented value. A modified signed payload remains rejected.

**Files:**

- Modify: `lib/gads-report-delivery.ts`
- Modify: `lib/gads-report-delivery.test.ts`
- Modify: `lib/gads-demo.ts`
- Modify: `app/google-ads/raport/page.tsx`
- Modify: `app/google-ads/raport/page.test.tsx`
- Modify: `app/google-ads/raport/__snapshots__/page.test.tsx.snap`

**Interfaces:**

```ts
export type GadsReportSnapshotV2 = {
  version: 2;
  currencyCode: string;
  periods: {
    selected: ReportPeriodInput;
    previous: ReportPeriodInput | null;
    previousYear: ReportPeriodInput | null;
  };
  products: ReportProductInputV2[];
  productPopulationStatus: "COMPLETE" | "PARTIAL";
  classificationDiagnostics: ClassificationDiagnostic[];
};

export type GadsReportSnapshot = {
  // Existing V1 fields remain unchanged.
  reportV2?: GadsReportSnapshotV2;
};
```

- [ ] **Step 1: Inspect signed-snapshot and route diffs before editing**

```bash
git diff -- lib/gads-report-delivery.ts app/google-ads/raport/page.tsx app/google-ads/raport/page.test.tsx app/google-ads/raport/__snapshots__/page.test.tsx.snap
```

Preserve every unrelated active change and keep the signature algorithm unchanged.

- [ ] **Step 2: Write RED tests for V2 round-trip and V1 compatibility**

Tests must prove:

- an unchanged old V1 fixture seals and opens to exactly the same object;
- a complete V2 payload round-trips;
- invalid date order, invalid currency, duplicate product IDs, non-finite totals, and more than the existing product safety limit are refused;
- modifying either V1 or V2 payload bytes invalidates the signature;
- three Google Ads reads receive exactly the ranges from Point 1;
- a failed comparison read becomes `null`, not a fabricated zero row;
- the source labels cover every selected-period product once;
- demo data is visibly simulated and uses the same V2 contract.

- [ ] **Step 3: Run the RED tests**

```bash
npx vitest run lib/gads-report-delivery.test.ts app/google-ads/raport/page.test.tsx
```

Expected: FAIL because `reportV2` and the comparison reads do not exist.

- [ ] **Step 4: Implement additive snapshot validation and route assembly**

Keep V1 fields and `openReportSnapshot` fallback behavior. New snapshots add `reportV2`; old snapshots do not get rewritten or re-signed. Fetch the selected, previous, and previous-year ranges concurrently through the existing read wrapper. Only selected-period failure keeps the existing report-unavailable behavior; either comparison failure writes `null`.

- [ ] **Step 5: Run the GREEN tests**

Run the Step 3 command. Expected: all focused tests and snapshots pass.

- [ ] **Step 6: Run the mandatory legacy negative control**

Temporarily make `reportV2` required in `validSnapshot`. Run the old-fixture test and confirm it fails. Restore optional validation and rerun the complete Step 3 command green.

- [ ] **Step 7: Commit the point**

```bash
git add lib/gads-report-delivery.ts lib/gads-report-delivery.test.ts lib/gads-demo.ts app/google-ads/raport/page.tsx app/google-ads/raport/page.test.tsx app/google-ads/raport/__snapshots__/page.test.tsx.snap
git commit -m "feat: store backward-compatible Google Ads V2 snapshots"
```

---

## Point 4 — Approved five-section Romanian V2 report

**Context:** The current shared dashboard is a dense English operational table. The approved V2 prototype replaces it with a plain-language Romanian business report.

**Problem:** The current page has a side rail, seven KPI cards, duplicate financial summaries, search and sort controls, an all-products tab, and English copy. It does not show the required three-period comparison.

**Today:** `ReportingDashboard.tsx` is over one thousand lines and derives financial values inside React. Its default tab is all products, not loss, and it exposes five product labels rather than the approved four action groups.

**Fix:** Render the exact five-section V2 hierarchy from the shared view model: brand header, account conclusion with four target tiles, three primary conclusions, three-row comparison, and four accessible action tabs with one complete product table.

**Dependencies:** Points 2 and 3.

**Target environment:** `https://audit.devrika.ro`.

**Acceptance test:** The production report is Romanian, follows the approved section order, opens the loss tab, switches all four tabs without navigation, and shows every selected-period product once. Desktop and mobile screenshots show no clipped labels, hidden table columns, duplicated category summaries, or color-only status. Each target, conclusion, comparison cell, and tab amount matches the shared view model.

**Files:**

- Modify: `app/google-ads/raport/ReportingDashboard.tsx`
- Modify: `app/google-ads/raport/ReportingDashboard.test.tsx`
- Create: `app/google-ads/raport/ReportingDashboard.module.css` only if the final current file has no existing extracted stylesheet

**Interfaces:**

```ts
export default function ReportingDashboard({
  report,
  periodSelector,
  demo,
}: {
  report: GoogleAdsReportV2ViewModel;
  periodSelector?: PeriodSelector;
  demo?: boolean;
}): React.ReactElement;
```

- [ ] **Step 1: Re-read the approved artifact and active dashboard diff**

```bash
git diff -- app/google-ads/raport/ReportingDashboard.tsx app/google-ads/raport/ReportingDashboard.test.tsx
sed -n '1438,1635p' .superpowers/brainstorm/38788-1788341823/content/report-v2-metrics.html
```

Use the prototype for visual hierarchy and the design document for scope. Do not bring the prototype's separate campaign or tracking panels into this point.

- [ ] **Step 2: Write semantic RED interaction tests**

Test visible Romanian copy and roles rather than implementation-only class names. Require:

- `DEVRIKA`, the selected period, and a visible read-only statement;
- four tiles in this order: `ROAS actual`, `ROAS minim`, `CPA actual`, `CPA maxim`;
- one plain-language account conclusion, warning color on current values that miss target, and positive color on target values;
- exactly three primary conclusion cards;
- comparison columns in the approved seven-column order and rows in the approved three-row order;
- exactly four tabs, `LOSS_MAKER` selected by default;
- keyboard ArrowLeft/ArrowRight/Home/End navigation, visible focus, `aria-selected`, `aria-controls`, and matching tabpanel IDs;
- every row and all nine product columns in the approved order;
- each tab's product count, relevant measured or simulated amount, plain-language explanation, and clicks-per-sale benchmark when meaningful;
- explicit `Profit`, `Pierdere`, `Simulare`, and `Indisponibil` text alongside color;
- measured spend, sales volume, and sales count remain visible when a target is missing and the profitability claim is unavailable;
- zero-product, missing-target, missing-comparison, partial-data, zero-denominator, and quarantined-classification states;
- two-column mobile targets, stacked conclusion cards, horizontally scrollable tabs and table, with no removed column.
- numeric headers remain associated with their cells through native table semantics and `scope="col"`.

- [ ] **Step 3: Run the RED component tests**

```bash
npx vitest run app/google-ads/raport/ReportingDashboard.test.tsx
```

Expected: FAIL against the dense English V1 dashboard.

- [ ] **Step 4: Build the minimum approved V2 component**

Render only values supplied by `GoogleAdsReportV2ViewModel`. Keep formatting helpers currency-aware through `Intl.NumberFormat("ro-RO", { style: "currency", currency })`. When currency is unavailable, render the numeric value plus the written unavailable-currency status without supplying a currency code.

- [ ] **Step 5: Run the GREEN component tests**

Run the Step 3 command. Expected: all V2 component tests pass.

- [ ] **Step 6: Perform visual and interaction checks locally**

Run the app and capture the real component at 1440 by 1000 and 390 by 844. Compare section order, spacing, target grid, card hierarchy, tab treatment, and table overflow to the approved prototype. Exercise all four tabs with keyboard and pointer input.

- [ ] **Step 7: Run the negative controls**

Temporarily make the profitable tab reuse the loss total and confirm the reconciliation test fails. Then hide the last table column at the mobile breakpoint and confirm the responsive test or screenshot check fails. Restore both defects and rerun Step 3 green.

- [ ] **Step 8: Commit the point**

```bash
git add app/google-ads/raport/ReportingDashboard.tsx app/google-ads/raport/ReportingDashboard.test.tsx app/google-ads/raport/ReportingDashboard.module.css
git commit -m "feat: render the approved Google Ads V2 report"
```

If no CSS module was created, omit it from `git add`; do not create an empty file to satisfy the command.

---

## Point 5 — One V2 renderer in the immediate report and signed portal

**Context:** The report is shown immediately after the read-only audit and later through a token-scoped portal that can select among signed monthly reports.

**Problem:** The two routes currently pass V1 snapshots and labels into the shared component, and old portal snapshots lack V2 comparison inputs.

**Today:** The immediate route creates a fresh signed snapshot. The portal verifies each stored snapshot, selects only a report in the token population, and reconstructs legacy product analysis when required.

**Fix:** Build the V2 view model at the route boundary for both paths, preserve token scoping and report-ID selection, and apply the documented unavailable fallback to legacy snapshots.

**Dependencies:** Points 3 and 4.

**Target environment:** `https://audit.devrika.ro`.

**Acceptance test:** On production, the immediate authenticated report and the selected portal report render the same five-section V2 semantics from their signed snapshot. Selecting another allowed report changes the selected period and values; requesting a foreign report ID still falls back safely. An older signed portal report opens with honest unavailable states and no PDF iframe or new export.

**Files:**

- Modify: `app/google-ads/raport/page.tsx`
- Modify: `app/google-ads/raport/page.test.tsx`
- Modify: `app/google-ads/raport/__snapshots__/page.test.tsx.snap`
- Modify: `app/google-ads/portal/[token]/page.tsx`
- Modify: `app/google-ads/portal/[token]/page.test.tsx`

**Interfaces:**

- Consumes `openReportSnapshot`, `buildGoogleAdsReportV2`, and the existing token-scoped `listPortalReports` result.
- Produces one `ReportingDashboard` call shape in both routes.
- Keeps `productAnalysisFromSnapshot` only where the existing delivery pipeline still needs the simulator; it is not a source for V2 comparisons or full-population totals.

- [ ] **Step 1: Write route-level RED tests**

Add immediate-route tests for the three exact query ranges, currency, section order, and card/tab reconciliation. Add portal tests with two allowed reports, one foreign ID, one V2 snapshot, and one legacy snapshot.

- [ ] **Step 2: Run the RED route tests**

```bash
npx vitest run app/google-ads/raport/page.test.tsx 'app/google-ads/portal/[token]/page.test.tsx'
```

Expected: FAIL because the routes do not yet construct the shared V2 view model or legacy unavailable rows.

- [ ] **Step 3: Wire both routes to the same view model and renderer**

Keep the portal's `reports.find(...) ?? latest` selection and signature verification. Remove route-owned duplicate headings around the dashboard so the five-section V2 page is not nested inside a second visual report shell.

- [ ] **Step 4: Run the GREEN route tests**

Run the Step 2 command. Expected: both route files pass.

- [ ] **Step 5: Run the boundary negative controls**

Temporarily select the raw requested report ID without checking the token-scoped list and confirm the foreign-report test fails. Then replace a legacy comparison's unavailable state with zero and confirm the legacy test fails. Restore both protections and rerun Step 2 green.

- [ ] **Step 6: Run the five-component local acceptance gate**

```bash
npx vitest run lib/gads-report-periods.test.ts lib/gads-intake.test.ts lib/gads-oauth.test.ts lib/gads-session.test.ts app/google-ads/conturi/actions.test.tsx app/google-ads/conturi/actions.branches.test.tsx lib/gads-product-classification.test.ts lib/gads-report-metrics.test.ts lib/gads-report-delivery.test.ts app/google-ads/raport/ReportingDashboard.test.tsx app/google-ads/raport/page.test.tsx 'app/google-ads/portal/[token]/page.test.tsx'
npm test
npm run lint
npm run build
```

Expected: every command exits zero. Stop before any sixth implementation component; deploy and verify the five completed components.

- [ ] **Step 7: Commit the point**

```bash
git add app/google-ads/raport/page.tsx app/google-ads/raport/page.test.tsx app/google-ads/raport/__snapshots__/page.test.tsx.snap 'app/google-ads/portal/[token]/page.tsx' 'app/google-ads/portal/[token]/page.test.tsx'
git commit -m "feat: share Google Ads V2 across report routes"
```

---

## Point 6 — Production deployment and live proof of every result

**Context:** A report that passes locally but is absent from the live site has not delivered any of the approved outcomes.

**Problem:** The V1 plan explicitly excluded deployment, while this contract requires the V2 result to reach production and be tested there.

**Today:** Production is `https://audit.devrika.ro`; the repository carries `docs/deploy-checks.audit-web.conf`, an official Coolify API deployment path is documented, and this project has no database migration directory.

**Fix:** Synchronize with `origin/main`, rerun all checks on the exact outgoing revision, push normally, deploy through the existing Coolify API, poll the deployment to a terminal success state, check live logs, and verify all six contract results on the running application.

**Dependencies:** Points 1, 2, 3, 4, and 5.

**Target environment:** `https://audit.devrika.ro`.

**Acceptance test:** The Coolify deployment reports success for the exact pushed revision; the production report returns the expected authenticated behavior; no new fatal application errors appear after deployment; and the production evidence matrix below has six PASS verdicts and zero unverified rows. If any live behavior fails, restore the previous known-good revision before repairing locally.

**Files:**

- Read: `docs/deploy-checks.audit-web.conf`
- Read: `docs/deploy-checks.gate.conf`
- Modify only application files from prior points if a pre-deploy check finds an in-contract defect.

- [ ] **Step 1: Rebase the evidence onto the outgoing tree**

```bash
git fetch origin
git merge --no-edit origin/main
git status --short
git rev-parse HEAD
```

Resolve only conflicts inside the allowed paths and preserve both unrelated upstream work and this contract's behavior. A dirty tree or unresolved conflict blocks deployment.

- [ ] **Step 2: Run the exact outgoing revision gates**

```bash
npm test
npm run lint
npm run build
test ! -d prisma/migrations
ssh -i /Users/VladMoloso/.ssh/hetzner_devrika root@167.233.98.195 'df -BG / && free -m'
```

Expected: all test, lint, and build commands exit zero; no migration directory exists; the production host meets the configured 7 GB disk and 1500 MB memory floors.

- [ ] **Step 3: Push without rewriting history**

```bash
git push origin HEAD
```

Merge the reviewed revision to the integration branch through the repository's normal non-destructive path. Do not force-push or reset another contributor's work.

- [ ] **Step 4: Deploy through the existing official Coolify API path**

Use the configured operator-side Coolify endpoint and token without printing either value. Resolve the application UUID for `audit.devrika.ro`, queue deployment of the exact integration revision, retain the deployment UUID, and poll that UUID until it reports terminal success. A browser-control failure is not a deployment blocker while this API path is available.

- [ ] **Step 5: Check production behavior and logs**

Record deployment start time in `DEPLOY_CHECKS_SINCE`, confirm a known public route responds and a known nonexistent route does not, then inspect the production container logs since that time for uncaught, unhandled, fatal, or application error entries. Status alone is not proof.

- [ ] **Step 6: Complete the production evidence matrix**

Use a read-only connected account for the immediate report and its existing token-scoped saved report for the portal. Do not change Google Ads settings. Record screenshots at desktop and mobile widths and quote the displayed values used for arithmetic checks.

| Result | Production proof | Negative or comparison control |
|---|---|---|
| 1. Period profit or loss is understandable | Recompute `sales volume / minimum ROAS - budget` from the four displayed values and match the displayed rounded profit/loss amount and written verdict. | Open a legacy or missing-target report and confirm no profitability verdict is invented. |
| 2. Three conclusions are immediate and honest | Read the three cards above the comparison table and record their product counts and amounts. | Confirm missed sales is explicitly marked as a simulation and not measured or guaranteed revenue. |
| 3. Every product has one action tab | Count unique stable product IDs across all four tabs and match the signed snapshot population; compare every card count/amount with its tab. | Switch tabs by keyboard and confirm no product appears twice; a quarantined row is labeled unavailable and excluded from totals. |
| 4. Three periods compare correctly | Match the selected, immediately previous, and prior-year date boundaries to the signed snapshot, then recompute Budget, Volum vanzari, Nr. vanzari, CPA, ROAS, and Profit/Pierdere for each available row. | A genuinely missing comparison row says unavailable and contains no estimated number. |
| 5. Old signed reports survive | Open one pre-V2 portal link and confirm signature acceptance and a complete render. | Currency and comparison data absent from that snapshot appear unavailable, not RON or zero. |
| 6. Both live routes deliver V2 safely | Capture the same five V2 sections on the immediate route and selected portal report at 1440 by 1000 and 390 by 844. | A foreign report ID does not escape the token-scoped population; mobile keeps every table column reachable by horizontal scroll. |

- [ ] **Step 7: Apply the live-failure rule**

If any production row fails, redeploy the prior known-good revision first. Reopen the failed contract point locally, repair through RED/GREEN/negative control, rerun the complete local gate, redeploy, and repeat the full production evidence row.

## Completion Gate

The contract is complete only when all six points have:

1. a focused RED test observed failing before implementation;
2. the minimum GREEN implementation;
3. a negative control observed failing with the defect restored;
4. focused and full local tests passing on the exact outgoing revision;
5. a production witness matching the point's acceptance test;
6. no unresolved in-contract code-review or live-verification finding.

Out-of-contract findings are recorded for a future contract and do not expand this frozen scope.
