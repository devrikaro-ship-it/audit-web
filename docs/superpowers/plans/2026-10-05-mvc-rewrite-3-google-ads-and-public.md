# MVC Rewrite — Plan 3: the google-ads and public modules

> **Execution:** inline (subagents disabled by `~/AGENTS.md`); implementation first, then tests, then negative controls.

**Goal:** move the Google Ads audit into `modules/google-ads/` and the public pages (`/`, `/audituri`, `/hub`,
`/termeni`, `/confidentialitate`) into `modules/public/`, bind their 15 addresses in `routes.ts`, and prove the same
behaviour.

**Architecture:** as plan 2. A server page that reads data is split into `controller/show-*.tsx` (reads and computes,
returns `<View {...props} />`) and `view/*.tsx` (draws from its props); the props type is inferred from the controller
(`Awaited<ReturnType<typeof load…>>`), imported type-only by the view. Client components go to `view/`, `"use server"`
actions and route handlers to `controller/`.

## Global Constraints

1. Same as plans 1–2.
2. The Google OAuth verification surface does not change: the public-output manifest (`app/public-output-reachable-files.json`)
   changes only by path, and every test of `app/public-access-boundary.test.tsx` passes.

## Move map

| From | To |
|---|---|
| `lib/theme.ts` | `shared/theme.ts` (google-ads, public and site-audit views) |
| pure: `lib/calc/`, `gads-audit`, `gads-findings`, `gads-financials`, `gads-margin`, `gads-product-classification`, `gads-product-simulation`, `gads-report-metrics`, `gads-report-periods`, `gads-localized-copy`, `gads-public-oauth-contract`, `gads-read-disclosure`, `gads-saved-report-view`, `gads-website` | `modules/google-ads/model/` (prefix `gads-` dropped) |
| reads Google Ads, env, disk, mail, PDF: `lib/net.ts` (search), `gads-api`, `gads-an`, `gads-intake`, `gads-keywords`, `gads-oauth`, `gads-pmax`, `gads-search`, `gads-shopping`, `gads-structure`, `gads-tracking`, `gads-demo`, `gads-session`, `gads-leads`, `gads-pending-report`, `gads-report-delivery`, `gads-report-email`, `gads-report-pdf`, `gads-report-snapshot`, `public-url` | `modules/google-ads/model/data/` |
| `lib/gads-manager.ts` (reads the request cookies) | `modules/google-ads/controller/manager.ts` |
| `app/(google-ads)/**` client components | `modules/google-ads/view/` |
| `app/(google-ads)/**` actions and route handlers | `modules/google-ads/controller/` |
| `app/(google-ads)/**` server pages | `controller/show-*.tsx` + `view/*.tsx` |
| `app/(public)/**` pages | `modules/public/view/` + `controller/pages.tsx` |
| tests of moved files | `modules/<module>/tests/` |

Files the dashboard uses (`dashboard-*`, `dash-auth`) stay for plan 4; the dashboard reaches google-ads through
`@/modules/google-ads`.

## Tasks

1. Capture before the move: rendered HTML of the public pages and of the Google Ads landing, connect and demo report
   pages (`GADS_DEMO=1`), from the built app; one sha256 per page.
2. Move per the map with the mover; split `lib/net.ts`'s remaining search into `model/data/google-ads-api.ts`; `tsc`,
   full suite green.
3. Split the data-reading server pages into controller + view; bind the 15 addresses; app files thin; links from `href()`.
4. Prove: the same page hashes (Task 1), the public-output manifest unchanged but for paths, structure tests green with
   controls, full suite, build with the same 31 routes.
