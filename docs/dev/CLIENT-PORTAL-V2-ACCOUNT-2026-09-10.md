# Client identity and report access

## Document status and authority

This is the pre-implementation component document for contract point 1. It records the measured local baseline separately from the approved change. It does not claim that client account authentication or owner-bound report access is implemented.

The product authority is [Client Portal V2 Account, Billing, and Reporting Design](../superpowers/specs/2026-09-10-client-portal-v2-account-design.md), approved on 2026-09-10 as `client-portal-v2-account-design@2026-09-10` with SHA-256 `1eeec4d1ef904948e2db7f799c80a057e14856b6cb85eb68922b31bc9225fde5`. The frozen delivery contract remains the implementation authority for this increment.

## Measured current state

The local baseline at revision `071c8be27d52edc015d0f355dcf0dd5a3ddb166c` is **CONFORMANT**. Component-governance assessment identity: `137ef393dcd8704f3f822c09c1b28150ec58306c3c07dc6a82c48bfa8b4ca896`.

The assessment passed all three existing-standard checks:

1. `existing-report-contract-remains-unchanged` — the handed-off revision has no baseline difference in the existing report and portal trees, report-period code, or declared regression sources. Both the token portal and internal saved-report route still delegate to the existing `ReportingDashboard`, so current routes, rendering, fields, calculations, and snapshot behavior remain the measured baseline. Missing future client-account behavior was not counted as a baseline defect.
2. `existing-manager-session-remains-internal-only` — `dashboard_session` is a separate server-side manager session bound to manager credentials. Its cookie path and proxy guard are limited to `/dashboard`, protected manager routes require manager access before reading data, and client portal routes do not consume this session.
3. `existing-portal-token-does-not-authorize-client-profile-mutation` — the current opaque token selects token-scoped report records, opens signed stored snapshots, and renders the existing report. The portal exposes no write endpoint or client-profile mutation authority. This is current read-only token portal behavior, not future client authentication.

## Planned local change

This increment will add a new client identity and report-access foundation on the new client application surface:

1. One verified email will resolve to one immutable client identity. Google sign-in, an emailed one-time code, and email with password will all authenticate that same identity; changing methods must not create a duplicate client.
2. Account linking will require verified ownership of the shared email. Passwords will use a memory-hard hash. One-time codes will be short-lived, single-use, attempt-limited, and stored only as hashes.
3. Client sessions will use secure, HttpOnly cookies with bounded expiration and rotation. Authentication failures will not disclose whether an account exists, and invalid or expired one-time codes will create no session.
4. Every client-owned report resource will carry an immutable client owner identifier. Every server-side report read will validate both the authenticated client identity and the resource owner. A report link, opaque token, route parameter, or other client-supplied identifier will remain a selector and will never grant authority by itself.
5. Sensitive mutations added by this increment will require the authenticated owner and CSRF protection. Secrets, raw passwords, raw one-time codes, and Google refresh tokens must not appear in logs, reports, source control, or client-visible errors.

## Required negative controls

Local verification must prove both authorized access and refusal behavior:

1. All three sign-in methods for the same verified email produce the same client identity.
2. A valid client session can open a report owned by that client.
3. A planted second-client report identifier reveals zero Google Ads fields and creates no mutation.
4. Forged, expired, and logged-out sessions each reveal zero Google Ads fields and create no mutation.
5. Invalid and expired one-time codes create no session. Missing or invalid authentication configuration must fail closed.
6. A current opaque portal token does not authorize client-profile or account-owned resource mutation.
7. Each refusal control has a valid passing counterpart, and refusal verification includes a known-positive Google Ads field control so that an absence claim cannot pass against an empty fixture.

## Frozen behavior

This increment must preserve the existing report renderers, calculations, signed report snapshots, manager authentication, and current token portal behavior. The existing V1 and current V2 report routes, fields, formulas, labels, values, period semantics, product classifications, and snapshots must remain byte-for-byte or behaviorally unchanged under their declared regression checks.

The protected implementation paths are:

1. `app/google-ads/raport/ReportingDashboard.tsx`
2. `app/google-ads/raport/ReportingDashboard.test.tsx`
3. `app/google-ads/portal/portal-report.tsx`
4. `lib/dashboard-session.ts`
5. `lib/gads-report-periods.ts`

Completion requires the report regression suite, manager authentication regression suite, and current V2 render witness to remain unchanged and passing.

## Increment boundary

The target environment is **local only**. This documentation phase changes no application code. The later implementation for this point is limited to client identity, credentials, secure sessions, account linking, owner-bound report authorization, login UI, route guards, local migrations, tests, dependency declarations, and the project-owned check mapping named by the frozen contract.

This increment excludes deployment, publication, production data or configuration changes, billing-profile editing, payment details, subscription checkout, trials, entitlement lifecycle, fiscal invoicing, dynamic reporting ranges, and report redesign. Those remain separate dependency-ordered increments under the approved design. The current manager session remains an internal manager mechanism; it must not be repurposed as client authentication. The current portal token may later support migration or a one-time claim, but it must not become authority for authenticated client report access or mutable account data.
