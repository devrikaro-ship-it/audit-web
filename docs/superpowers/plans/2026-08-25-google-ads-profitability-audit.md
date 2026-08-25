# Google Ads Profitability Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the connected Google Ads audit into a measured profitability report with break-even inputs, product-level before/after simulation, durable contact capture, stored PDF, and automatic email delivery.

**Architecture:** Google Ads remains read-only. Purchase-only account totals and product performance feed pure financial and simulation functions. The signed session carries only short-lived audit inputs; durable lead records store the generated report and PDF on the existing persistent volume. Current values and future simulations remain separate data types and separate visual sections.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Google Ads REST API, persistent JSON/files, Chromium PDF rendering.

**Spec:** Approved conversation in the 2026-08-25 session and `docs/AUDIT-SPEC.md`.

## Global Constraints

- Google Ads access is read-only and no refresh token is persisted.
- Account AOV uses only `PURCHASE` conversions from the same date window and attribution population as Purchase value.
- Operating costs are a disclosed fixed estimate of 20% of revenue.
- CSS is a disclosed simulation assumption of 20% lower CPC and is never presented as guaranteed.
- Actual Google Ads values and future simulations are visually and structurally distinct.
- Loss rows are ordered by descending money at risk; opportunity rows are ordered by descending estimated profitable sales opportunity.
- The budget simulator starts at measured monthly spend, supports zero, applies diminishing returns, and stops before simulated ROAS falls below break-even.
- Name, email, and phone are mandatory for delivery; marketing consent is separate from report-delivery consent.
- New identifiers and authored file content are English.

---

### Task 1: Purchase-only financial baseline

**Files:**
- Modify: `lib/gads-an.ts`
- Modify: `lib/gads-an.test.ts`
- Create: `lib/gads-financials.ts`
- Create: `lib/gads-financials.test.ts`

**Interfaces:**
- Produces: `PurchaseBaseline`, `buildPurchaseQuery()`, `aggregatePurchaseBaseline()`, and `calculateBreakEven()`.

- [ ] Write tests that reject mixed conversion categories and derive literal AOV, CPA, ROAS, break-even CPA, and break-even ROAS values.
- [ ] Run the tests and confirm they fail because Purchase-only aggregation and break-even functions do not exist.
- [ ] Add the minimum GAQL and pure calculations required by the tests.
- [ ] Run focused and regression tests, then perform a negative control by restoring mixed-conversion aggregation and observing the test fail.
- [ ] Commit the component.

### Task 2: Financial input screen and session state

**Files:**
- Modify: `lib/gads-session.ts`
- Modify: `lib/gads-session.test.ts`
- Replace: `app/google-ads/marja/MarginForm.tsx`
- Modify: `app/google-ads/marja/MarginForm.test.tsx`
- Modify: `app/google-ads/marja/actions.ts`
- Modify: `app/google-ads/marja/actions.test.tsx`
- Modify: `app/google-ads/marja/page.tsx`
- Modify: `app/google-ads/marja/page.test.tsx`

**Interfaces:**
- Consumes: `PurchaseBaseline` and `calculateBreakEven()`.
- Produces: confirmed `averageOrderValue`, `goodsCost`, `breakEvenCpa`, and `breakEvenRoas` in the signed session.

- [ ] Write failing component and action tests for two synchronized sliders and numeric inputs, measured AOV prefill, manual fallback, fixed 20% operating-cost disclosure, and invalid economics.
- [ ] Implement server validation and signed-session persistence.
- [ ] Verify focused tests, accessibility behavior, tampered submissions, and negative controls.
- [ ] Commit the component.

### Task 3: Product ranking and controlled simulation engine

**Files:**
- Create: `lib/gads-product-simulation.ts`
- Create: `lib/gads-product-simulation.test.ts`
- Create: `app/google-ads/raport/ProfitabilitySimulator.tsx`
- Create: `app/google-ads/raport/ProfitabilitySimulator.test.tsx`

**Interfaces:**
- Consumes: product cost, clicks, Purchase orders, Purchase revenue, account baseline, and break-even values.
- Produces: top losses, top opportunities, optimized product rows, scenario totals, and the economic budget limit.

- [ ] Write failing tests for loss ordering, opportunity ordering, zero budget, current-spend default, absolute loss caps, CSS CPC adjustment, diminishing returns, and the break-even ceiling.
- [ ] Implement pure ranking and simulation functions.
- [ ] Implement the interactive before/after table driven by the pure model.
- [ ] Verify focused tests and negative controls for ordering and break-even enforcement.
- [ ] Commit the component.

### Task 4: Report integration and strategy explanation

**Files:**
- Modify: `app/google-ads/raport/page.tsx`
- Modify: `app/google-ads/raport/page.test.tsx`
- Modify: `app/google-ads/raport/report-contract.tsx`
- Modify: `app/google-ads/raport/report-contract.test.tsx`

**Interfaces:**
- Consumes: purchase baseline and product simulation output.
- Produces: measured before tables, simulated after tables, two-scenario comparison, and three-step strategy.

- [ ] Write failing render tests for measured/simulated badges, exact table columns, two scenarios only, no profit-after-advertising card, and the three strategy steps.
- [ ] Integrate the new report sections without changing the read-only account boundary.
- [ ] Verify the real page render, public-output contract, snapshots, and negative controls.
- [ ] Commit the component.

### Task 5: Durable report, PDF, contact, and email delivery

**Files:**
- Modify: `lib/gads-leads.ts`
- Modify: `lib/gads-leads.test.ts`
- Create: `lib/gads-report-store.ts`
- Create: `lib/gads-report-store.test.ts`
- Create: `lib/gads-email.ts`
- Create: `lib/gads-email.test.ts`
- Modify: `app/google-ads/raport/ContactForm.tsx`
- Modify: `app/google-ads/raport/ContactForm.test.tsx`
- Modify: `app/google-ads/raport/actions.ts`
- Modify: `app/google-ads/raport/actions.test.tsx`
- Create: `app/google-ads/raport/[reportId]/pdf/route.ts`

**Interfaces:**
- Consumes: immutable report snapshot and mandatory contact fields.
- Produces: durable lead with report ID/status/consent, stored PDF, browser access, and email delivery result.

- [ ] Write failing tests for strict server-side validation, consent separation, UUID report IDs, PDF persistence, ownership-safe lookup, attachment metadata, and honest failure states.
- [ ] Implement durable snapshot/PDF storage under the configured persistent volume.
- [ ] Implement provider-backed email delivery with server-only credentials and attachment size limits.
- [ ] Generate the PDF from the immutable report snapshot, save it before sending, and unlock the browser report only after successful contact persistence.
- [ ] Render the PDF to PNG, inspect every page, and verify extracted text and attachment bytes.
- [ ] Commit the component.

### Task 6: Security, production configuration, and live verification

**Files:**
- Modify: `README.md`
- Modify: relevant privacy and dashboard pages
- Modify: `clients/magazin-fitness/DOCUMENTATION.md` only if the live client/site is changed.

**Interfaces:**
- Consumes: all completed components.
- Produces: configured production deployment and live evidence for every user-visible requirement.

- [ ] Run the full test suite, branch coverage, lint, build, dependency audit, secret scan, SSRF/input-validation checks, and PDF visual verification.
- [ ] Configure only missing production variables without exposing their values.
- [ ] Deploy through the existing production path.
- [ ] Run the full live flow using a safe test account and destination, including zero/default/max budget states and stored PDF retrieval.
- [ ] Check production errors after deployment and record the live outcome.

