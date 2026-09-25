# Site audit for shops and lead generators — Implementation Plan

> **For agentic workers:** executed inline in the primary session (AGENTS.md: no subagents). Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** the site audit decides whether a site is a shop or a lead generator, reads the pages that bring it money,
and reports SEO and UX/UI rows that fit its kind, with a waiting screen that shows the engine's real steps.

**Architecture:** a pure classifier (`lib/site-kind.ts`, Darwin's rule) decides the kind; the funnel lets the visitor
correct it; the engine branches page selection, SEO rows and UX fields on the kind; the deck renders both kinds with
the same structure and ✓/✗ checklists. The engine reports its steps into the job so the waiting page can show them.

**Tech Stack:** Next.js 16 (app router), TypeScript, Vitest, playwright-core (PDF), Coolify deploy.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-25-site-audit-ecom-leads-design.md` (source of truth).
- Scope is the site only: no revenue estimates, no registry data, no competitors, no search-position lookups.
- AUDIT-SPEC §5: what cannot be measured is "de verificat", never a finding; client wording without diacritics or
  technical terms (`lib/report-copy.test.ts` gate); the report page imports no server-only code
  (`lib/report-client-imports.test.ts`).
- Every new test is seen failing with its fault put back; the commit names what failed.
- Each task ends deployed (pre-flight `~/.claude/hooks/deploy-checks.sh --conf ~/.claude/hooks/deploy-checks.seo-audit.conf --pre`,
  push to `main`, Coolify deploy of `eywy2rjfyittg93wk2j3phco`) and checked on production.
- Reports saved before keep rendering as they do.

---

### Task 1: One browser user agent and short retries for every request

**Files:**
- Modify: `lib/net.ts` (export `BROWSER_UA`; use it in `fetchText`/`fetchPage`/`measureTTFB`/`probeProductFeed`;
  retry 5xx and timeouts too, pauses 1000 ms then 2500 ms, `Retry-After` honoured, 403/404 not retried)
- Modify: `lib/seo-probes.ts` (use `BROWSER_UA`), `app/api/scan/route.ts` (use `BROWSER_UA`)
- Test: `lib/net-retry.test.ts`

**Interfaces:** Produces `BROWSER_UA: string` from `lib/net.ts`.

- [ ] Step 1: test — a stubbed `fetch` answering 503 then 200 makes `fetchText` return the body; a 404 is fetched
  once; every request carries `user-agent === BROWSER_UA`.
- [ ] Step 2: run, see it fail (no 5xx retry, different UA).
- [ ] Step 3: implement; grep that no other user-agent string remains in `lib/` and `app/api/`.
- [ ] Step 4: full suite + typecheck; commit; deploy; a production audit of diente.ro reads 60 pages.

### Task 2: The site-kind classifier

**Files:**
- Create: `lib/site-kind.ts`, `lib/site-kind.test.ts`

**Interfaces:** Produces
`classifySiteKind(html: string, url?: string): { type: "ecom" | "leads"; confidence: "high" | "medium" | "low"; evidence: { ecom: Signal[]; leads: Signal[] } }`
and `SiteKindUnreadable` (thrown under 200 readable characters), `type Signal = { id: string; strength: string; sample: string }`.

- [ ] Step 1: tests, one per rule of spec §1 (structural decides; platform + 2 weak = ecom low; 2 weak and no lead
  signal = ecom low; otherwise leads, high with a lead signal; unreadable throws), plus the dentalview case: a page
  with `wp-content/plugins/woocommerce`, "40 lei", a Contact Form 7 form and `tel:` is leads, high.
- [ ] Step 2: run, see them fail (module missing).
- [ ] Step 3: port `~/Projects/darwin/backend/services/typeScan.js` markers and branches verbatim in TypeScript, the
  platform markers from `lib/site-signals.ts` (`detectPlatform`, commerce platforms only).
- [ ] Step 4: run on the real home pages (script in the scratchpad): dentalview.ro leads/high, magazinfitness.ro and
  diente.ro ecom; commit.

### Task 3: The kind in the funnel and the engine

**Files:**
- Modify: `app/api/scan/route.ts` (return `siteKind` from `classifySiteKind`, keep `isEcom` for old clients)
- Modify: `app/start/page.tsx` (card row "Tip site" with "Schimba"; the chosen kind is sent as `siteKind`)
- Modify: `lib/audit-request.ts` (`siteKind?: "ecom" | "leads"` on start/full bodies, validated)
- Modify: `lib/audit-store.ts`, `lib/audit-engine.ts` (`runAudit(url, { kind?: "ecom" | "leads" })`; the engine
  classifies the home page, a visitor choice wins; `AuditData.siteKind = { type, by: "scan" | "visitor", confidence, evidence }`;
  `isEcom` = `siteKind.type === "ecom"`)
- Modify: `lib/types.ts`, `app/dashboard/page.tsx` (kind and who decided)
- Test: `lib/audit-request.test.ts` (accepts ecom/leads, refuses anything else), `lib/site-kind.test.ts` (override)

- [ ] Steps: failing tests, implement, run, commit, deploy; production scan of dentalview.ro shows "Site de servicii".

### Task 4: Pages that bring contacts

**Files:**
- Modify: `lib/page-selection.ts` (`PageType` gains `"service" | "location"`; `LEAD_QUOTAS = { service: 30, location: 20, other: 9 }`;
  `classifySitemap` recognises sitemap files named `service`, `servicii`, `location`, `locatii`; blog/article
  sitemaps and paths (`post-sitemap`, `/blog/`, `/articole/`) excluded for leads; `classifyFetchedPage` for leads:
  address + map or opening hours = location, else service when the page is not an article)
- Modify: `lib/audit-engine.ts` (select with the quotas of the kind)
- Test: `lib/page-selection.test.ts` (dentalview-shaped sitemaps: services and locations chosen, articles left out)

- [ ] Steps: failing tests, implement, run, commit, deploy; a production audit of dentalview.ro reads its service
  and location pages (log the chosen URLs).

### Task 5: SEO rows for lead sites

**Files:**
- Modify: `lib/seo-components.ts` (`SeoInput.kind`; component 3 row `sitemap_tipuri` = services and locations;
  component 4 drops `parametri` for leads; component 5 rows `html_serviciu`, `html_contact` (phone and address in the
  HTML), `html_descriere` on service pages; component 8 `text_servicii`, `locatii_diferite` (location pages whose
  own text is not copied from another location page); component 9 `schema_afacere_locala` (LocalBusiness or a subtype
  with address and telephone), `schema_program` (openingHours), `contact_consecvent` (the same phone on every page
  read), `schema_rating`, `schema_traseu`)
- Modify: `lib/seo-copy.ts` (wording of the new rows)
- Test: `lib/seo-components.test.ts` (a good lead site all ✓; each fault found where it is)

- [ ] Steps: failing tests, implement, run, jargon gate, commit, deploy; production dentalview.ro rows read by hand
  for every ✗.

### Task 6: UX/UI as ✓/✗ for both kinds, five lead fields

**Files:**
- Modify: `lib/audit-engine.ts` (`computeUxLeads(pages, seg, mobile)` returning the five fields of spec §4 with
  `gasit`/`lipsa` signals; the UX score becomes the share of found signals over all judged signals, both kinds)
- Modify: `lib/report-deck.ts` (Part 2 checklist as `StdGroup[]` for reports with `siteKind`), `lib/seo-copy.ts` or a
  `lib/ux-copy.ts` for the lead fixes
- Test: `lib/ux-leads.test.ts`, `lib/report-deck.test.ts`

- [ ] Steps: failing tests, implement, run, commit, deploy; production dentalview.ro checked field by field.

### Task 7: Report wording by kind

**Files:** `components/report-deck.tsx`, `lib/report-deck.ts` (cover subtitle, part openers, "Pe scurt": services
instead of products, "programare/contact" instead of "cos"); `lib/report-copy.test.ts` renders a lead report too.

- [ ] Steps: failing test (a lead report must not say "produs"/"cos" outside row names that belong to shops),
  implement, run, commit, deploy.

### Task 8: The real-progress waiting screen

**Files:**
- Modify: `lib/audit-store.ts` (`AuditJob.steps: Step[]`, `reportStep(id, state, result?)` passed to `runAudit`)
- Modify: `lib/audit-engine.ts` (report the eight steps of spec §6 with their measured results)
- Modify: `app/api/audit/route.ts` (GET returns `steps`), `app/processing/[id]/page.tsx` (render the steps, the
  bar "Pasul N din 8" and elapsed time; drop the rotating fixed sentences)
- Test: `lib/audit-steps.test.ts` (steps advance in engine order; a step that could not measure ends "unmeasured")

- [x] Steps (delivered 2026-09-25: eb22f50, 0287562, 193490a; the freeze it exposed fixed in 1a50def): failing test, implement, run, commit, deploy; watch a production audit's waiting page (screenshots
  every few seconds) and match each result with the report.

### Task 9: Final verification

- [ ] Production audits of dentalview.ro, magazinfitness.ro and diente.ro: kind right, pages right, every ✗ read by
  hand, no slide taller than the screen or the print page, desktop and phone PDFs in Barlow, jargon gate on the
  live text; PDFs saved to the Desktop; docs (AUDIT-SPEC, skill SKILL.md, mistakes.md) updated.
