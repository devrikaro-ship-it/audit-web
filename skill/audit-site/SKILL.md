# audit-site — the Devrika website audit

A branch of the `audit-devrika` skill (the container: `../SKILL.md`).

Audit of a site from its URL only, with no account access: it reads the pages that sell and produces a public report
as a 16:9 deck in two parts, SEO (including visibility in AI assistants) then UX/UI, each closing with a checklist,
written for a non-technical decision maker. It audits the website only — no tracking, no Google Ads.

## Where it lives

The engine, report, PDF route, funnel and landing page are the web app `audit-web` (`~/seo-audit`, repo
`devrikaro-ship-it/audit-web`), live on https://audit.devrika.io. This branch is the app's `skill/audit-site/`
folder. Nothing is duplicated outside the app.

**The report structure has one source: `docs/AUDIT-SPEC.md`.** Read it before touching the report; do not add or
remove rubrics or fields on your own.

## How to run an audit

1. From the UI: `/start` (landing page `/audit-seo`), or `POST /api/audit` with `{url}` (plus contact fields when
   the funnel sends them).
2. The report is at `/r/<id>`, the PDF at `/r/<id>/pdf`, leads in `/dashboard`.

## What the engine does

1. Detects the platform from the homepage (`modules/site-audit/model/site-signals.ts`) and reads the site with that platform's
   profile (`modules/site-audit/model/platform-knowledge/<platform>.json`: WooCommerce, Shopify, MerchantPro, GoMag, PrestaShop,
   OpenCart, Magento, generic) — sitemap signals, pace, traps and observed problems, each with its test store.
   Adding a platform = adding a profile file.
2. Decides the kind of site, a shop or a lead site (`modules/site-audit/model/site-kind.ts`), and selects the pages by type: for a shop
   15 categories + 35 products + at most 5 other pages, for a lead site its services and locations; never sitemap
   order (`modules/site-audit/model/page-selection.ts`); dead pages are replaced by pages of the same type.
3. When a site refuses the server (403, challenge, or 30%+ of pages 403/429), reads it through the BrightData
   browser (when: `modules/site-audit/model/read-strategy.ts`; how: `modules/site-audit/model/data/browser-fetch.ts`). Page
   fetching is bounded to 30 s.
4. Builds the two parts: SEO as ten components, each with its checklist rows; UX/UI as ✓/✗ rows per page type, plus
   speed. `runAudit` (`modules/site-audit/controller/run-audit.ts`) calls the six steps of `model/steps/` with the
   outside world passed in (`AuditIO`, real one in `model/data/audit-io.ts`); the checks are `model/checks/`. The deck
   is computed by `buildDeck` (`model/report-deck.ts`) and laid out by `view/report-deck.tsx`; every word comes from
   `model/copy-registry.ts`.
5. Learns per platform from every audit: one observation per audit, learned reading pace and URL rules behind a
   5-domain safety gate, pending rules approved in the dashboard (rules: `model/learning.ts`, `model/observations.ts`; files:
   `model/data/learning.ts`, `model/data/observations.ts`).

## Code structure

The app is one modular MVC structure (`docs/superpowers/specs/2026-10-05-mvc-modular-rewrite-design.md`): this
audit is `modules/site-audit/` (model, model/data, controller, view, index.ts as its only door); its addresses are
bound in `routes/site-audit.ts`; every address of the app is listed in `shared/route-table.ts`.

## Where the team works

https://audit.devrika.ro/dashboard (login): every audit (website and Google Ads) as a prospect with a sales status,
the report link, a per-platform summary and what the audit learned. Every finished audit is saved, contact or not.

Designs: `docs/superpowers/specs/`. Engine lessons: `docs/dev/mistakes.md`.

## Report rules

The invariants (a public report says "de verificat", never "lipsa", for what it cannot confirm; client language;
no diacritics; CTA) live in `docs/AUDIT-SPEC.md` §5 — do not restate them here.
