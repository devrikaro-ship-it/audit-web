# English-first reporting application

## Authorization and objective

The operator approved implementation after confirming this order: make the application at `audit.devrika.io` entirely English, verify and publish it, then prepare the Google OAuth demonstration and resubmission. This approval supersedes earlier Romanian-first and discussion-only notes. Product positioning is a Google Ads ecommerce reporting tool. Monthly scheduling, billing, additional platforms, and a published Romanian variant are deferred.

The public default language becomes English. Preserve the existing application architecture, routes and identifiers, reporting formulas, account currency, consent semantics, access controls, and user-owned data. Keep the brand name Audit Devrika. Application-authored interface text, accessibility labels, metadata, errors, report explanations, email copy and PDF labels must be English. Existing store/product/account names and historical stored narrative are user or previously persisted data, not translation targets; never rewrite stored signed reports to change their language.

## Measured inventory

1. The production root rewrites to `/hub`; local `/` is a development index. `app/layout.tsx` emits `lang="ro"` and Romanian metadata.
2. `lib/gads-public-oauth-contract.ts`, `lib/gads-read-disclosure.ts`, and `lib/gads-localized-copy.ts` own shared OAuth facts, disclosure language, and error copy. The existing grammar order is Romanian. Preserve the distinction between Google's broad `adwords` scope and the application's read-only behavior.
3. Public entry and legal surfaces are `app/hub`, `app/google-ads/page.tsx`, `app/google-ads/connect`, `app/confidentialitate`, and `app/termeni`.
4. The connected flow continues through `app/google-ads/conturi`, `marja`, `raport`, `impreuna`, and `portal`. Report text also comes from `lib/gads-*` analysis modules and report metrics/period formatters. The report is large: `raport/page.tsx` is 1189 lines and `ReportingDashboard.tsx` 724 lines.
5. Export/delivery content lives in `lib/gads-report-pdf.ts`, `lib/gads-report-email.ts`, `lib/gads-report-delivery.ts`, report actions, and protected download routes. Preserve every account-currency value rather than translating RON into a different currency.
6. Existing ancillary surfaces include the website-audit landing/funnel, cold and warm reports/PDFs, and internal dashboards. Translate application-authored labels on these reachable surfaces without adding/removing report sections or changing detection, financial calculations, or stored data.
7. Public-output tests use an external Romanian oracle at `~/.claude/skills/audit-google-ads/references/public-oauth-oracle.json`. English expected wording needs a project-owned reviewed oracle; retain the external Romanian oracle unchanged. Do not make expected copy derive from production emitters or disable semantic/coverage guards.
8. There is no root `.codex-delivery-checks.json`. The previous approved run used an explicit project-local checks declaration under `.superpowers/sdd`. Each point must declare its exact diff-based checks and use the bounded planned-command wrapper; the final candidate runs the full suite once plus lint and the required frontend build.

## Implementation defaults

1. This is an English-first localization of existing behavior, not a redesign. Preserve layout and navigation unless text length needs a small responsive correction.
2. Keep legacy route segments and stable field/enum identifiers to preserve links and stored records. English labels do not require renaming `/raport`, `/conturi`, `/marja`, `/confidentialitate`, or `/termeni`.
3. Reuse existing centralized copy and introduce only small English copy/formatting modules where needed. Avoid runtime machine translation, bulk DOM replacement, or an unused multilingual framework. Preserve Romanian source history for the future `/ro` release.
4. Preserve measured versus simulated labels, uncertainty, and every Google data-protection disclosure. Do not invent product capabilities, subscription offers, financial guarantees, or performance claims during translation.
5. UI language must not force account currency or change numeric outcomes. Use consistent English number/date formatting while retaining the real ISO currency code.
6. Work sequentially with one point owner and fresh independent review/verification. A role's success is not overall completion. Local point evidence is followed by an integrated production acceptance pass.
7. Existing paused-client restrictions remain mandatory before any real account collection. Local demo data can exercise controls; production proof must identify actual rendered application behavior and distinguish seeded data from real account data.
8. No external email, reviewer submission, new OAuth consent grant, or credential change is implied by localization. Prepare those concrete next steps and report any human boundary separately.

## Acceptance

An English-speaking user can traverse every supported application-authored public screen and the connected reporting flow, understand errors and empty states, read the report and PDF, and follow the existing delivery/portal links. Numbers, account isolation, callback validation, signed-report integrity and existing access refusals remain intact. Public metadata identifies the English application and legal links resolve on `audit.devrika.io`. The exact reviewed revision is deployed and independently verified with real HTTPS/browser evidence. Google approval itself is an external outcome and is not claimed by this implementation.

## Execution record

Delivery run: `.superpowers/sdd/2026-09-07-launch-english/delivery/`.
Root checkpoint: `01a07b70-49c2-7040-94d4-cd5333cab54b`.
Baseline application revision: `4b4dfc758137d49ee5e171aa467fd5ce3570489d`.
Baseline local documentation revision: `cf6b871` plus this session's pending product clarification documents.

## Point-one local acceptance — 2026-09-08

Public entry, legal pages, document language and shared OAuth disclosures passed independent code review and real local verification at `2b0c613a40bf6b4576fe65e82d1143b710e40652`. The four public pages returned HTTP 200 with English copy. Privacy revocation instructions preserve visible spacing. Invalid report access returned 404, invalid OAuth state returned a safe 307 without an authenticated session, and a missing route returned 404. The contract ledger records point one as passed.

Evidence is under `.superpowers/sdd/2026-09-07-launch-english/point-1-verification-public/` and `point-1-verification-access/`; the exact-candidate browser receipt is `root-browser-2b0c613.md` in the same run. Two incomplete whole-point verifier attempts were followed by finite public-page and access-refusal verification tasks. Their incomplete attempts are not acceptance evidence.

At that milestone, points two through six remained pending and production was unchanged.

## Point-two local acceptance — 2026-09-08

Connection, account selection and financial intake passed independent code review and real local verification at `f8b69e42c3efb04c973772fd27d5033922c7fe9b`. Authored copy is English. The financial form now uses the selected account currency and refuses a session without that currency. Calculations, callback/session behavior and server actions are unchanged.

The actual local demo flow selected the explicitly simulated account and displayed AOV 1650, goods cost 907.5 RON, CPA 412.50 RON and ROAS 4.00. A valid financial form advanced with HTTP 303 to the report; an empty AOV returned HTTP 303 to the financial-error screen, and an unauthenticated request returned HTTP 307 to connection. The verifier stopped before report generation. Unit controls separately proved EUR display and rejection of a hardcoded RON regression.

Evidence is under `.superpowers/sdd/2026-09-07-launch-english/point-2-review/` and `point-2-verification/`. The ledger records points one and two as passed. Points three through six remain pending; production has not changed. The next point is report UI and newly generated analytical copy, preserving calculations, classifications, uncertainty and account currency.
