# Client identity, authentication, and report ownership/access

## Status and authority

Contract point 1 for immutable client report ownership and server-side report isolation is implemented and independently verified in the local environment at exact revision `ed4823bf1c71575665f4ef75c4393d5e05e3def9`. It extends the authentication HTTP boundary verified at `31872105dec19a79820d028e03e98add2a13eb1f`, the authentication services verified at `9b4afe72e5545922da3268ca176f9178a6d59060`, and the identity/session core verified at `098f82153175bc47583239a7c39c6d9987fdba22`; it does not replace or weaken those predecessors.

This is local verified readiness, not live report availability. The server route and report renderer were proved with an explicitly injected active entitlement in the verifier, while the application call uses the server-only deny-all default until a real entitlement provider is integrated. Broader client UI, billing, subscription truth, arbitrary reporting periods, publication, and deployment remain future work.

The product authority remains [Client Portal V2 Account, Billing, and Reporting Design](../superpowers/specs/2026-09-10-client-portal-v2-account-design.md), approved on 2026-09-10 as `client-portal-v2-account-design@2026-09-10` with SHA-256 `1eeec4d1ef904948e2db7f799c80a057e14856b6cb85eb68922b31bc9225fde5`. The frozen implementation authority for report ownership and access is `/Users/VladMoloso/.codex/runs/client-report-access-20260911-r2/contract.md`, SHA-256 `12e2691dd91731e3eced01e14ec386a97a8ebc7eae2f28a2f8a2912d07290b08`. The preceding HTTP authority remains `/Users/VladMoloso/.codex/runs/client-auth-http-20260911-r2/contract.md`, SHA-256 `896d2482eb877e723d189c8f1cbfb30e5763b3a6ca024e448852c339d3588c9b`; the authentication-service authority remains `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/contract.md`, SHA-256 `e6ba067b3efc610632c25d0aea30aa4f96a03ef1bef59cf1a1c446a8f98f945c`.

## Verified local report ownership and access

### Immutable ownership persistence and provisioning

1. Migration `db/client-identity/003_report_ownership.sql` adds one owner row per report. The report ID is the primary key, the client identity is an immutable foreign key, and triggers refuse duplicate assignment, ownership update, and deletion.
2. Reopening a fresh local database applied migrations `001`, `002`, and `003` exactly once; a second open left the same migration set and one recorded application of version `3`.
3. Report IDs must match `^[A-Za-z0-9-]{1,128}$`. They are selectors only: neither a report ID nor a legacy portal token grants ownership or report authority.
4. Provisioning exists only behind `NODE_ENV=test` and the explicit `CLIENT_REPORT_ACCESS_TEST_PROVISIONING=1` gate. There is no production ownership mutation service.

### Owner-scoped services and ordered gates

1. The read service authenticates the opaque `client_session`, looks up immutable ownership, evaluates the separately injected server-only entitlement, validates the configured report root and canonical snapshot path, opens a safe file, and verifies its signature in that order. An earlier gate does not substitute for a later one.
2. The list service returns only owned metadata and never report payload fields. Ordering is deterministic: `created_at DESC`, then `report_id ASC`.
3. The default entitlement implementation denies every request. Inactive, unavailable, expired, revoked, false, or throwing entitlement decisions fail closed and cannot be inferred from authentication, ownership, report ID, token, or client input.
4. Snapshot resolution accepts only the canonical `<configured-root>/<reportId>.snapshot` association, beneath an explicit absolute root. It rejects traversal, alternate cross-linked report files, symlinks, non-regular files, missing files, files larger than 16 MiB, corrupt envelopes, invalid signatures, and changed signed bytes.
5. Every denial, absence, configuration failure, validation failure, I/O failure, signature failure, and caught exception returns the same absence result. Refused reads and lists reveal no Google Ads field and make no prohibited database or filesystem mutation.

### Authenticated report route and faithful adaptation

