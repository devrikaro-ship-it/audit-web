# Client identity and session core

## Status and authority

Contract point 1 is implemented and independently verified in the local environment at exact revision `098f82153175bc47583239a7c39c6d9987fdba22`. This document records only the completed identity/session core. It does not claim that authentication methods, client-facing account behavior, report authorization, billing, subscriptions, reporting periods, or deployment are implemented.

The product authority remains [Client Portal V2 Account, Billing, and Reporting Design](../superpowers/specs/2026-09-10-client-portal-v2-account-design.md), approved on 2026-09-10 as `client-portal-v2-account-design@2026-09-10` with SHA-256 `1eeec4d1ef904948e2db7f799c80a057e14856b6cb85eb68922b31bc9225fde5`. The frozen implementation authority for this increment is `/Users/VladMoloso/.codex/runs/client-identity-core-20260910/contract.md`, SHA-256 `5da633b46a0cc3e02f12222f702288e57c2111c624238aaa23c6a24a884b5bd6`.

## Verified local core

### Canonical identity and migration

1. Email identity normalization applies Unicode NFC, trims surrounding whitespace, and lowercases the result before lookup or insertion.
2. SQLite migration `db/client-identity/001_initial.sql` is versioned as migration `001`, is safe to apply repeatedly, and records one applied schema version.
3. The canonical email has a unique constraint, and an inserted identity row is immutable. Case, whitespace, and equivalent Unicode variants therefore resolve to the same opaque client identity instead of creating duplicates.
4. The database is opened only from an explicit absolute `CLIENT_IDENTITY_DB_PATH`. Configuration also requires an exact HTTP(S) `CLIENT_APP_ORIGIN` and a bounded `CLIENT_SESSION_SECRET`; missing or invalid core configuration fails before database creation or mutation.

### Sessions, rotation, revocation, and cookies

