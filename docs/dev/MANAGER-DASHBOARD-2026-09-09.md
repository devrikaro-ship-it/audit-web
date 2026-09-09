# Reporting manager dashboard

## Authorized scope

The operator requested one row per store that configured reporting and generated a report in this application. Rows show the store, the registrant's contact details, reporting status, measured performance against the report target, and direct report access. The operator explicitly excluded importing the agency's Google Ads MCC accounts. Earlier MCC discovery is superseded and must not feed this feature.

## Measured starting point

At revision c886a45444896ab5c9af4b94ee2ae84882926a79, `/dashboard/google-ads` lists individual contact submissions and PDF links. `listLeads` reads the persistent report/contact ledger. Multiple submissions can reference the same Google Ads account. Signed report snapshots and a shared report renderer already exist. The dashboard uses existing manager Basic authentication. Production preflight found zero saved leads and nine temporary, session-bound report staging directories; temporary reports are not registered saved reports and are outside this directory.

## One complete component

Replace that contact list with a searchable manager table, grouped by the stored Google Ads customer ID. Include records with a report ID, including a failed or unavailable stored report so its problem remains visible. Exclude contact-only entries, temporary staging data and external MCC accounts. Missing account identifiers do not justify merging unrelated contacts; each such record remains distinct.

Use the latest registered report per account for contact details and status. Recurring reporting is active only when `serviceReportsEnabled` is explicitly true; false means inactive, missing means unknown. Stored report availability is a separate label. A valid one-time report remains readable when recurring reporting is inactive. No toggle, collection job or email send is added.

Derive ROAS and CPA from the selected-period measured totals in the signed snapshot, never from simulated totals or lead-entered targets. Show the snapshot targets, the period, timestamp and account currency. Zero spend or missing supported evidence is unavailable, not automatically below target. Preserve legacy unknown currency/period semantics. Compare unrounded numbers; equality meets target.

An authenticated manager can open each exact saved report through an internal route keyed by the existing lead identifier and switch among that account's saved reports. Missing, invalid or untrusted snapshots produce an unavailable state, never a fallback to another account. The manager page exposes no report bearer tokens, signing bytes or storage paths. Authentication is enforced before storage reads as well as by the existing proxy.

## Verification and publication

Use a witnessed regression against the current page, real temporary storage with signed fixtures for account grouping, thresholds, unavailable states, no-secret projection and exact report selection, and an authenticated browser walkthrough for search and row navigation. Review the exact revision independently, publish through the existing deployment mechanism and verify the actual production population and unauthorized refusal. Production is currently empty; a populated fixture proves controls and must never be described as a real customer. No real email, enrollment, Google data collection, credential change or offer-page change is authorized.

## Language and limitations

New product copy and source are English. Older dashboard pages and inherited comments elsewhere remain translation debt. This component does not add user registration or retain temporary reports beyond their existing lifecycle. An account appears after its report is saved through the existing delivery flow.
