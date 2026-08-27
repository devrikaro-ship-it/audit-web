# Live Google Ads Reporting Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long-form client report with one live Google Ads-style dashboard that exposes account KPIs and the complete product performance population.

**Architecture:** Extend the signed report snapshot with account traffic totals and full product rows, derive product labels in one pure module, and render a shared interactive client component in both the immediate report and portal. Preserve backward compatibility by treating new fields as optional when opening older signed snapshots.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, Tailwind CSS plus component-scoped CSS.

**Spec:** `docs/superpowers/specs/2026-08-27-live-google-ads-reporting-dashboard-design.md`

## Global Constraints

- All new file content and identifiers are English.
- The table operates on the complete product population stored in the selected signed snapshot.
- Measured and simulated data remain explicitly separated.
- No Google Ads mutation, email, production deploy, or internal dashboard redesign is included.
- New snapshot fields remain backward compatible with existing signed reports.

---

### Task 1: Reporting data contract and classifications

**Files:**
- Modify: `lib/gads-report-delivery.ts`
- Create: `lib/gads-product-classification.ts`
- Test: `lib/gads-report-delivery.test.ts`
- Test: `lib/gads-product-classification.test.ts`

**Interfaces:**
- Consumes: raw product metrics already collected for the report.
- Produces: optional account `clicks` and `impressions`, complete `reportProducts`, and `classifyReportProducts(products, breakEvenRoas)`.

- [ ] Write failing tests for snapshot round-tripping of full product metrics, old snapshot compatibility, all five classifications, and the derived clicks-per-sale threshold.
- [ ] Run the focused tests and confirm they fail for missing fields and functions.
- [ ] Add typed report product rows, backward-compatible validation, and the pure classification function.
- [ ] Run the focused tests and confirm they pass.
- [ ] Reintroduce a classification defect and confirm the classification test fails, then restore it.

### Task 2: Populate complete measured account data

**Files:**
- Modify: `app/google-ads/raport/page.tsx`
- Test: `app/google-ads/raport/page.test.tsx`

**Interfaces:**
- Consumes: the full product array returned by the existing Google Ads collection path.
- Produces: account-wide clicks, impressions, conversion rate inputs, and one report row per collected product in the signed snapshot.

- [ ] Write a failing page test proving totals use the full product population and not the loss/opportunity subsets.
- [ ] Run the focused test and confirm the signed snapshot lacks the expected complete metrics.
- [ ] Calculate account totals and map every collected product into `reportProducts` without client-specific constants.
- [ ] Run the focused test and confirm it passes.
- [ ] Replace the full population with a subset in a negative control and confirm the test fails, then restore it.

### Task 3: Interactive account dashboard and complete product table

**Files:**
- Create: `app/google-ads/raport/ReportingDashboard.tsx`
- Create: `app/google-ads/raport/ReportingDashboard.test.tsx`
- Modify: `app/google-ads/raport/ProfitabilitySimulator.tsx`

**Interfaces:**
- Consumes: `GadsReportSnapshot`, classified report products, and existing `ProductAnalysis` simulation data.
- Produces: KPI strip, profitability verdict, searchable/filterable/sortable scroll table, and the existing simulator below measured data.

- [ ] Write failing interaction tests for all KPI values, account profitability, complete row rendering, search, label filters, numeric sorting, sticky header semantics, and empty states.
- [ ] Run the component tests and confirm they fail before the dashboard exists.
- [ ] Build the shared dashboard with Google Ads-inspired density, controls, accessible text labels, and a bounded scroll region that contains every product row.
- [ ] Integrate the existing simulator below the measured dashboard without changing simulation formulas.
- [ ] Run component tests and confirm they pass.
- [ ] Disable one filter or truncate the product array as a negative control and confirm the relevant test fails, then restore it.

### Task 4: Use the same dashboard in both report routes

**Files:**
- Modify: `app/google-ads/raport/page.tsx`
- Modify: `app/google-ads/portal/[token]/page.tsx`
- Test: `app/google-ads/raport/page.test.tsx`
- Test: `app/google-ads/portal/[token]/page.test.tsx`

**Interfaces:**
- Consumes: `ReportingDashboard` and the selected signed snapshot.
- Produces: identical reporting UI after audit and inside each monthly portal report.

- [ ] Write failing route tests proving both routes render the shared live dashboard and portal month selection changes its data.
- [ ] Run the route tests and confirm they fail against the old long-form rendering.
- [ ] Replace route-specific report rendering with the shared dashboard component.
- [ ] Run route tests and confirm they pass.
- [ ] Restore the old portal component in a negative control and confirm the shared-dashboard test fails, then restore the implementation.

### Task 5: Local verification

**Files:**
- Modify only files required by defects found during verification.

**Interfaces:**
- Consumes: the completed local dashboard.
- Produces: test, build, and visual evidence for the approved design.

- [ ] Run the focused dashboard, snapshot, report-route, and portal-route tests.
- [ ] Run the full test suite, lint, and production build.
- [ ] Open the local immediate report and client portal, verify KPI calculations against their snapshot values, exercise search/filter/sort, and scroll through the full product table.
- [ ] Verify desktop and mobile layouts visually and confirm simulated values remain labeled.
- [ ] Record concrete pass/fail evidence for each specification requirement.