1. `app/client/reports/[reportId]/page.tsx` reads only the `client_session` cookie and treats the route parameter as a selector. It delegates authority to the owner-scoped service and converts every absence or service exception to the same framework `notFound()` outcome.
2. With a valid owner session and verifier-injected active entitlement, the route rendered the existing Google Ads report, including the known-positive report field, product and profitability heading, Before & after source, and Tracking observation.
3. Accepted report V2 snapshots flow through the existing report builder. Existing report fields, formulas, currency, periods, products, Before & after source, and Tracking observation remain unchanged. A legacy signed snapshot is adapted without inventing dates: its selected range is marked `UNAVAILABLE`.
4. The existing opaque token portal and manager report remain separate, unchanged surfaces. The new route does not turn legacy tokens into authenticated client authority.

### High-severity review finding and repair

Independent review rejected revision `9f56fffe178413d432af33bfc420065eb68cd77a` with one high-severity finding. A valid signed snapshot could be stored under one report's ownership row while its path named another valid report; containment, regular-file, extension, and signature checks all passed, so the wrong report owner could receive the other report's Google Ads payload.

Revision `ed4823bf1c71575665f4ef75c4393d5e05e3def9` repairs the property by requiring every ownership row to resolve exactly to the canonical snapshot for its own report ID before any bytes are opened. The repair adds a two-client, two-valid-snapshot crossed-path control for both read and list. Removing that association guard produced the expected failure—43 of 44 tests passed and both foreign marker fields were exposed—while restoring it returned the suite to 44 of 44 with neutral absence, no disclosure, no prohibited mutation, and both positive owner reads restored.

### Report-access evidence

1. Code proof: `/Users/VladMoloso/.codex/runs/client-report-access-20260911-r2/code-proof-input.json`. It binds exact revision `ed4823bf1c71575665f4ef75c4393d5e05e3def9` to 44 of 44 passing focused report-access tests and all nine passing impact checks: identity core, authentication methods, authentication HTTP, report access, their scoped TypeScript checks, and the exact-scope/preservation gate.
2. Review finding: `/Users/VladMoloso/.codex/runs/client-report-access-20260911-r2/review-finding.json`. The repair result is `/Users/VladMoloso/.codex/task-runs/tasks/client-report-access-repair-1/attempts/20260911T075637732950Z-8eb9a3f0bf0c48a6804a56c3eeed17ae/result.json`; the independent passing re-review is `/Users/VladMoloso/.codex/task-runs/tasks/client-report-access-rereview/attempts/20260911T080943212591Z-8ef19fddf12643bdb131726c66b3aa7f/result.json`.
3. Independent service witness: `/tmp/client-report-access-service-witness.json`, retained by `/Users/VladMoloso/.codex/task-runs/tasks/client-report-access-service-verify/attempts/20260911T083609744807Z-d041a6220a0d40dd962815cbffee0e2a/result.json`. Against a verifier-created SQLite database and report root, it proved separate sessions and signed snapshots for two clients, a known-positive owner field, metadata-only deterministic lists, 22 neutral refused reads, and 8 neutral refused lists. Database and filesystem state stayed unchanged across every refusal.
4. Independent route witness: `/tmp/client-report-access-route-witness.json`, retained by `/Users/VladMoloso/.codex/task-runs/tasks/client-report-access-route-verify/attempts/20260911T091450003378Z-5c14fcbdb3e64408bab060495202ba12/result.json`. One valid owner session rendered all five required markers. Missing, forged, revoked, expired, cross-client, inactive-entitlement, service-exception, and legacy-token-only controls produced eight identical `notFound()` outcomes and zero report-marker disclosures.
5. Combined result proof: `/Users/VladMoloso/.codex/runs/client-report-access-20260911-r2/result-proof-input.json`. Across both independent witnesses, 38 refusal observations—22 reads, 8 lists, and 8 routes—were neutral and mutation-free. These are local proofs only; they include no production provider, migration, publication, or deployment.

## Verified local identity and session core

### Canonical identity and migrations

