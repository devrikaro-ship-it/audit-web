# SOP — Google Ads Web Audit

## User flow

1. The user opens `https://audit.devrika.ro/google-ads`.
2. The user starts Google OAuth. Google grants the general `adwords` scope; the application uses it
   only for read operations and implements no account mutation.
3. After the callback validates the OAuth state, the user selects one accessible Google Ads
   account.
4. The user enters an approximate gross margin. The application shows the derived break-even ROAS.
5. The application reads the Shopping catalog and product metrics for the latest 365 days, ending
   on today's date in the selected Google Ads account time zone.
6. In parallel, it reads conversion tracking, account structure, Performance Max, Standard
   Shopping, Search campaigns and ads, negative keywords, paid search terms, and annual totals.
7. The application checks conversion measurement before judging product performance and
   classifies every product into one closed performance group.
8. The application renders the report at `/google-ads/raport`. Optional source failures suppress
   their dependent conclusions. Only tracking, primary-catalog failure, and a specific search-term
   visibility gap are disclosed; other optional-source failures are currently silent.
9. When structure and current ROAS are available, the report offers the `Cu Devrika` simulator at
   `/google-ads/impreuna`. The user controls assumptions and supplies offer terms.
10. Every successful report places the contact form after the findings and ends with the honesty
    and unavailable-data section.

## What the report answers

1. Which products have enough evidence and return above break-even.
2. Which products have enough evidence but consume budget below break-even.
3. Which products sold despite limited exposure.
4. Which products received limited exposure without a sale.
5. Which catalog products received no impressions.
6. Whether conversion tracking can support performance conclusions.
7. Which account structure, bidding, budget, Performance Max, Standard Shopping, and Search
   settings require attention when those reads are available.
8. Which negative keywords block brand or sold-product demand.
9. Which paid search terms spent money without a conversion on the stated 30-day window.
10. Which conclusions cannot be supported because tracking or another source is incomplete.
11. Under user-controlled assumptions, what the separate `Cu Devrika` simulator projects at the
    same ad budget. This is a simulation, not a measured audit answer.

## Failure behavior

1. Missing or expired session → return to the connection step.
2. No accessible account → explain the condition and allow reconnection.
3. Missing or invalid `customer.time_zone` → refuse account selection and return to the recoverable
   account-selection screen; never seal the unusable value into the session.
4. Missing, malformed, non-finite, or out-of-range margin → return to the margin form with an
   explanation and retry path; do not clamp, default, sign it as the completed margin, report, or
   calculate with it. The session may still exist without the field before this step is completed.
   Invalid-present sessions return to the same explanation; genuinely missing pre-step sessions
   return to the ordinary margin form. Zero or multiple submitted fields are invalid.
5. Primary product-intake failure → replace the report with the unavailable recovery page.
6. Undated catalog subquery failure with readable performance → keep observed product performance,
   disclose incomplete catalog coverage, and do not report invisible products as zero.
7. Unreliable tracking → preserve measured spend but quarantine product-profitability claims.
8. Structure read failure → keep the successful report sections, silently omit structure findings,
   prevent PMax analysis, and potentially omit the simulator call to action.
9. Raw PMax, Standard Shopping, or Search read failure → silently omit that module's findings; do
   not fail the whole page.
10. Outer keyword read failure → silently omit negative-keyword and paid search-term findings. A
   narrower unavailable search-term view can instead produce the existing visibility caveat.
11. Secondary short-window catalog read failure → silently omit that window; omit the catalog map if every
    short-window read fails.
12. Annual-total failure → log it on the server and use available structure totals as the report
    fallback; do not show a dedicated source-failure message to the client.
13. No repair points from optional analyzers → omit the account-settings section rather than render
   an empty diagnosis.
14. Missing structure or zero current ROAS → omit the simulator CTA. On the simulator route, missing
   structure produces an honest unavailable state rather than an invented projection.
15. Contact save failure → keep the form available and show the direct email fallback.

## Boundaries

The SOP ends with the web report, optional simulator, and contact path. It does not produce a local
Markdown audit, invoke an MCC, delegate collection to an agent, or apply Google Ads changes.
Website auditing is a separate product.
