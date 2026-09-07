# Launch domain migration — September 7, 2026

## Authorized result

Publish the existing Audit Devrika application at `https://audit.devrika.io` with valid HTTPS, public pages, and Google OAuth entry using the new callback. Preserve paths and query strings on legacy links. This increment does not implement bilingual copy, subscriptions, or Google reviewer communication.

## Measured starting state

1. Repository: `/Users/VladMoloso/seo-audit`, clean branch `feature/live-reporting-dashboard`, local revision `d465f8d` (documentation only).
2. Running application image: `eywy2rjfyittg93wk2j3phco:4b4dfc758137d49ee5e171aa467fd5ce3570489d`.
3. Coolify application: `eywy2rjfyittg93wk2j3phco`, repository `devrikaro-ship-it/audit-web`, branch `main`.
4. Existing origin: `https://audit.devrika.ro`. Both `PUBLIC_URL` and `GADS_REDIRECT_URI` explicitly use that origin.
5. Spaceship owns the DNS zone through `launch1.spaceship.net` and `launch2.spaceship.net`. The audit host had no record.
6. Host capacity: 31 GB free disk and 5285 MB available memory.

## Configuration and acceptance

1. Add the `audit` A record using the existing production server address. Verify provider persistence and authoritative/public DNS.
2. Add the new HTTPS hostname to the existing Coolify application, preserving its data and application revision.
3. Add the new callback to the existing Google OAuth client while preserving every existing callback and all secrets.
4. Set the production public origin and OAuth callback to `.io`. Redirect the legacy hostname to the new origin at the proxy, preserving path and query.
5. Apply the configuration through Coolify. Verify the exact running image, valid TLS, rendered public pages, authentication entry, protected-route refusal, a known missing route, and new application errors.

No application source changes or database migrations are required. Existing full-suite, lint, build, independent review, and live verification receipts for application revision `4b4dfc7` are recorded in `HANDOFF-2026-09-07.md`. This configuration change requires fresh live configuration and behavior proof.

## Status

The domain publication is complete. Coolify deployment `h11bcju1m9j7u29zrogqdto9` finished at 10:45:22 UTC with application revision `4b4dfc758137d49ee5e171aa467fd5ce3570489d`. The new running container is `8807feb76f6b`.

1. Spaceship persisted `audit A 167.233.98.195`, TTL 1800 seconds, and reports the domain Online. Authoritative DNS, Cloudflare DNS, Google DNS, and the production server resolve the new hostname.
2. Native external-network requests to `https://audit.devrika.io` return 200 with a trusted Let's Encrypt certificate, TLS 1.3, and an exact hostname SAN. The certificate expires December 6, 2026. All ten referenced local JavaScript/CSS assets return 200.
3. The homepage, Google Ads landing, connection form, privacy policy, and terms return 200. The previously approved Google data-protection disclosure remains present.
4. The internal dashboard refuses unauthenticated requests with 401. Account selection returns users without a session to connection. A fabricated callback state is rejected; cancellation and missing-website cases return to the correct `.io` origin. A known nonexistent route returns 404.
5. OAuth entry redirects to Google with `https://audit.devrika.io/api/google-ads/callback`, the unchanged `adwords` scope, and a Secure/HttpOnly state cookie. Google Cloud persisted the new callback while retaining all previous callbacks. No secrets were changed.
6. The legacy hostname redirects to the new hostname with HTTP 308 while preserving path and query. New-domain HTTP upgrades to HTTPS. Production `PUBLIC_URL` and `GADS_REDIRECT_URI` use `.io`; preview environment values remain unchanged.
7. The initial observation contained nine startup log lines and zero error matches. A later final observation contained three `Failed to find Server Action` rejections for identifiers `035e076d`, `02393cf0`, and `y`. The running server-action manifest contains four legitimate identifiers, all 42 characters long; none of the rejected identifiers exists. These are invalid-action requests, not evidence of a failed valid application action. Their caller was not identified. Public HTTPS still returned 200 after the events. No code repair or rollback was justified by these malformed requests.

### Verification limits and remaining Launch work

At 10:46:55 UTC the operator's ISP resolver still returned its cached pre-creation NXDOMAIN with 1231 seconds remaining. Chrome on that network therefore could not render the new hostname. The external-network HTTPS/asset checks above use normal DNS and no host override. Local visual verification remains subject to DNS propagation; no DNS or browser settings on the operator's computer were changed.

The Google-owned account chooser/consent and successful authenticated account read were not rerun in this increment. Google's existing application-verification warning remains a separate Launch item. Branding still references the verified `.ro` homepage, privacy, and terms URLs, which now redirect to `.io`; prepare the final `.io` branding/domain-ownership verification and demonstration before resubmitting. No verification request or reviewer email was sent.

This publishes the existing application. Bilingual product preparation, subscription decisions, and commercial-launch readiness remain the separate unfinished work described in `HANDOFF-2026-09-07.md`.

### Rollback

The sanitized pre-activation configuration is saved in `before-canonical-config.json` in the evidence directory. It preserves the original production origin values and the unmodified two-domain routing labels. Restoring those values through Coolify and applying its configuration returns canonical navigation to `.ro` without deleting either DNS record or OAuth callback. No application revision rollback or data migration is required.

## Model route

```json
{"catalog_checked_at":"2026-09-07T10:36:37.822878+00:00","catalog_live":true,"catalog_source":"codex debug models","model":"gpt-5.6-sol","rationale":"Multi-step implementation and debugging need a reliable model with deep reasoning.","reasoning_effort":"high","task_class":"complex"}
```

## Evidence

Sanitized operational receipts: `.superpowers/sdd/2026-09-07-launch-domain/`.

Checkpoint: worker `01a07b70-49c2-7040-94d4-cd5333cab54b`; payload `/Users/VladMoloso/.codex/tmp/devrika-launch-domain-20260907.json`.

Inherited Romanian source comments and documentation remain translation debt. This infrastructure increment does not alter product copy.
