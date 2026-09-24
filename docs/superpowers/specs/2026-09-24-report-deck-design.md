# Site audit report as a two-part deck — design

Status: approved by the operator on 2026-09-24 (artifact https://claude.ai/artifact/6nMt9v9HoXdEWhjQgNVWCj,
version 2). Built on 2026-09-24.

## Why

The operator judged the long-scroll report ugly and asked for a chaptered presentation like the YTS Dental growth
plan (`~/clients/yts-dental-view/growth-plan-2026-09.html`). On the first design he asked for: the report split in
two, SEO then UX/UI; the llms.txt check added; a plain checklist at the end instead of a "what we fix" sales pitch.

## Structure

1. Cover — domain, overall score, the two parts with their scores.
2. "Pe scurt" — overall, SEO, UX/UI, the first thing to fix (a measured slow mobile page, otherwise the worst page
   problem).
3. Part 1 SEO — opener; six-zone table (SEO tehnic, Continut, Cuvinte cheie, Structura site, Date structurate,
   Vizibilitate in AI); the four worst page problems with the pages affected; product pages; AI visibility (AI
   crawlers, llms.txt, sameAs identity); SEO checklist.
4. Part 2 UX/UI — opener; mobile speed and page-type scores; found/missing per page type; UX/UI checklist.
5. Contact slide — "Intrebari despre raport?", no pitch.

A checklist shows open items as rows (checkbox, title, first line of the fix, pages or value found) and closes with
"Deja in regula" in a two-column block. Slides are filled by measured height (`paginateChecklist`), never by a row
count, because a row with a how-to line is 1.6 times taller than one without.

## Rules carried from AUDIT-SPEC

A value the audit could not measure reads "de verificat" (never a finding, never the first thing to fix). No
diacritics. Older reports without AI checks render five zones and no AI slide.

## Code

`lib/report-deck.ts` (pure model, tested in `lib/report-deck.test.ts`), `components/report-deck.tsx` (layout),
`app/r/report-deck.css` (every rule scoped under `.deck`; the phone layout applies to `screen` only so the PDF keeps
the 16:9 desktop layout). The PDF route is unchanged: Chromium prints `/r/<id>?print=1` with `@page 1200px 675px`.
