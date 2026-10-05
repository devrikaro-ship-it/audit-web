# SPEC — Google Ads Web Audit

## Mission

Provide a self-serve, non-mutating ecommerce audit of one connected Google Ads account. The report
combines Shopping product performance with tracking, structure, campaign-type, keyword, and search
term checks. Product evidence uses the latest 365 inclusive account-calendar dates.

## Product boundary

This is not the website audit, an agency MCC audit, or an optimization workflow. It has no
access-based modes, does not generate an internal work queue, and never changes campaigns. It is
broader than product classification but remains an ecommerce web audit; it does not support leads
accounts or promise every diagnostic available in the internal Google Ads optimization system.

## Inputs

1. OAuth permission through Google's general `adwords` scope. Google does not expose a narrower
   read-only Google Ads scope; the application must therefore enforce read-only behavior in code.
2. One Google Ads account selected by the user.
3. The user's approximate gross margin.
4. Shopping catalog and product metrics for the latest 365 days, ending on today's date in the
   selected account time zone.
5. Optional account reads for conversion tracking, structure, Performance Max, Standard Shopping,
   Search campaigns and ads, negative keywords, paid search terms, and annual account totals.

## Decision model

The margin determines the break-even ROAS:

`breakEvenRoas = 100 / marginPercent`

`marginPercent` is a finite number from 1 through 99 inclusive. Valid decimals are preserved;
missing, malformed, non-finite, and out-of-range values are refused rather than normalized.
Localized decimal strings are converted to the canonical numeric value before a session is signed
or consumed. An invalid stored value and a margin not entered yet remain distinct states.

Every product belongs to exactly one group:

| Group | Meaning |
|---|---|
| Hero | Enough traffic and return at or above break-even |
| Sidekick | Limited traffic but at least one sale |
| Villain | Enough traffic and return below break-even |
| Zombie | Some visibility, limited traffic, and no sale |
| Zero Zombie | No impressions |

Classification order must keep these groups disjoint. A product without impressions cannot also
be reported as a Villain.

## Honesty rules

1. Product cost, revenue, impressions, clicks, conversions, and product ROAS are measured account
   data.
2. Product profitability is not claimed when conversion measurement is unreliable.
3. If the undated catalog subquery is incomplete while performance remains readable, the report
   discloses incomplete coverage and never reports invisible products as zero. If the primary
   product intake fails entirely, the unavailable recovery page replaces the report.
4. Estimates and simulations carry explicit labels and never enter measured-loss totals.
5. The audit reports revenue performance, not accounting profit.

## Implemented audit coverage

| Audit area | What reaches the report |
|---|---|
| Product performance | Named products, spend, return, visibility, and closed performance groups |
| Tracking | A safety gate before conversion-dependent claims and a measured tracking finding when broken |
| Account structure | Campaign structure, bidding, budget, and account-level settings exposed as repair points |
| Performance Max | PMax campaign and asset-group checks exposed as repair points when the source is available |
| Standard Shopping | Shopping coverage and dilution checks exposed as repair points when the source is available |
| Search campaigns | Search campaign and responsive-ad checks exposed as repair points when the source is available |
| Negative keywords | Toxic negatives, including brand blocking and sold-product blocking |
| Search terms | Paid terms with spend and zero conversions, measured on their stated 30-day window |

## Source availability and failure visibility

This table describes current application behavior, including silent omissions. It is not a target
state or a claim that every failure is disclosed.

| Source | Availability | Client-visible failure behavior | Downstream dependency |
|---|---|---|---|
| Primary product catalog | Required | Explicit recovery page | Enables the report |
| Short-window product catalogs | Optional | Silent omission | Enables the catalog map when at least one read succeeds |
| Tracking | Optional fallback | Explicit unknown-tracking finding and quarantined conclusions | Gates conversion-dependent conclusions and Shopping analysis |
| Account structure | Optional | Silent omission | Enables structure findings, contributes simulator inputs, and is required by PMax analysis |
| Raw Performance Max data | Optional | Silent omission | PMax findings require both this source and account structure |
| Raw Standard Shopping data | Optional | Silent omission | Enables Shopping findings |
| Raw Search data | Optional | Silent omission | Enables Search findings |
| Keyword data | Optional | Outer failure is silent; only the narrower search-term visibility gap can produce a caveat | Enables negative-keyword and paid search-term findings |
| Annual totals | Optional fallback | Server log only; no client-visible source-failure message | Supplies monthly spend and current return, with structure fallback |

