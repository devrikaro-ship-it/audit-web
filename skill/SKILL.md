---
name: audit-devrika
description: "Devrika website audit for online stores (lead magnet): starting only from the store URL, with no account access, it reads the pages that sell and produces a public report as a 16:9 deck in two parts, SEO (including visibility in AI assistants) then UX/UI, each closing with a checklist, written for a non-technical decision maker. It audits the website only — no tracking, no Google Ads (the Google Ads audit is the separate `audit-google-ads` skill). Use when: site audit, website audit, audit a prospect's store, store audit report, run the audit tool on a URL."
user-invokable: true
argument-hint: "[url]"
license: MIT
metadata:
  author: Devrika
  version: "3.0.0"
  category: audit
---

# Devrika website audit

Devrika has two audit products, and this skill is one of them:

| Product | What it audits | Skill |
|---|---|---|
| **Website audit** (this skill) | the store's website: SEO and UX/UI, from the URL only | `audit-devrika` |
| **Google Ads audit** | a connected Google Ads account | `audit-google-ads` |

There are no other modes (the former "cold/warm" split was retired on 2026-09-23).

## Where it lives

The engine, report, PDF route, funnel and landing page are the web app `audit-web` (`~/seo-audit`, repo
`devrikaro-ship-it/audit-web`), live on https://audit.devrika.io. This skill is the app's `skill/` folder,
symlinked into `~/.claude/skills/`. Nothing is duplicated outside the app.

**The report structure has one source: `docs/AUDIT-SPEC.md`.** Read it before touching the report; do not add or
remove rubrics or fields on your own.

## How to run an audit

1. From the UI: `/start` (landing page `/audit-seo`), or `POST /api/audit` with `{url}` (plus contact fields when
   the funnel sends them).
2. The report is at `/r/<id>`, the PDF at `/r/<id>/pdf`, leads in `/dashboard`.

## What the engine does

1. Detects the platform from the homepage (`lib/site-signals.ts`) and reads the site with that platform's
   profile (`lib/platform-knowledge/<platform>.json`: WooCommerce, Shopify, MerchantPro, GoMag, PrestaShop,
   OpenCart, Magento, generic) — sitemap signals, pace, traps and observed problems, each with its test store.
   Adding a platform = adding a profile file.
2. Selects up to 60 pages that sell: 15 categories + 35 products + at most 5 other pages, never sitemap order
   (`lib/page-selection.ts`); dead pages are replaced by pages of the same type.
3. When a shop refuses the server (403, challenge, or 30%+ of pages 403/429), reads it through the BrightData
   browser (`lib/browser-fetch.ts`). Page fetching is bounded to 30 s.
4. Builds the two rubrics: SEO (on-page, content, keywords, structure, schema, product-page titles and
   descriptions) and UX/UI (speed, homepage, category page, product page, filters).

5. Learns per platform from every audit: one observation per audit, learned reading pace and URL rules behind a
   5-domain safety gate, pending rules approved in the dashboard (`lib/observations.ts`, `lib/learning.ts`).

## Where the team works

https://audit.devrika.ro/dashboard (login): every audit (website and Google Ads) as a prospect with a sales status,
the report link, a per-platform summary and what the audit learned. Every finished audit is saved, contact or not.

Designs: `docs/superpowers/specs/2026-09-23-*.md`. Engine lessons: `docs/dev/mistakes.md`.

## Report rules

The invariants (a public report says "de verificat", never "lipsa", for what it cannot confirm; client language;
no diacritics; CTA) live in `docs/AUDIT-SPEC.md` §5 — do not restate them here.
