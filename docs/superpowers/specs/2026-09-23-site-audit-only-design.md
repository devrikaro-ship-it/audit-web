# The cold audit analyses the site only — design

Status: decided by the operator on 2026-09-23: "the audit tool does a site audit and nothing else"; the report
keeps SEO and UX/UI only, without tracking.

## What stays

1. **SEO** — the five sub-sections (on-page, content, keywords, structure, schema), plus the product-content
   signal (product titles and descriptions), moved here from the Google Ads rubric because it describes site
   content.
2. **UX/UI** — speed, homepage, category page, product page, filters and sorting.
3. The wrapper: hero with the overall score, "what this costs you", "why Devrika", CTA and contact. The CTA speaks
   about fixing the site, not about managing ads.

## What goes

1. The Tracking rubric (GA4, Google Ads conversions, Meta Pixel, TikTok, Consent Mode) and the runtime tracking
   detection.
2. The Google Ads rubric (CSS, Shopping competitors, Shopping presence, price position, brand defence, Google
   Business reviews) and its browser checks on Google.
3. The revenue simulation and its inputs.
4. Funnel steps that only fed those parts: conversion rate, average order value, ad budget, currency; scan-card
   tracking chips; ads-related "what worries you" options.
5. Code left without a consumer: `lib/roi-sim.ts`, `lib/css-detect.ts` (the BrightData country helper moves to
   `lib/browser-fetch.ts`, still used to read shops that block the server), tracking and currency detection in
   `lib/site-signals.ts`, `lib/currency.ts` if unused.

Reports already stored keep their old fields; the renderer simply no longer shows them.

## Not touched

The Google Ads audit application (`/google-ads`, `lib/gads-*`, `lib/calc`), and the internal warm audit
(`/cald`), which is a different mode and is raised with the operator separately.

## Done when

1. A production audit returns a report with exactly the SEO and UX/UI rubrics, no tracking, Google Ads or
   simulation section, rendered on `/r/<id>` and its PDF.
2. The funnel asks only the concern and the contact; the landing page presents two areas.
3. `docs/AUDIT-SPEC.md` and the skill describe the two-rubric report.
