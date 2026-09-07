# International audit SaaS proposal

## Later September 7 decision — takes precedence

The operator subsequently reported purchasing devrika.io and changed the commercial rollout to Romania first, then UK and US. Prepare Romanian as the base language and English alongside it in one application. The initial English-only translation pause does not mean replacing Romanian is approved. The ten-market table below remains future research, not the current release plan. No bilingual code or domain migration has been implemented. Continue from `docs/dev/HANDOFF-2026-09-07.md` for the current complete state.

Status: Discussion proposal only. No implementation or deployment authorized by this planning request. The earlier full-English translation remains paused until the operator explicitly resumes implementation.

## Confirmed product intent

The operator wants a standalone ecommerce Google Ads audit tool sold internationally through localized landing pages, with a tentative subscription price around EUR 10 per month. It is not an agency lead-generation product. It does not execute campaign changes. Monitoring, alerts, scheduled collection, other advertising platforms, and agency services are not implied by this plan.

The paid entitlement is proposed to cover repeat, user-initiated audits and access to reports. Audit frequency, account allowance, and history retention remain commercial decisions. A one-account starting tier is a proposal, not an approved limit. Demonstrating useful repeat audit usage and retention must precede scaling acquisition.

## Architecture recommendation

Use one international domain, one application, one audit calculation engine, one customer identity system, and one billing integration. `devrika.io` is a candidate domain only; it has not been purchased. Keep the existing production host intact until a separately authorized domain migration is ready.

Use locale paths such as `/en-gb/`, `/en-us/`, `/de-de/`, and `/ja-jp/`. A shared landing template consumes versioned locale copy and market configuration. Application routes can remain under the same domain with locale prefixes to simplify language continuity and OAuth return handling. Avoid independent country codebases and separate country infrastructure at launch.

Keep market, language, Google Ads account currency, account timezone, and subscription billing currency distinct. A German-speaking owner with a USD Google Ads account must receive German explanations with USD account figures. Never convert account values simply because the visitor changes language. Preserve brand and product names. Localized numbers and decimals must round-trip to the same canonical inputs. Use appropriate font coverage for Japanese web and PDF output.

Localize landing pages, pricing, onboarding, consent explanations, intake, findings, tables, empty/error states, report delivery, PDF, account management, billing, emails, support documentation, and legal disclosures. Translation strings must not duplicate formulas or change measured/estimated/simulated semantics. Native review is required for commercially important translations; machine translation can supply a draft.

Public localized pages use explicit URLs, consistent language, reciprocal hreflang, an appropriate x-default, and deliberate canonical handling for truly duplicate same-language regional pages. Do not canonicalize all translated pages to English. Provide a language/region selector; avoid forced IP redirects. Keep private customer reports out of search indexes and behind authorization.

## Proposed ten-market shortlist

This is a launch shortlist for this specific Google Ads audit tool, not a statistically verified ranking of the world's ten largest ecommerce markets. No customer acquisition costs, country conversion rates, merchant counts, or willingness to pay have been measured for this product.

| Market | Locale | Proposed wave | Reason for placement |
|---|---|---|---|
| United Kingdom | en-GB | 1 | English-language pilot in an established ecommerce market |
| United States | en-US | 1 | Large ecommerce opportunity; English core reusable; acquisition economics must be tested |
| Canada | en-CA initially | 2 | Reuse English product; French Canada needs a separate fr-CA rollout |
| Australia | en-AU | 2 | Reuse English product and test another account/billing currency |
| Germany | de-DE | 2 | European expansion with complete German product and support content |
| France | fr-FR | 2 | European expansion with complete French product and support content |
| Spain | es-ES | 3 | Full Spanish localization after paid funnel validation |
| Italy | it-IT | 3 | Full Italian localization after paid funnel validation |
| Netherlands | nl-NL | 3 | High observed online-shopping adoption; smaller market may still fit a focused SaaS |
| Japan | ja-JP | 3, last | Significant ecommerce market; requires native language review and Japanese typography verification |

Within a wave, launch and measure one market at a time. Reorder later markets using observed paid conversion, retention, support effort, and acquisition payback. All ten are listed as supported Google Shopping target countries; this establishes compatibility, not market demand for the audit.

## Current application findings

The V2 report is already an implemented shared reporting model with account currency and date-period handling; its September 4 final production verification recorded six passed points. Internationalization should preserve this model.

