# Dashboard login

## Current state

At c83ee78fd047ff70f5a14d2330ba52e8ac0fe322, all dashboard paths require Basic authentication in proxy.ts. The manager also checks authorization before reading its ledger. Existing DASH_USER and DASH_PASS values are the internal shared manager identity. There is no login form or browser session. The preceding manager's independent production observation proves configured authentication succeeds and missing/invalid credentials are refused.

## Authorized change

Add an English login page at /dashboard/login, using the existing credentials without changing or exposing them. Successful login creates a random opaque server-side session and redirects to a validated dashboard return path. Unauthenticated browser navigation redirects to login; explicit invalid Basic credentials remain refused. Existing valid Basic clients remain supported. All dashboard pages remain protected, including the manager's data-layer guard. Add logout that deletes the server session and cookie. No signup, password reset, external provider, account import or customer-data changes.

## Session and request policy

Sessions last eight hours and use 256-bit random bearer values in HttpOnly, SameSite=Strict cookies, Secure in production. Server files are named by a token hash and contain only expiry and a token-keyed binding to current credentials; neither the raw token nor credentials are persisted. Changing credentials invalidates existing sessions. Logout revokes the presented session, including replay. Files use the existing data directory by default, with DASH_SESSIONS_DIR available for isolated tests. Authentication fails closed on unavailable configuration or unreadable storage.

Login and logout accept same-origin form POSTs only, reject cross-site requests and external return URLs, limit input size, and expose generic errors. Login attempts have a bounded process-local throttle appropriate to the current single application process. This is not a distributed abuse-control service. Successful login must not clear the attempt window. Passwords are not echoed, logged, or included in URLs. Basic authentication remains an existing explicit client capability; the browser flow must not issue a Basic challenge.

## Acceptance

Production origin validation and redirects use the existing PUBLIC_URL configuration, with GADS_REDIRECT_URI as the configured fallback. Missing or invalid HTTPS origin fails closed. Never trust the backend localhost URL or caller-supplied forwarding headers. A witnessed proxy-origin regression failed before this correction and passed afterward; this reuses the deployment invariant documented in lib/public-url.ts.

Verify a real production login page, valid login and session access, direct-link return, refresh, logout and replay refusal. Invalid credentials, forged/expired sessions, cross-origin POST, external return paths and missing configuration must not grant access; each guard has a passing counterpart. Use synthetic credentials only for local browser controls. Production verification uses configured credentials exclusively inside the server process and emits sanitized outcomes. Preserve existing manager grouping/report access and public reporting. Independent exact revision review and production verification are required before completion.
