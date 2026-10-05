<!-- Branch of the audit-devrika container (../SKILL.md) since 2026-10-05; formerly the standalone skill audit-google-ads, version 2.1.19. -->
# Google Ads Web Audit

This skill covers one product: the non-mutating Google Ads audit available at
`https://audit.devrika.ro/google-ads`.

It is separate from the website audit. It does not have COLD, WARM, CONNECTED, or FULL modes.
It does not use the agency MCC, local `gads_*` scripts, or collection/report agents.

## Outcome

The store owner connects one Google Ads account and receives an ecommerce account report. Product
performance remains the monetary core, based on the latest 365 inclusive account-calendar dates.
The same report also checks conversion tracking, account structure, Performance Max, Standard
Shopping, Search campaigns, negative keywords, and paid search terms. It then offers a conditional
`Cu Devrika` simulator and an always-available contact form after the findings.

## Source of truth

The live application and its tests are authoritative:

- Repository: `~/seo-audit`
- User flow: `app/google-ads/`
- Product intake: `lib/gads-intake.ts`
- Product classification: `lib/gads-audit.ts`
- Client-facing findings: `lib/gads-findings.ts`
- Tracking safety gate: `lib/gads-tracking.ts`
- Account and campaign checks: `lib/gads-structure.ts`, `lib/gads-pmax.ts`,
  `lib/gads-shopping.ts`, `lib/gads-search.ts`, `lib/gads-keywords.ts`
- Rendered report test: `app/google-ads/raport/page.test.tsx`
- Simulator: `app/google-ads/impreuna/`
- Contact path: `app/google-ads/raport/ContactForm.tsx`

If this skill disagrees with the live application, inspect the code and tests before changing the
skill. Do not restore a retired flow from the changelog.

## Flow

1. Open `https://audit.devrika.ro/google-ads`.
2. Connect Google Ads through OAuth. Google exposes the broad `adwords` scope rather than a
   read-only scope; the application itself is constrained to read operations.
3. Select one accessible Google Ads account.
4. Enter the approximate gross margin. The application derives break-even ROAS as
   `100 / marginPercent`; it accepts finite values from 1 through 99 inclusive without changing
   valid decimals, and refuses every missing, malformed, non-finite, or out-of-range value.
5. Read the Shopping catalog and product performance for the latest 365 days, ending on today's
   date in the selected Google Ads account time zone.
6. In parallel, read conversion tracking, account structure, Performance Max, Standard Shopping,
   Search campaigns, negative keywords, paid search terms, and account totals. An optional source
   failure does not erase successful sections, but the current report does not disclose every such
   failure: structure and campaign-module failures are silently omitted.
7. Check conversion measurement before interpreting product ROAS, then place every product in
   exactly one performance group: Hero, Sidekick, Villain, Zombie, or Zero Zombie.
8. Render measured losses, the conditional catalog map, conditional account-setting findings,
   unsupported conclusions, and the caveats the current application actually produces. Tracking,
   primary-catalog failure, and a specific search-term visibility gap are disclosed; other optional
   source failures are not.
9. Show the `Cu Devrika` simulator CTA only when account structure and current ROAS are available.
   Keep the contact form after the findings on every successful report.
10. Never modify the connected account.

Read [references/sop-audit.md](references/sop-audit.md) when explaining or checking the complete
user flow. Read [google-ads/RULES.md](google-ads/RULES.md) when changing classification or report
logic. The executable contract lives in the report application and governs pipeline execution,
surface rendering, and guard predicates. [references/report-contract.json](references/report-contract.json)
is its validated documentation projection. Read [references/mistakes.md](references/mistakes.md)
before changing either.

## Boundaries

- Website audit: separate product and separate flow.
- Google Ads optimization: outside this skill.
- Leads accounts, Search-only audits, fleet audits, and MCC audits: outside this skill. Search is a
  supporting section of this ecommerce report, not a separate Search-only audit.
- Account mutations: forbidden. The OAuth scope is broad, so this guarantee comes from the
  application's implemented operations, not from a read-only permission enforced by Google. Every
  natural disclosure surface composes localized grammar tokens from the same executable OAuth
  contract: `adwords`, broad permission capability, read operations only, and no mutations.
  Other routes carry no artificial disclosure. Coverage is derived from the current Next source tree,
  including route groups, parallel and intercepted segments, rewrites, layouts, metadata, API emitters,
  and recursively resolved static or dynamic imports. Committed human-readable structural snapshots cover the
  complete rendered text of every registered state, metadata value, and observed public API response. Any
  additional phrase changes the full output and requires explicit review; a canonical clause in one
  descendant never authorizes an added sibling or suffix. The independent semantic oracle remains mandatory,
  so changing both runtime copy and its snapshot cannot turn a false OAuth claim green. Dynamic-value
  placeholders are bound to exact structural text or attribute locations and cannot erase matching prose.
  Local files cannot authenticate who produced a review verdict. Publication authorization therefore comes
  from the independent reviewer verdict in the live collaboration thread and is enforced procedurally by the
  root orchestrator; the repository stores technical evidence only and never manufactures reviewer identity.
- Public data-read disclosure: the executable read registry covers the complete public audit path, including
  account discovery, selected-account profile data, report sources, margin intake, and the simulator. Every
  read operation is bound to one or more disclosed categories. The compiler-based gate derives every reachable
  operation that ultimately calls the Google Ads search transport and compares it with the registry in both
  directions; a new unregistered read or an unused registry entry fails verification.
- Unknown or incomplete data: never turn it into a measured loss. Do not claim the current report
  discloses every optional-source failure; use the exact matrix in the SOP.

## Verification

Run the Google Ads tests in `~/seo-audit`, verify the rendered report and public-output golden tests, then run
`scripts/check_report_coverage.py` with explicit app and skill roots, plus
`scripts/check_public_google_ads_reads.mjs` with the app root and its fixture test
`scripts/test_public_google_ads_reads_gate.mjs` with both roots. A successful build or API
response alone does not prove that every report surface, conditional section, simulator route, and
contact path is represented honestly.