The current callback puts the Google refresh token into a signed session with a one-hour lifetime (`app/api/google-ads/callback/route.ts`, `lib/gads-session.ts`). That does not itself provide a persistent SaaS user/billing identity. A paid user identity and entitlement must be designed independently of the Google connection. For user-initiated audits, reconnecting Google may remain an acceptable initial flow. Persistent background access must not be added merely because subscriptions exist; it would require an explicit feature decision and matching security/privacy design.

The reachable stored-PDF generator (`lib/gads-report-pdf.ts`, imported by `app/google-ads/raport/actions.ts`) contains hardcoded RON labels and mixed en-US/ro-RO formatting. This is a concrete international-readiness finding for a future implementation point, not repaired here. Verify web/PDF currency parity before international release.

The existing lead/contact and agency-oriented presentation must be reviewed for replacement by a paid audit flow; this does not authorize changing it now. Payment lifecycle requirements include server-verified entitlements, idempotent webhooks, cancellation, failed payment handling, billing receipts, and cross-customer isolation. Previously paused clients remain frozen for writes and collection under the existing project rule.

## Economics and launch gates

EUR 10/month is a pricing hypothesis. At this price, avoid unlimited account access, unbounded report regeneration, or manual advisory support without a measured cost model. Cache reusable audit inputs/results and measure cost per successful audit, product-count distribution, API capacity, and support minutes. An annual option may be tested separately; no annual price is approved.

Illustrative arithmetic only: if net monthly contribution after variable costs is EUR 8 and the desired acquisition payback is three months, the allowable CAC is EUR 24. If clicks cost EUR 1 and 2% of clicks become paid users, CAC is EUR 50 and payback is 6.25 months. These are simulated assumptions, not country benchmarks. At EUR 10, 100 subscribers produce EUR 1,000 monthly gross subscription revenue and 1,000 subscribers EUR 10,000, before taxes, payment fees, refunds and operating costs.

Evaluate a merchant-of-record service such as Paddle against a direct payment stack for the actual seller entity and customer markets. Paddle publicly lists 5% + 50 cents per checkout transaction; provider eligibility, local currencies, final fee terms, tax presentation and obligations still require confirmation. This proposal does not select a provider or offer jurisdiction-specific tax advice.

Measure each market through visits, Google connection completed, usable audit completed, paid subscription, next-month renewal, cancellation, and support cost. Use attribution and permitted analytics without collecting Google credentials or sensitive report content. Country expansion requires working onboarding, truthful localized output, sustainable unit economics, and evidence of repeat audit value; raw traffic is insufficient.

## Dependency order and observable done conditions

1. Define the paid audit entitlement and final domain. Done when the buyer knows exactly what EUR 10 buys and where the product lives.
2. Build and verify one complete English paid-audit experience. Done when an eligible customer can connect, obtain a correct audit, pay, return, and cancel; unauthorized accounts cannot read another customer's reports or paid features.
3. Align the final domain, actual data handling, OAuth branding, policies and review video. Done when the published product and Google submission match. Do this before recording the final international demo if the domain will change.
4. Pilot the UK, then US with separately measured acquisition. Done when reliable paid-conversion and repeat-use evidence exists and the chosen cost limits hold. Do not invent traffic budgets or conversion thresholds before pilot economics are agreed.
5. Expand sequentially to wave 2 and wave 3 using the same engine. Done for each locale when every public/private surface, email and PDF is in the intended language, numeric outputs remain invariant, and subscription flows work in the supported billing configuration.

## Sources checked September 7, 2026

1. Google international URLs and generic treatment of .io: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
2. Google localized versions and hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions
3. Google Shopping supported countries: https://support.google.com/merchants/answer/12472394?hl=en
4. Google OAuth branding and authorized domains: https://support.google.com/cloud/answer/15549049?hl=en
5. U.S. Census ecommerce data: https://www.census.gov/retail/eCommerce.html (retrieved release covers Q1 2026; not represented as a later-quarter figure)
6. Eurostat online shopping: https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20250220-3 (2024 observations; not a 2026 market ranking)
7. Japan ecommerce overview: https://www.trade.gov/country-commercial-guides/japan-ecommerce-0 (published November 2025, underlying 2023 figures)
8. Paddle pricing: https://www.paddle.com/pricing

## Model route

{"catalog_checked_at":"2026-09-07T10:05:10.129543+00:00","catalog_live":true,"catalog_source":"codex debug models","model":"gpt-5.6-sol","rationale":"Multi-step implementation and debugging need a reliable model with deep reasoning.","reasoning_effort":"high","task_class":"complex"}
