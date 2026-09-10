# Client identity, session, and authentication services

## Status and authority

Contract point 1 is implemented and independently verified in the local environment at exact authentication-service revision `9b4afe72e5545922da3268ca176f9178a6d59060`. That revision extends the independently verified identity/session core at `098f82153175bc47583239a7c39c6d9987fdba22`; it does not replace or weaken the core. This document records the completed core and authentication-method service boundaries only. HTTP handlers and routes, client-facing account UI, report ownership and access, billing, subscriptions, reporting periods, and deployment remain unimplemented.

The product authority remains [Client Portal V2 Account, Billing, and Reporting Design](../superpowers/specs/2026-09-10-client-portal-v2-account-design.md), approved on 2026-09-10 as `client-portal-v2-account-design@2026-09-10` with SHA-256 `1eeec4d1ef904948e2db7f799c80a057e14856b6cb85eb68922b31bc9225fde5`. The frozen implementation authority for the authentication-service increment is `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/contract.md`, SHA-256 `e6ba067b3efc610632c25d0aea30aa4f96a03ef1bef59cf1a1c446a8f98f945c`.

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
3. The core exposes single-session and all-client revocation operations. The authentication service uses the existing core to issue sessions and uses all-client revocation during password enrollment; HTTP logout and password-change routes remain future work.
4. The session cookie options are `HttpOnly`, `SameSite=Lax`, `Path=/client`, 24-hour `Max-Age`, and `Secure` outside local development. The client CSRF cookie is intentionally readable by the client, remains `SameSite=Lax` and scoped to `/client`, and uses the same 24-hour bound. The opaque authentication-flow cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/client`, and limited to 10 minutes.
5. The verified revisions provide cookie option builders only. No accepted HTTP route or deployed response is claimed to set these cookies.

### CSRF and authentication flows

1. Each issued session has a synchronizer CSRF value whose raw form is not stored. Session CSRF verification accepts only the matching secret-keyed hash for an active, unexpired session.
2. An authentication flow uses separate 256-bit opaque flow and CSRF values. The server-side row stores only keyed hashes and binds the proof to the configured exact origin and a validated source IP.
3. Authentication flows expire after 10 minutes and are consumed atomically once. Forged values, expiry, origin or IP mismatch, and replay are refused without a successful state mutation.
4. The future HTTP layer owns authenticated-caller enforcement, login CSRF wiring, trusted-proxy source-IP extraction, and cookie issuance. None of those concerns is claimed by the service revision.

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

## Independent evidence

1. Baseline assessment: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-baseline/attempts/20260910T191328289930Z-0eefb8cba59444a6acc0d77f11e94b10/result.json`. It records `CONFORMANT` at `c72992bad1f908d20a1430b5adb2caa975cb426c`, with the verified core and committed report surfaces unchanged and the partial HTTP/UI/report-access population unclaimed.
2. Code proof: `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/code-proof.json`. It binds the passing 14-test authentication check, the 5-test core check, scoped TypeScript checks, frozen-path receipts, and three witnessed negative controls to `9b4afe72e5545922da3268ca176f9178a6d59060`.
3. Failed review evidence: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-review/attempts/20260910T195604708807Z-15029f47295b49fcb3fc3dcac9f7a91f/result.json` and `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/review-finding.json`. They bind the rejected revision `4abedda12b43ed0edf17b27c47e8201c05df5b5c` to the three defects in credential concurrency, cold-path Argon2 work equivalence, and equivalent-IPv6 rate limiting.
4. Passing re-review: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-rereview/attempts/20260910T201845997102Z-81d6f4f4566e46c194385a51e4f8bc1d/result.json` and `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-rereview/checkpoint-payload.json`. The independent reviewer returned `TASK_SUCCEEDED` for `9b4afe72e5545922da3268ca176f9178a6d59060`, reproduced all four bounded checks, and witnessed each repaired property fail when its guard was removed and pass when restored.
5. Direct result proof: `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/result-proof.json`. It records both acceptance directions through the public service APIs against a verifier-created SQLite database.
6. Independent verifier: `/Users/VladMoloso/.codex/task-runs/tasks/client-auth-methods-verify/attempts/20260910T203136625889Z-2b97f91cb17342629fd36eddac76e6cd/result.json`. The verifier returned `TASK_SUCCEEDED` for the exact local revision and retained the real witness at `/tmp/client-auth-methods-verifier.6XWmUS/real-result-receipt.json`.
7. The verifier observed migrations `001` and `002` once each; one immutable identity across OTP, Google, and password variants; valid core sessions; password-change revocation; neutral refusal cases; Argon2id parameters `m=65536`, `t=3`, and `p=1`; equal cold and warm work; canonical IPv6 rate limiting; only keyed or Argon2id credential hashes; and the exact redacted 13-category audit vocabulary.

## Preserved behavior and worktree boundaries

1. Authentication-service revision `9b4afe72e5545922da3268ca176f9178a6d59060` changes exactly the 12 declared service, persistence, dependency, test, and check-map paths from baseline `c72992bad1f908d20a1430b5adb2caa975cb426c`.
2. The committed identity/session core, existing report, token portal, manager session, period implementation, renderers, fields, formulas, labels, values, and snapshots remain unchanged by the authentication-service revision.
3. Partial HTTP handlers, client UI, and report-access files remain uncommitted and unclaimed. Their preserved aggregate SHA-256 through implementation, re-review, and verification is `d064b0b6ba4813021b3ead729ec700554222764096d445f4c842b965545f4a70`.
4. The historical pre-implementation documentation receipt is `/Users/VladMoloso/.codex/runs/client-auth-methods-20260910/docs-before-receipt.json`. It records the earlier state in which only the core was verified; it is not the current authentication-service status.

## Future work

1. HTTP authentication handlers and routes remain unimplemented, including OTP request and verification endpoints, the Google endpoint, password enrollment and login endpoints, logout, password-change routing, authenticated-caller enforcement, CSRF integration, trusted-proxy source-IP extraction, and cookie issuance.
2. Client login and account UI, route guards, account controls, and all other client-facing behavior remain unimplemented.
3. Immutable report ownership, authenticated owner checks, cross-client refusal, entitlement-gated report reads, and server-side report access remain unimplemented. The current opaque portal token remains a read-only report selector and is not authority for client-profile mutation or future authenticated report access.
4. The Romanian billing profile, payment-provider integration, subscription checkout, seven-day trial, entitlement, cancellation, reactivation, fiscal invoicing, and billing history remain unimplemented.
5. The period pill, its seven approved choices, immutable on-demand report snapshots, and dynamic reporting ranges remain unimplemented.
6. Deployment and publication remain unimplemented. No production migration, production configuration, provider call, email, credential operation, payment action, or report regeneration was performed or verified by this increment.