The executable mapping for every report source, analysis call, rendered surface, and guard lives
in `app/google-ads/raport/report-contract.tsx`. The report consumes its execution and rendering
helpers directly. `references/report-contract.json` is a validated documentation projection, not a
second behavioral registry. Its validator uses the TypeScript compiler and runs rendered boundary
tests; a newly reachable ungoverned step or visible surface fails.

Public copy verification is output based. The application renders each registered normal, demo,
recovery, error, and relevant zero/one/many state, then compares its complete normalized structure
with committed human-readable snapshots. Each closed state has one input witness and exactly one
snapshot. The same rule covers complete metadata values and observed status, headers, redirects, and
bodies from every public OAuth handler branch. Typed placeholders declare nonempty source values and
exact occurrence counts. Visible and screen-reader text, semantic node order, roles, accessible names,
image alternatives, and navigation destinations remain reviewable. An independent semantic oracle
checks the OAuth facts even when source and snapshot are changed together. Source-graph analysis proves
inventory completeness; it does not decide whether prose is truthful by matching words. The dedicated
public-output coverage command requires 100 percent branch coverage for the complete mechanically derived
transitive local module graph, including non-JSX helpers, JavaScript modules, and untouched registered files,
while structural state tests provide the actual input and normalized output witnesses. A local artifact cannot
authenticate a reviewer;
the root orchestrator uses the verdict in the live collaboration thread as the publication decision.
Placeholders replace only their declared node path and text or attribute position; identical static prose
at another node remains unchanged.

## Report surface contract

The output is the web report at `/google-ads/raport`. A successful report has a stable order, but
some sections depend on data that Google may not return.

| Surface | Availability | Condition and meaning |
|---|---|---|
| Headline and summary | Always | Render after the primary catalog read succeeds |
| Money findings | Always | The section exists; individual finding cards depend on measured findings |
| Product catalog map | Conditional | Render only when at least one short-window catalog read succeeds |
| Account settings | Conditional | Render only when structure, PMax, Standard Shopping, Search, or negative-keyword analysis produces repair points |
| Unsupported conclusions | Conditional | Render only when tracking or another evidence gate quarantines a conclusion |
| Cu Devrika simulator CTA | Conditional | Render only when account structure and a nonzero current ROAS are available |
| Contact form | Always | Render after findings on every successful report; it is not an audit input gate |
| Honesty and caveats | Always | Define measured, estimated, and simulated figures; this section does not disclose every optional-source failure |
| Catalog unavailable recovery | Alternative | Replace the report when the primary catalog read fails; offer retry and direct contact |

The simulator itself lives at `/google-ads/impreuna`. It uses account spend and current ROAS when
structure is readable, lets the user change CPC and conversion assumptions, and requires the user
to enter the commercial offer. It is a labeled simulation, not a measured audit finding.

## Completion test

The audit is valid when:

1. Every Google Ads API operation implemented by the application is a read, and no account
   mutation is performed. The OAuth scope itself is not described as read-only.
2. The date window contains exactly 365 inclusive account-calendar dates and ends on today's date
   in the selected account time zone.
3. Catalog-only products survive the catalog/performance join.
4. Every product appears in exactly one group.
5. Broken tracking suppresses unsupported product-ROAS claims.
6. Product names and classifications render on the client-facing report.
7. Tracking, account structure, Performance Max, Standard Shopping, Search campaigns, negative
   keywords, and search terms are represented when their source and finding conditions are met.
8. Conditional surfaces and each source's actual failure visibility are documented; the contact
   form and honesty section remain present on every successful report.
9. The `Cu Devrika` simulator remains separate from measured-loss totals and never presents its
   assumptions as account facts.