1. A session token contains 32 cryptographically random bytes, or 256 bits. Raw session and CSRF tokens are returned only to the caller; SQLite stores secret-keyed HMAC-SHA-256 hashes.
2. Sessions expire after 24 hours. Rotation is eligible after 12 hours and can be forced for a later authentication or security change. Successful rotation revokes the old row and issues a replacement in one transaction.
3. The core exposes single-session and all-client revocation operations. Logout and password-change routes are not part of this revision, so those future routes must call the appropriate revocation operation rather than treating revocation as already wired.
4. The session cookie options are `HttpOnly`, `SameSite=Lax`, `Path=/client`, 24-hour `Max-Age`, and `Secure` outside local development. The client CSRF cookie is intentionally readable by the client, remains `SameSite=Lax` and scoped to `/client`, and uses the same 24-hour bound. The opaque authentication-flow cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/client`, and limited to 10 minutes.
5. Revision `098f82153175bc47583239a7c39c6d9987fdba22` provides cookie option builders only. No login route or deployed response is claimed to set these cookies yet.

### CSRF and authentication flows

1. Each issued session has a synchronizer CSRF value whose raw form is not stored. Session CSRF verification accepts only the matching secret-keyed hash for an active, unexpired session.
2. An authentication flow uses separate 256-bit opaque flow and CSRF values. The server-side row stores only keyed hashes and binds the proof to the configured exact origin and a validated source IP.
3. Authentication flows expire after 10 minutes and are consumed atomically once. Forged values, expiry, origin or IP mismatch, and replay are refused without a successful state mutation.

### Audit redaction, configuration, and dependencies

1. Security audit rows contain only an opaque event ID, a closed event category, an optional opaque identity ID, and a timestamp.
2. Audit rows do not contain raw email, session token, CSRF value, authentication-flow token, origin, source IP, password, one-time code, or configuration secret. Session and flow tables likewise contain hashes rather than raw credentials.
3. The fail-closed configuration boundary is part of the public core behavior: invalid database paths, origins, secret bounds, or cookie configuration are rejected before an authentication mutation proceeds.
4. `argon2@^0.45.1` is the only new top-level runtime dependency. It is reserved for the future password unit; this revision does not implement password enrollment, hashing, or login. `@types/node` remains on major version 20.
5. The project-owned check map defines focused real-SQLite behavior and strict scoped TypeScript checks for this core.

## Independent evidence

1. Code proof: `/Users/VladMoloso/.codex/runs/client-identity-core-20260910/code-proof.json`. It binds the passing focused check, its witnessed negative control, the independent review verdict, and frozen-path receipts to revision `098f82153175bc47583239a7c39c6d9987fdba22`.
2. Independent code review: `/Users/VladMoloso/.codex/task-runs/tasks/client-identity-core-review/task.json`. The reviewer returned `TASK_SUCCEEDED`, reproduced 5/5 focused real-SQLite tests and the strict TypeScript check through the bounded plan, and reported no repository mutation.
3. Direct result proof: `/Users/VladMoloso/.codex/runs/client-identity-core-20260910/result-proof.json`. It records the positive and negative directions exercised through the public TypeScript APIs against a newly created temporary SQLite database.
4. Independent verifier artifact: `/Users/VladMoloso/.codex/task-runs/tasks/client-identity-core-verify/task.json`. The verifier returned `TASK_SUCCEEDED` for the exact local revision and reported no repository mutation.
5. The verifier's positive direction applied the migration twice, resolved case, whitespace, and Unicode email variants to one immutable identity, authenticated a valid 32-byte session, rotated it at 12 hours, revoked it, and consumed one valid origin/IP-bound flow exactly once.
6. The verifier refused 11 forged, expired, revoked, rotated, wrong-origin, wrong-IP, and replayed session or flow cases. Mutation counts and state digests remained unchanged for the refusal cases. Missing or invalid configuration failed before database creation or mutation.
7. Read-only database inspection found only 43-character keyed hashes in sensitive session and flow columns and only the redacted audit columns described above. The real local witness locator and its SHA-256 are retained in the verifier artifact; the stable result proof above is the authoritative summary.

## Preserved behavior and worktree boundaries

1. The verified revision is a direct child of baseline `8d6c5300ce0295fb2425545ac86f681239f28e67` and changes exactly the 13 declared core paths.
2. The committed existing report, token portal, manager session, period implementation, renderers, fields, formulas, labels, values, and snapshots have an empty base-to-candidate diff. The current manager session remains internal to manager routes, and the current portal token still does not authorize client-profile mutation.
3. Partial non-core files under `app/client`, `lib/client-auth`, `lib/client-report-access`, and the broader authentication/report-access tests remain uncommitted, untouched by the core revision, and unclaimed. Their preserved aggregate SHA-256 through implementation, review, and verification was `b22a41f23a9d18d5c880846538a212ee155128f52168f2e013f5b47b78feff8b`.
4. The pre-implementation documentation receipt remains at `/Users/VladMoloso/.codex/runs/client-identity-core-20260910/docs-before-receipt.json`. It is historical evidence for the earlier current-versus-planned phase, not evidence that the future work below has shipped.

## Future work

1. Google sign-in, emailed one-time-code request and verification, password enrollment and login, verified account linking, authentication handlers, logout wiring, and password-change revocation remain unimplemented.
2. Client login and account UI, route guards, account controls, and all client-facing cookie issuance remain unimplemented.
3. Immutable report ownership, authenticated owner checks, cross-client refusal, and server-side report access remain unimplemented. The current opaque portal token remains a read-only report selector and is not authority for client-profile mutation or future authenticated report access.
4. The Romanian billing profile, payment-provider integration, subscription checkout, seven-day trial, entitlement, cancellation, reactivation, fiscal invoicing, and billing history remain unimplemented.
5. The period pill, its seven approved choices, immutable on-demand report snapshots, and dynamic reporting ranges remain unimplemented.
6. No deployment, publication, production migration, production configuration, provider call, message, credential operation, payment action, or report regeneration was performed or verified by this increment.
