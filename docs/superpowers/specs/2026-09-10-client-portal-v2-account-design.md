# Client Portal V2 Account, Billing, and Reporting Design

## Status

Approved by the operator on 2026-09-10. This document defines the intended V2 behavior. The existing report route and every existing report field, formula, label, and value remain frozen unless a later contract explicitly changes them.

## Product boundary

The V2 portal becomes an account-based application. A customer can authenticate, manage their own business and billing profile, manage a subscription, and view Google Ads reports only while entitled. The first implementation increment is client identity and server-side report isolation. Billing profile, subscription collection, and dynamic reporting ranges follow as separate dependency-ordered increments.

The existing V1 and current V2 report rendering remain unchanged. New account behavior is added only to the new V2 application surface.

## Approved user experience

The upper-left sidebar contains a compact customer card showing avatar, customer name, and business name. It opens the customer profile and billing area. Directly below it, a period pill controls the currently displayed report. The report navigation remains below these controls and includes Overview, Products, Before & after, and Tracking.

The visual language follows the approved `google-ads-checklist.test` direction and the existing V2 design tokens. The change must not remove or rename any report data field.

## Identity and ownership

Each verified email address maps to one client identity. The same identity supports Google sign-in, an emailed one-time code, and email with password. Switching sign-in methods must not create duplicate clients.

Every client-owned resource carries an immutable client owner identifier. Server-side authorization validates the authenticated client and the resource owner on every read and write. A report link or client-supplied identifier never grants authority by itself. Cross-client requests return no report data and create no mutation.

The current opaque portal token can support migration or a one-time account claim, but it cannot remain the authority for mutable billing data or authenticated report access.

## Billing profile

The client manages a Romanian billing profile containing entity type, legal or personal name, CUI or CNP as applicable, Trade Register number when applicable, street address, county, locality, country, postal code, and billing email. Validation is conditional on entity type. Payment-card data is never collected or stored by this application.

## Subscription

The launch offer is one subscription at 50 RON per month plus applicable VAT. The customer supplies a payment method through the payment provider when starting a seven-day free trial. The checkout discloses the net price, applicable VAT, total, and first charge date. No charge occurs during the trial. Automatic monthly collection starts on day eight unless the subscription is canceled.

Cancellation preserves Google Ads report access until the paid-through timestamp. After entitlement expires or a payment becomes terminally unpaid, the customer can still authenticate and access account settings, billing history, and reactivation, but every Google Ads metric and report is hidden. Stored report data is retained. Reactivation restores the retained history and permits new report generation.

Payment-provider events are verified on the server, processed idempotently, and reconciled with fiscal invoice records. Payment details remain with the provider. Fiscal invoicing is a separate lifecycle and integration boundary.

## Reporting periods

The period pill defaults to Last month, defined as the previous completed calendar month in the Google Ads account timezone. Last 30 days is a distinct rolling range ending yesterday. The available options are Last month, Last 30 days, Last 3 months, Last 6 months, Last 12 months, All time, and Custom.

Selecting a preset starts report loading immediately. Custom starts only after both dates form a valid range. All time means all history actually available from the connected Google Ads source and must not imply data that Google no longer exposes.

A newly requested range is collected and saved as an immutable account-owned report snapshot. Reopening the same valid snapshot may reuse it. The interface must not silently substitute a different period when the requested range is unavailable.

## Security and privacy invariants

Authentication, entitlement, and resource ownership are independent server-side checks. A valid login without active entitlement does not reveal report data. Active entitlement without resource ownership does not reveal another customer's data. Client-controlled identifiers are treated as selectors, never authorization.

Sessions use secure, HttpOnly cookies with bounded expiration and rotation. Passwords use a memory-hard password hash. One-time codes are short-lived, single-use, attempt-limited, and stored only as hashes. Account linking requires verified ownership of the shared email address. Sensitive operations use CSRF protection and auditable events.

No secret, payment credential, raw password, raw one-time code, or Google refresh token is written to logs, reports, source control, or client-visible error messages.

## Error behavior

Authentication failures disclose no account-existence information. Invalid or expired one-time codes create no session. Payment or entitlement failures leave the account surface accessible but render a neutral reactivation state instead of report data. Report collection failures preserve the last selected range and explain that the requested report could not be generated; they do not show stale data as if it belonged to the new range.

## Delivery sequence

1. Client identity, session security, account linking, and server-side report isolation.
2. Client profile and Romanian billing profile.
3. Subscription checkout, trial, webhook-driven entitlement, cancellation, and reactivation.
4. Period pill and immutable on-demand report generation.
5. Final integrated visual, accessibility, security, and regression verification.

Each increment is independently implemented, reviewed, and directly verified before the next begins.

## Acceptance summary

1. One verified email produces one client identity across all three login methods.
2. An authenticated client can read only their own account-owned report resources.
3. Billing fields are editable only by their owner and never contain payment-card data.
4. Trial and subscription states expose report data exactly while entitlement is active.
5. The period pill implements the approved seven choices and defaults to Last month.
6. Existing report fields and calculations render unchanged on the frozen report surfaces.
7. V1 and the current V2 route remain unchanged until the new V2 surface is explicitly selected.
