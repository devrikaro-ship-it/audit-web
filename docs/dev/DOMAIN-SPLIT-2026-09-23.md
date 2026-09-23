# Domain split — September 23, 2026

Operator decision: audit.devrika.ro opens on a Romanian three-audit page (`/audituri`, only the website audit open, with its own link to the landing `/audit-seo`); audit.devrika.io keeps the three-audit home page
(only the website audit open; Google Ads and Meta Ads shown as coming soon).

## What changed

1. Coolify env `SITE_AUDIT_ORIGIN=https://audit.devrika.ro` (app `eywy2rjfyittg93wk2j3phco`).
2. Traefik labels: the `audit-legacy-origin` middleware (a 308 of every .ro request to .io) was removed from the
   two .ro routers, `http-0-…` and `https-0-…`. The middleware definition itself is still declared, unused.
3. `lib/host-routing.ts` (called from `proxy.ts`): on the .ro host, `/` shows `/audituri` (since commit 290df49; before it, `/audit-seo`); the funnel,
   processing, report, their APIs and static assets are served; every other path answers 308 to `PUBLIC_URL`
   with path and query, so privacy, terms and OAuth URLs registered on .ro keep working.

## Dashboard on .ro (commit 17d7b4e)

`/dashboard` (login, logout, unified list, Google Ads detail and reports) is served on .ro as well. `dashboardOrigin`
picks among `PUBLIC_URL` and `SITE_AUDIT_ORIGIN` by the forwarded host; any other host falls back to `PUBLIC_URL`.
Verified: .ro/dashboard redirects to .ro/dashboard/login; a wrong password stays on .ro; a cross-site login POST is
refused (403); .io/dashboard unchanged. A session is per domain, so .ro and .io each need their own login.

## Verified on production (commit 80db82c)

.ro `/` and `/audit-seo` show the landing; `/start`, `/r/*` are served; `/confidentialitate`, `/termeni`,
`/google-ads?x=1`, `/dashboard`, `/api/google-ads/callback?code=…` answer 308 to .io with path and query;
http .ro redirects to https; .io `/` unchanged. A full prospect journey on .ro (address → concern → contact →
report) ended on `https://audit.devrika.ro/r/<id>` with 60 pages analysed.

## Rollback

Restore the two router middleware lines to `audit-legacy-origin,redirect-to-https` and `audit-legacy-origin,gzip`
(PATCH `custom_labels`), or delete `SITE_AUDIT_ORIGIN`, then redeploy. Either one alone returns .ro to "everything
goes to .io".

## Open

Google OAuth branding still lists the .ro homepage; it now shows the website-audit landing instead of redirecting to
the .io home page. Update the OAuth branding to the .io URLs before the next verification submission.