1. Email identity normalization applies Unicode NFC, trims surrounding whitespace, and lowercases the result before lookup or insertion.
2. The canonical email has a unique constraint, and an inserted identity row is immutable. Case, whitespace, and equivalent Unicode variants therefore resolve to the same opaque client identity instead of creating duplicates.
3. SQLite migration `db/client-identity/001_initial.sql` remains byte-identical at SHA-256 `9021589d64df98a049606d02a126c856a1e84b6591e637b23189f56fe28c7262`.
4. The deterministic migration runner applies known migrations in version order. Against a new local SQLite database, migrations `001` and `002` each applied exactly once even when the runner was invoked repeatedly.
5. The database is opened only from an explicit absolute `CLIENT_IDENTITY_DB_PATH`. Missing or invalid core configuration fails before database creation or mutation.

### Sessions, rotation, revocation, and cookies

1. A session token contains 32 cryptographically random bytes, or 256 bits. Raw session and CSRF tokens are returned only to the caller; SQLite stores secret-keyed HMAC-SHA-256 hashes.
2. Sessions expire after 24 hours. Rotation is eligible after 12 hours and can be forced for a later authentication or security change. Successful rotation revokes the old row and issues a replacement in one transaction.
3. The core exposes single-session and all-client revocation operations. The authentication service uses the existing core to issue sessions and uses all-client revocation during password enrollment. The verified HTTP boundary revokes the current session during logout and replaces all prior sessions during password enrollment; any separate password-change experience remains future work.
4. The session cookie options are `HttpOnly`, `SameSite=Lax`, `Path=/client`, 24-hour `Max-Age`, and `Secure` outside local development. The client CSRF cookie is intentionally readable by the client, remains `SameSite=Lax` and scoped to `/client`, and uses the same 24-hour bound. The opaque authentication-flow cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/client`, and limited to 10 minutes.
5. The verified HTTP handlers use those cookie option builders for accepted local responses. No deployed response is claimed.

### CSRF and authentication flows

1. Each issued session has a synchronizer CSRF value whose raw form is not stored. Session CSRF verification accepts only the matching secret-keyed hash for an active, unexpired session.
2. An authentication flow uses separate 256-bit opaque flow and CSRF values. The server-side row stores only keyed hashes and binds the proof to the configured exact origin and a validated source IP.
3. Authentication flows expire after 10 minutes and are consumed atomically once. Forged values, expiry, origin or IP mismatch, and replay are refused without a successful state mutation.
4. The HTTP boundary owns authenticated-caller enforcement, login-flow CSRF wiring, trusted-proxy source-IP extraction, and cookie issuance. Those concerns remain separate from the unchanged service revision.

## Verified local authentication-method services

### Fail-closed configuration and adapter boundaries

1. Authentication configuration extends the core requirements with a dedicated 32-to-4,096-byte `CLIENT_OTP_SECRET`, a Google client ID, and production email-delivery configuration. The OTP secret is distinct from the session secret. Missing, malformed, unsafe, or test-only production configuration is rejected before an authentication mutation.
2. The production Google adapter calls `google-auth-library` `verifyIdToken` with the configured audience. The service then independently requires the accepted Google issuer, exact audience, unexpired token, non-empty provider subject, canonical email, and `email_verified=true`.
3. Production email delivery requires an exact HTTPS endpoint without user information or a fragment, a bounded API key, and a syntactically valid sender. The adapter sends one bounded JSON login-code request with a five-second timeout, accepts only a 2xx response, does not log the payload, and maps every delivery failure to the same neutral result after invalidating the challenge.
4. The Google and email test adapters require `NODE_ENV=test` plus their separate explicit enable flags. The test OTP also requires an explicitly configured six-digit value. Any test-adapter flag is rejected outside test mode, so the test adapters cannot be selected in a non-test environment.
5. Verification used only those explicit local test adapters and new temporary SQLite databases. It made no real Google request and sent no real email.

### Emailed one-time code

1. A permitted request creates exactly one six-decimal-digit OTP challenge with a 10-minute lifetime. A successful verification consumes it once; invalid attempts are limited to five, and expired, replayed, or exhausted challenges issue no session.
2. Resends are limited to one per 60 seconds. Sending is also limited to five requests per rolling hour independently for the canonical-email hash and canonical-source-IP hash.
3. A permitted resend consumes every earlier active challenge for that canonical email before inserting its replacement in the same immediate transaction. A delivery failure consumes the newly inserted challenge, so an undelivered code cannot authenticate.
4. Raw OTPs, canonical emails, and source IPs are not stored in the challenge or rate-limit rows. Keyed HMAC inputs are length-framed and domain-separated as `otp-code`, `otp-email-rate`, and `otp-ip-rate`, and use only the fields required by that domain.
5. OTP request results remain `{ accepted: true }` for new or existing identities, throttling, and delivery failure. The outward response therefore does not disclose whether an account exists or whether delivery occurred.

### Verified Google identity resolution

1. A verified Google credential resolves its canonical email through the same immutable client identity boundary used by OTP and password authentication.
2. A Google provider subject binds once to one client and one canonical email. A bound subject later claiming a different email, or another subject claiming an email with an existing Google binding, is refused.
3. Unverified, malformed, expired, wrong-issuer, wrong-audience, empty-subject, and conflicting Google credentials create no prohibited identity, binding, session, or audit mutation and return no account-existence signal.

### Password enrollment and login

1. Password enrollment is a service operation for an already verified client identity. Passwords must contain 12 to 128 characters and are persisted only as Argon2id hashes with 64 MiB memory, three iterations, and parallelism one.
2. Enrollment replaces the credential, revokes every existing session for that client, and issues exactly one replacement session in the same immediate transaction.
3. Login for an unknown account and login with a wrong password return the same neutral failure. Both known and unknown paths await the same dummy-hash initialization before choosing the verification hash and perform equivalent Argon2 work.
4. After password verification, the issuance transaction re-reads and securely compares the credential hash before creating a session. If a concurrent password replacement changed that credential, the obsolete password creates no session.
5. Successful OTP, Google, and password authentication delegates to the unchanged 24-hour session core and resolves canonical variants of one email to one immutable client ID.

### Persistence, audit redaction, and repaired properties

1. Migration `002` adds the authentication challenges, rate-limit state, Google bindings, and password credentials required by the service. The stored credential material is limited to Argon2id password hashes or domain-separated keyed hashes; raw OTPs, passwords, session tokens, source IPs, canonical emails in rate keys, provider credentials, and configuration secrets are not persisted in those credential fields.
2. The closed audit vocabulary contains the seven verified core categories plus exactly `auth.otp.requested`, `auth.otp.delivery_failed`, `auth.otp.succeeded`, `auth.google.succeeded`, `auth.password.changed`, and `auth.password.succeeded`.
3. Audit rows contain only event ID, category, an optional opaque client ID, and timestamp. They do not contain email, provider subject, source IP, password, OTP, session token, CSRF value, or secret.
4. The repaired concurrency property is transactional credential continuity: a password verified before a concurrent change cannot issue a session after that change.
5. The repaired work-equivalence property is equal Argon2 work for known and unknown accounts: cold paths each performed one hash plus one verification, and warm paths each performed zero new hashes plus one verification.
6. The repaired source-address property validates and canonicalizes IPv4 and IPv6 before challenge binding or rate hashing. Empty, `unknown`, whitespace-altered, malformed, and compound forwarding strings are rejected before mutation; equivalent compact and expanded IPv6 spellings share one challenge continuity key and one rolling-hour rate limit.

## Verified local authentication HTTP boundary

### POST-only route surface

The exact verified route surface contains these seven handlers and no additional authentication method exports:

1. `POST /client/api/auth/bootstrap`
2. `POST /client/api/auth/otp/request`
3. `POST /client/api/auth/otp/verify`
4. `POST /client/api/auth/google`
5. `POST /client/api/auth/password/login`
6. `POST /client/api/auth/password/enroll`
7. `POST /client/api/auth/logout`

Every route runs on the Next.js Node.js runtime with forced dynamic execution and exports only `POST`. The independent witness exercised every route with an unsupported method: each framework-owned control returned `405`, did not invoke the handler, issued no cookie, and created no identity, flow, challenge, binding, credential, session, or audit mutation.

### Origin, JSON, and source-address framing

1. Every accepted POST requires the supplied `Origin` to be a syntactically exact origin and to equal the configured `CLIENT_APP_ORIGIN`. `Referer` and `Sec-Fetch-Site` do not substitute for that check.
2. Every JSON-bearing request accepts only `application/json` with an optional UTF-8 charset, rejects declared or observed bodies larger than 16 KiB, requires valid UTF-8 and valid JSON, and requires a non-array object. Malformed JSON, scalar or array JSON, an invalid or unsupported content type, invalid UTF-8, and oversized bodies are rejected before the dependent operation.
3. Test and production configurations require an explicit canonical decimal `CLIENT_TRUSTED_PROXY_HOPS` from 1 through 8. The `X-Forwarded-For` value is bounded to 1,024 UTF-8 bytes and 16 non-empty entries; every entry must be a bare valid IP address after optional horizontal-whitespace trimming. IPv4 text is preserved and IPv6 text is canonicalized.
4. The request source is the entry at `chain.length - trustedProxyHops`. A missing, short, oversized, empty, malformed, or spoofed chain is rejected. `Forwarded` and `X-Real-IP` are ignored.
5. Zero trusted hops are accepted only in local development with a loopback application origin and bind the request to that loopback address. Zero hops in test or production, non-canonical hop values, and non-loopback development origins fail closed as unavailable configuration.

### Login-flow and synchronizer-CSRF boundaries

1. Bootstrap creates a source- and origin-bound flow with a 10-minute lifetime, returns only its CSRF value in JSON, and issues only the opaque `client_auth_flow` cookie. Every subsequent flow operation requires that cookie, the matching value in `X-CSRF-Token`, the exact origin, and the same derived source address.
2. OTP request verifies but does not consume the flow. A framing refusal does not consume or clear an otherwise valid flow, while accepted new-account, existing-account, throttled, and delivery-failure paths retain the same `{ accepted: true }` response.
3. OTP verification, Google login, and password login atomically consume the single-use flow before parsing or checking the credential. A malformed credential request therefore burns the flow, and a forged, expired, mismatched, or replayed flow cannot authenticate.
4. Password enrollment and logout require an active session, the exact request origin, and a matching `X-CSRF-Token` synchronizer value. They also derive and validate the current request source address before any credential, session, or audit mutation.
5. Password enrollment delegates to the verified service transaction that replaces the credential, revokes all prior client sessions, and issues one replacement session. Logout revokes the presented current session before returning cleared authentication cookies.

### Responses, cookies, cache control, and disclosure

1. Successful OTP, Google, and password login responses contain only `{ authenticated: true }`, issue the approved `client_session` and client-readable `client_csrf` cookies, and expire `client_auth_flow`. Password enrollment performs the same session/CSRF replacement. Logout returns `{ authenticated: false }` and expires all three cookies.
2. All three cookies are `SameSite=Lax`, scoped to `/client`, and `Secure` outside local development. `client_session` and `client_auth_flow` are `HttpOnly`; `client_csrf` is intentionally readable. Session and CSRF cookies have a 24-hour bound, while the flow cookie has a 10-minute bound.
3. Credential, flow, session, origin, source-address, CSRF, and request-framing refusals issue no authenticated cookie. Authentication failures use the neutral `401` body `{ authenticated: false }`; missing or unsafe HTTP configuration uses only the `503` body `{ error: "Client authentication is unavailable" }`.
4. Every application-owned response is JSON with `Cache-Control: no-store`. Responses disclose no client ID, canonical email, account-existence signal, provider credential, session token, flow token, CSRF value beyond the intentional bootstrap proof, configuration value, or secret; the boundary adds no sensitive logging.

### Review finding and source-address repair

Independent review rejected revision `6065d797eeb98beacfe760d217f54732cf0850a4` even though its 16 HTTP tests, 14 authentication-service tests, 5 identity/session tests, and scoped type checks were green. Password enrollment and logout validated the trusted-hop configuration but did not derive the current request source address. Missing or malformed `X-Forwarded-For` input could therefore reach successful credential or session mutations.

Revision `31872105dec19a79820d028e03e98add2a13eb1f` repairs both handlers by requiring `requestSourceIp(...)` before origin, session, CSRF, or body-dependent mutations and adds four focused regression cases: missing and malformed forwarding input for password enrollment and for logout. The reviewer removed both guards as a negative control and observed all four cases fail by reaching mutation-capable `200` responses; restoring the guards returned all four to neutral `401` refusals with no prohibited mutation.

## Independent evidence

### Authentication HTTP boundary

1. Frozen contract: `/Users/VladMoloso/.codex/runs/client-auth-http-20260911-r2/contract.md`, SHA-256 `896d2482eb877e723d189c8f1cbfb30e5763b3a6ca024e448852c339d3588c9b`. It declares the exact local acceptance, seven routes, frozen predecessors, and 12-path change scope.
2. Code proof: `/Users/VladMoloso/.codex/runs/client-auth-http-20260911-r2/code-proof.json`. It binds the repaired candidate to 20 passing HTTP tests, 14 passing authentication-service tests, 5 passing identity/session tests, three passing strict TypeScript checks, and the passing exact-scope and preservation check.
3. Failed review: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-http-review/attempts/20260910T222000296460Z-3ea03e0f28f049d099615534e2fe9225/result.json`, with the extracted finding at `/Users/VladMoloso/.codex/runs/client-auth-http-20260911-r2/review-finding.json`. It binds rejected revision `6065d797eeb98beacfe760d217f54732cf0850a4` to the missing request-source derivation before password enrollment and logout mutations.
4. Repair result: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-http-repair-1/attempts/20260910T223031287868Z-163b22cf53624107bd8d15f4f4f656d7/result.json`. It records the two handler guards, four regression cases, witnessed guard-removal negative control, restored 20-test HTTP pass, and exact repair revision `31872105dec19a79820d028e03e98add2a13eb1f`.
5. Passing re-review: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-http-rereview/attempts/20260910T223753605131Z-df26b88442ce47fdb6e29269ad02a245/result.json`. The independent reviewer returned `TASK_SUCCEEDED` with no findings for the exact revision, reproduced all seven selected checks, witnessed the repaired negative control, and confirmed the declared path set and frozen digest.
6. Direct result proof: `/Users/VladMoloso/.codex/runs/client-auth-http-20260911-r2/result-proof.json`. It binds real `NextRequest`/`NextResponse` calls against a new local SQLite database to 19 positive responses, 41 refusal or unavailable responses, 28 prohibited-state comparisons, and all 7 unsupported-method controls.
7. Independent verifier finalization: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-http-verify-finalize/attempts/20260910T231040664437Z-f1621d3035e8410e95773508f8f5fac7/result.json`. It independently validated the completed witness at `/tmp/client-auth-http-verifier-result.json`, with canonical-content SHA-256 `a220aa0227adc2ee1fa6f74b2cb025183e02a1d0c8565ce8f5cd59d4e6113b37` after normalizing its self-referential `artifacts.result.sha256` field to `null`, and confirmed the same 19 positive, 41 refusal or unavailable, 28 state-comparison, and 7 unsupported-method counts. The verifier used explicit local test adapters, observed zero external fetches, made no repository mutation, and made no deployment claim.

### Earlier identity and authentication-service evidence

1. Baseline assessment: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-baseline/attempts/20260910T191328289930Z-0eefb8cba59444a6acc0d77f11e94b10/result.json`. It records `CONFORMANT` at `c72992bad1f908d20a1430b5adb2caa975cb426c`, with the verified core and committed report surfaces unchanged and the then-partial HTTP, UI, and report-access population unclaimed.
2. Code proof: `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/code-proof.json`. It binds the passing 14-test authentication check, the 5-test core check, scoped TypeScript checks, frozen-path receipts, and three witnessed negative controls to `9b4afe72e5545922da3268ca176f9178a6d59060`.
3. Failed review evidence: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-review/attempts/20260910T195604708807Z-15029f47295b49fcb3fc3dcac9f7a91f/result.json` and `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/review-finding.json`. They bind the rejected revision `4abedda12b43ed0edf17b27c47e8201c05df5b5c` to the three defects in credential concurrency, cold-path Argon2 work equivalence, and equivalent-IPv6 rate limiting.
4. Passing re-review: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-rereview/attempts/20260910T201845997102Z-81d6f4f4566e46c194385a51e4f8bc1d/result.json` and `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-rereview/checkpoint-payload.json`. The independent reviewer returned `TASK_SUCCEEDED` for `9b4afe72e5545922da3268ca176f9178a6d59060`, reproduced all four bounded checks, and witnessed each repaired property fail when its guard was removed and pass when restored.
5. Direct result proof: `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/result-proof.json`. It records both acceptance directions through the public service APIs against a verifier-created SQLite database.
6. Independent verifier: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-verify/attempts/20260910T203136625889Z-2b97f91cb17342629fd36eddac76e6cd/result.json`. The verifier returned `TASK_SUCCEEDED` for the exact local revision and retained the real witness at `/tmp/client-auth-methods-verifier.6XWmUS/real-result-receipt.json`.
7. The service verifier observed migrations `001` and `002` once each; one immutable identity across OTP, Google, and password variants; valid core sessions; password-change revocation; neutral refusal cases; Argon2id parameters `m=65536`, `t=3`, and `p=1`; equal cold and warm work; canonical IPv6 rate limiting; only keyed or Argon2id credential hashes; and the exact redacted 13-category audit vocabulary.

## Preserved behavior and worktree boundaries

1. Report-access revision `ed4823bf1c71575665f4ef75c4393d5e05e3def9` changes exactly the eight declared report-access implementation and check paths from documentation baseline `c1edafcf2bbb45f3bf3d231c114d4143aa22b8c7`; it changes zero forbidden paths.
2. The verified identity, session, authentication-service, and authentication HTTP boundaries remain unchanged. Their focused suites reproduced 5, 14, and 20 passing tests respectively as part of the nine-check impact plan.
3. The existing report renderers, report fields and formulas, Before & after source, Tracking observation, token portal, manager report, billing, subscriptions, reporting periods, and every client UI path outside the authenticated report route remain unchanged by the report-access candidate. The frozen report-path manifest remained `90a18c83ca99c31af47e049c7ede6d0af237b958f5f4f4e78b90f561cd719542`.
4. Existing partial client account UI remains uncommitted and unclaimed. Its preserved aggregate SHA-256 is `4f3fe129784c78e4ec5d563dfc01ea1137b9967c6c6aa10ee4cbbc58fe5d90f0`.
5. The historical pre-implementation documentation receipt is `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/docs-before-receipt.json`. It records an earlier state in which only the identity/session core was verified; it is not the current authentication, HTTP, or report-access status.

## Future work

1. Client login and account UI, route guards, account controls, browser wiring to the verified routes, and all other client-facing behavior remain future work. Existing partial files remain uncommitted and unclaimed.
2. A real server-side entitlement provider and its subscription source of truth remain future work. Until that integration is implemented and separately verified, the authenticated report route retains the deny-all default and no live client report availability is claimed.
3. The Romanian billing profile, payment-provider integration, fiscal invoicing, billing history, subscription checkout, seven-day trial, cancellation, and reactivation remain future work.
4. The period pill, its seven approved choices, immutable on-demand report snapshots, and dynamic reporting ranges remain future work.
5. Deployment and publication remain future work. No production migration, production configuration, real provider call, real email, credential operation outside the local verifier, payment action, report collection, or report regeneration was performed or verified by this increment.
