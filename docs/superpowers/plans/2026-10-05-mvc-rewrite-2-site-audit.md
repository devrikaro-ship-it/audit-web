# MVC Rewrite — Plan 2: the site-audit module

> **Execution:** inline (subagents disabled by `~/AGENTS.md`); implementation first, then tests, then each new test seen
> failing with its defect put back. Steps use checkbox (`- [ ]`) syntax.

**Goal:** move the website audit into `modules/site-audit/` as model / model/data / controller / view, split `runAudit`
into steps with injected input/output, bind its 9 addresses in `routes.ts`, and prove the same data and the same report.

**Architecture:** spec `docs/superpowers/specs/2026-10-05-mvc-modular-rewrite-design.md` §2, §3, §5, §6, §8; plan 1 gave
`shared/route-table.ts`, `shared/storage/json-file.ts` and the structure tests.

**Tech Stack:** as plan 1.

## Global Constraints

1. Same as plan 1 (branch, behaviour unchanged, English, stage by name, `skill/mistakes.md` never committed).
2. The engine's output (`AuditData`) and the rendered deck stay identical; the step ids and the waiting-screen texts stay.
3. Before the move, the equivalence corpus is captured on the old code (Task 1); it is compared after (Task 7).

## Move map

Pure files go to `model/`, files touching network, disk, browser or environment to `model/data/`.

| From | To |
|---|---|
| `lib/types.ts` | `modules/site-audit/model/types.ts` |
| `lib/audit-engine.ts` lines 20–936 (pure checks) | `modules/site-audit/model/checks/*.ts`, one file per topic (Task 3) |
| `lib/audit-engine.ts` `runAudit` | `modules/site-audit/model/steps/*.ts` + `controller/run-audit.ts` (Task 4) |
| `lib/page-selection.ts`, `parse-page.ts`, `seo-components.ts`, `seo-limits.ts`, `seo-score.ts`, `scoring.ts`, `site-kind.ts`, `site-signals.ts`, `robots-rules.ts`, `problems-db.ts`, `report-deck.ts`, `audit-request.ts`, `phone.ts`, `copy-registry.ts`, `platform-knowledge/` | `modules/site-audit/model/` (same names) |
| `lib/net.ts` site part (`fetchText`, `fetchPage`, `measureTTFB`, `probeProductFeed`, `fetchPSI`, `BROWSER_UA`, `PageData`, `PSIResult`) | `modules/site-audit/model/data/net.ts` |
| `lib/net.ts` `UNAVAILABLE` | `shared/copy.ts` (also used by google-ads) |
| `lib/browser-fetch.ts`, `page-render.ts`, `design-eval.ts`, `find-chrome.ts`, `report-pdf.ts`, `seo-probes.ts`, `learning.ts`, `observations.ts` | `modules/site-audit/model/data/` |
| `lib/leads-store.ts` | `modules/site-audit/model/data/audit-repository.ts`, on `shared/storage/json-file.ts` |
| `lib/audit-store.ts` | `modules/site-audit/controller/audit-jobs.ts` |
| `components/report-deck.tsx` | `modules/site-audit/view/report-deck.tsx` |
| page bodies of `app/(site-audit)/**` | `modules/site-audit/view/*.tsx` + `controller/*.ts` |
| tests `lib/<moved>.test.ts` | next to the moved file, same base name |

`lib/audit-config.ts` is imported by no address (only its test): it moves to `model/` with its test.

## Tasks

### Task 1: Capture the equivalence corpus on the old code
- [ ] Record, on the old engine, every network/browser/Claude answer of one audit of `https://www.magazinfitness.ro`
  (shop) and one of `https://dentalview.ro` (lead site) into cassettes under the scratchpad (not committed; they hold
  third-party HTML), with the engine's `AuditData` output.
- [ ] Replay each cassette into the old engine twice: the output must be identical to the recorded one (else the
  cassette is incomplete).
- [ ] Render `ReportDeck` to static HTML for the 41 audits in `~/seo-audit/data/audits.json` and the two cassette
  outputs; store one sha256 per audit.

### Task 2: Move the pure files and the data files
- [ ] `git mv` per the move map; rewrite every import mechanically from the map; `tsc` clean; full suite green.
- [ ] Split `lib/net.ts`: site part to `model/data/net.ts`, `UNAVAILABLE` to `shared/copy.ts`; the Google Ads part
  stays in `lib/net.ts` for plan 3.

### Task 3: Split the pure checks of `audit-engine.ts` by topic
- [ ] Generate the topic files with the TypeScript compiler API from a declaration→file map (urls, seo, content,
  keywords, ai, structure, schema, site, speed, ux-audit, ux-standard, product-signal, site-kind); each file imports
  exactly the declarations it uses. Byte-identical declaration bodies (checked by a script comparing each body).

### Task 4: `runAudit` as steps with injected input/output
- [ ] `model/steps/` — `read-home`, `read-sitemaps`, `choose-pages`, `read-pages`, `measure`, `compute-results`, each a
  function `(input, io, report) → output`, using the `AuditIO` port (type in `model/steps/io.ts`): `fetchPage`,
  `fetchText`, `openBrowser`, `readObservations`, `readApprovals`, `appendObservation`, `fetchPSI`, `measureTTFB`,
  `probeProductFeed`, `runSeoProbes`, `evaluateDesign`, `now`.
- [ ] `model/data/audit-io.ts` — the real `AuditIO`.
- [ ] `controller/run-audit.ts` — `runAudit(url, { kind, onStep }, io = realIO)` calls the steps in order; same
  signature and output as the old `runAudit`.

### Task 5: The repository on shared storage
- [ ] `audit-repository.ts` keeps `saveAudit`, `getAudit`, `listAudits` and the `LEADS_FILE` default; it reads and
  writes through `jsonStore`, keeps the in-memory cache, and refuses a corrupt file. Test: a corrupt `audits.json` is
  left untouched by `saveAudit` (seen failing on the old store).

### Task 6: Controllers, views, the module door and `routes.ts`
- [ ] `controller/`: `show-landing`, `show-funnel`, `show-processing`, `show-report`, `print-report-pdf`,
  `show-report-preview`, `scan-site` (POST `/api/scan`), `audit-api` (GET/POST `/api/audit`), `redirect-to-funnel`.
- [ ] `view/`: the page bodies moved out of `app/(site-audit)/**`, with links from `href()`.
- [ ] `modules/site-audit/index.ts`: `siteAudit` = the audit contract of spec §5 (`name`, `routes`, `start`, `steps`,
  `report`, `dashboardRow`) plus `controllers`.
- [ ] `routes.ts`: the 9 site-audit entries; each `app/(site-audit)/**` file becomes the thin form of spec §3 rule 1.
- [ ] The dashboard and any other user of the moved files import through `@/modules/site-audit`.

### Task 7: Prove it
- [ ] Replay both cassettes into the new engine: `AuditData` identical to the old output (time fields excepted:
  `durationMs` of the observation).
- [ ] Deck hashes identical for the 43 audits.
- [ ] Structure tests green with the 9 addresses bound; negative control: a hand-written `"/r/"` in a view fails rule 7.
- [ ] `tsc`, lint, full suite, build (same 31 routes); local run: `/audit-seo`, `/start`, an audit end to end,
  `/r/<id>`, `/r/<id>/pdf` answer as before.
