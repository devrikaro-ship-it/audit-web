# Dashboard login

## Current state

At c83ee78fd047ff70f5a14d2330ba52e8ac0fe322, all dashboard paths require Basic authentication in proxy.ts. The manager also checks authorization before reading its ledger. Existing DASH_USER and DASH_PASS values are the internal shared manager identity. There is no login form or browser session. The preceding manager's independent production observation proves configured authentication succeeds and missing/invalid credentials are refused.

## Authorized change

Add an English login page at /dashboard/login, using the existing credentials without changing or exposing them. Successful login creates a random opaque server-side session and redirects to a validated dashboard return path. Unauthenticated browser navigation redirects to login; explicit invalid Basic credentials remain refused. Existing valid Basic clients remain supported. All dashboard pages remain protected, including the manager's data-layer guard. Add logout that deletes the server session and cookie. No signup, password reset, external provider, account import or customer-data changes.

## Session and request policy

Sessions last eight hours and use 256-bit random bearer values in HttpOnly, SameSite=Strict cookies, Secure in production. Server files are named by a token hash and contain only expiry and a token-keyed binding to current credentials; neither the raw token nor credentials are persisted. Changing credentials invalidates existing sessions. Logout revokes the presented session, including replay. Files use the existing data directory by default, with DASH_SESSIONS_DIR available for isolated tests. Authentication fails closed on unavailable configuration or unreadable storage.

Login and logout accept same-origin form POSTs only, reject cross-site requests and external return URLs, limit input size, and expose generic errors. Login attempts have a bounded process-local throttle appropriate to the current single application process. This is not a distributed abuse-control service. Successful login must not clear the attempt window. Passwords are not echoed, logged, or included in URLs. Basic authentication remains an existing explicit client capability; the browser flow must not issue a Basic challenge.

## Authentication precedence regression

Independent review and a local HTTP control showed that the first implementation fell through to a valid cookie after an explicit invalid Basic header. That contradicted the preserved explicit-client refusal rule. The shared guard now makes a present Authorization header authoritative, including malformed, unsupported and empty headers; it uses cookies only when that header is absent. The retained regression proves legitimate session-only and Basic-only arms alongside each refused conflicting request. Both proxy and manager data access consume this guard.

Production origin validation and redirects use the existing PUBLIC_URL configuration, with GADS_REDIRECT_URI as the configured fallback. Missing or invalid HTTPS origin fails closed. Never trust the backend localhost URL or caller-supplied forwarding headers. A witnessed proxy-origin regression failed before this correction and passed afterward; this reuses the deployment invariant documented in lib/public-url.ts.

## Acceptance

Verify a real production login page, valid login and session access, direct-link return, refresh, logout and replay refusal. Invalid credentials, forged/expired sessions, cross-origin POST, external return paths and missing configuration must not grant access; each guard has a passing counterpart. Use synthetic credentials only for local browser controls. Production verification uses configured credentials exclusively inside the server process and emits sanitized outcomes. Preserve existing manager grouping/report access and public reporting. Independent exact revision review and production verification are required before completion.

## Published result

Application revision `2ce626f8599d59eeb3ec0807cb11944a432bd927` was published at `https://audit.devrika.io/dashboard/login` through deployment `dzdv250zbyupw9btewzs1qj3`, completed on September 9, 2026 at 08:20:56 UTC. Existing credentials and application configuration were unchanged; no database migration was required.

The exact candidate passed 21 focused tests, all 591 repository tests, type checking, lint and the production build. Independent repair review passed with no remaining contract findings. Witnessed failing controls cover the security guards, including invalid explicit Authorization combined with a valid session.

The root's actual production HTTPS observation confirmed login, internal return, authenticated refresh, protected manager access, logout and refusal of the revoked session. Invalid credentials, forged sessions, conflicting Authorization and cross-site requests were refused. Existing valid Basic access and public reporting remained available. The client ledger was unchanged and the temporary verification session was removed. Post-deployment logs included successful startup and no new error matches.

An actual Chrome visit confirmed the production login form renders. The browser's successful credential-entry flow used an isolated local application with synthetic credentials; production credential validation was exercised inside the running server over HTTPS, without exposing credentials or cookies. Evidence is retained under `.superpowers/sdd/2026-09-09-login/`: `live-receipt.json`, `live-browser-receipt.json`, `live-login.png`, `local-browser-receipt.json`, `repair-review/verdict.json` and the `repair-*` check receipts.

Independent production verification passed on September 9 at 08:37:14 UTC with no findings, recorded in `verification/verdict.json`. Its separate live matrices additionally planted an expired verifier-owned session and an external return URL: both were refused, all owned session files were removed, and the client ledger remained byte-identical. The live manager currently has zero registered saved accounts; production therefore proves the actual empty state, while the retained manager tests cover populated behavior. No clients were seeded for verification.
