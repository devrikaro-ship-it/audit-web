# Google Ads Reporting V2 — Contract Amendment 4

**Contract:** `2026-09-03-google-ads-reporting-v2.md`

**Recorded:** `2026-09-03T20:17:24Z`

**Approval applied:** STANDING — user said, verbatim, `gata, go cu agentii codex` on 2026-09-03.

## Correction

Points 3 and 5 must keep the complete signed snapshot on the server before rendering the contact form. The browser receives only a short-lived opaque reference bound to the exact sealed session.

The reviewed implementation sends the variable-size snapshot through a hidden form field and truncates it before verification. A valid 382-product report already exceeds that application cap, and the 10,000-product contract boundary exceeds the framework's default request limit. Raising request limits would preserve the same defect at a larger size.

This amendment changes transport only. It does not change product limits, formulas, classifications, contact consent, report contents, portal authorization, or Google Ads access.

## Required behavior

- Stage the exact signed bytes on the existing persistent report volume before the contact form renders.
- Send a fixed-size cryptographically random reference through the browser, never the signed snapshot.
- Bind the pending record to a digest of the exact sealed session, enforce expiry, validate byte length and digest, and verify the report signature before any lead or delivery side effect.
- Claim delivery atomically across processes. Identical retries converge on one stable report identity and result; changed contact data, a foreign session, a changed reference, or changed snapshot bytes fail closed.
- Preserve pending bytes for retry after a storage or PDF failure. Publish the final snapshot without overwriting different existing bytes.
- Keep the contact request bounded independently of product count and retain the framework's default body-size protection.
- Keep portal token scoping and final stored-snapshot signature verification unchanged.

## Done when

A route-shaped 382-product report and a report at the 10,000-product boundary both submit through the real action with a fixed-size reference, create one report identity, and store bytes exactly equal to the route's signed snapshot. The immediate and portal models match. Changed references, foreign sessions, changed contact data, concurrent claims, modified pending bytes, modified final bytes, expiry, and retryable failures follow the declared safe outcomes. The complete suite, lint, and production build pass.

## Technical appendix

| Contract points | Added allowed path | Purpose |
|---|---|---|
| 3 and 5 | `lib/gads-pending-report.ts` | Persistent pending state, session binding, atomic claim, expiry, retry, and completion receipt |
| 3 and 5 | `lib/gads-pending-report.test.ts` | Storage, tamper, session, expiry, concurrency, retry, and boundary-size proof |
| 3 and 5 | `lib/gads-report-snapshot.ts` and `lib/gads-report-snapshot.test.ts` | Shared storage root and immutable exact-byte publication |
| 3 and 5 | `lib/gads-leads.ts` and `lib/gads-leads.test.ts` | Stable report identity and idempotent lead persistence where required by concurrent retry |
| 3 and 5 | `lib/gads-report-pdf.ts` and its existing tests | Shared report storage root and retry-safe publication where required |
| 3 and 5 | `app/google-ads/raport/page.tsx` and `app/google-ads/raport/page.test.tsx` | Stage server-owned snapshot and pass only the opaque reference |
| 3 and 5 | `app/google-ads/raport/ContactForm.tsx` and `app/google-ads/raport/ContactForm.test.tsx` | Fixed-size browser form contract |
| 3 and 5 | `app/google-ads/raport/actions.ts` and `app/google-ads/raport/actions.test.tsx` | Authenticated claim, exact-byte promotion, idempotent delivery, and retry behavior |
| 5 | `app/google-ads/portal/[token]/page.test.tsx` | Stored-byte equivalence and retained token/tamper controls |
| 5 | `app/public-output-reachable-files.json` | Register the new public-route dependency exactly once |
