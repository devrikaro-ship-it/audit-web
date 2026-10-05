# The audit app rewritten as one modular MVC structure

> **Status:** approved by the operator 2026-10-05, section by section. His decisions: rewrite the whole app into one
> MVC structure that holds all three products ("I want to combine all of them into one MVC structure"); the reasons
> are all three — code anyone can read and follow (which address calls which function), new audits added without
> touching the others (Meta Ads is "coming soon" on audit.devrika.io), and small parts tested on their own; it is
> done in one pass on a new branch (option 3, "on a new branch"), started from `main` after the Part 2 work in
> progress was committed and merged (af360b9).

## 1. What is rewritten

The app `audit-web` (`~/seo-audit`): about 17,000 lines in 120 source files plus 93 test files, 30 addresses
(22 pages, 8 route handlers) and 119 links written by hand. It holds three independent products:

1. **site-audit** — the website audit: landing `/audit-seo`, funnel `/start`, `/processing/[id]`, report `/r/[id]`,
   PDF `/r/[id]/pdf`, `/api/scan`, `/api/audit`.
2. **google-ads** — the audit of a connected Google Ads account: `/google-ads/…`, `/api/google-ads/…`.
3. **dashboard** — the agency dashboard: `/dashboard/…`, login and logout.

Plus the public pages: `/`, `/audituri`, `/hub`, `/termeni`, `/confidentialitate`.

Behaviour does not change: the same addresses, the same reports, the same stored files. Only the structure changes.
The Part 2 AI evaluation is finished after the rewrite, inside the new structure, as its own task.

## 2. The structure

Module first, then M/V/C inside each module, so adding an audit is adding one folder.

```
routes.ts                    the composition root: binds every address to its module's controller
app/                         only the address map: each page.tsx / route.ts is 3–5 lines that call routes.ts
  (site-audit)/  (google-ads)/  (dashboard)/  (public)/      route groups: they do not appear in the URL
modules/
  <module>/
    model/        the rules, with no network, disk or screen
    model/data/   everything that reads or writes: the site, PageSpeed, the browser, Claude, Google Ads, storage
    controller/   one function per action; receives the request, calls the model, returns what the view shows
    view/         the screens, drawn only from what the controller returns
    index.ts      the module's only door to the outside
shared/
  route-table.ts  the single address register as plain data: path, module, access, host — imports nothing
  auth/  storage/  net/  copy/  theme/  ui/
```

Next 16 allows it: project files may live outside `app/`, and route groups organise addresses without changing them
(`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`, "Route groups and private folders").

`model/data/` sits inside `model/` rather than as a fourth layer: in MVC, data access belongs to the model; it is a
subfolder only so the rules can be tested without the network.

## 3. The rules of the structure

Each rule is enforced by a test that reads the imports and fails when the rule is broken.

1. A route file in `app/` whose address is bound in `routes.ts` imports only `@/routes` (and Next itself); it may
   also hold Next's literal segment config (`dynamic`, `runtime`) and its `metadata`, which Next reads statically.
2. A file in `view/` imports no `model/data/` file and no storage. It may import another module's door (`index.ts`)
   to show that module's view (the dashboard shows the Google Ads report view); data files stay closed by rule 4.
3. A file in `model/` outside `model/data/` touches no network, disk, process environment or React.
4. A module imports another module only through its `index.ts`.
5. `shared/` imports no module and not `routes.ts`.
6. Every address under `app/` has exactly one entry in `shared/route-table.ts`, and every entry has its file under
   `app/`; when the rewrite ends, every entry is bound in `routes.ts` (checked by the type `Record<RouteId, …>`).
7. No link in `modules/` or `app/` is a hand-written path: links come from `href(route, params)`.

## 4. The address register

The register is two files, so that `shared/` never depends on a module and `proxy.ts` (which runs before every
request) does not load the whole app:

1. `shared/route-table.ts` — plain data, one entry per address, importing nothing:

```ts
siteReport:    { path: "/r/[id]",    module: "site-audit", access: "public", onSiteHost: true }
dashboardHome: { path: "/dashboard", module: "dashboard",  access: "agency", onSiteHost: true }
```

2. `routes.ts` at the project root — the only file that sees every module; it binds each entry to its controller:

```ts
export const routes = { siteReport: siteAudit.controllers.showReport, /* … */ } satisfies Record<RouteId, Controller>;
```

`onSiteHost` replaces the hand-kept path list in `lib/host-routing.ts`: the addresses served on audit.devrika.ro are
the entries that say so (static assets stay listed in host routing, they are not addresses of the app).

`access` is one of `public`, `agency` (the dashboard login), `gads-session` (a connected Google Ads visitor). Access is
enforced in one place: `proxy.ts`, which already runs before every address (host routing between audit.devrika.ro and
audit.devrika.io, then the dashboard login), reads each address's `access` from the register instead of testing
`pathname.startsWith("/dashboard")`. No controller or page checks access again. Links are built with
`href(routes.siteReport, { id })`.

## 5. The audit contract

Amended while building plan 4: the contract holds what its consumer, the dashboard, uses. Every audit module exports
it from its `index.ts` (`siteAudit.audit`, `googleAds.audit`; type in `shared/audit-contract.ts`):

1. `name`;
2. `channel` — the label the dashboard shows ("Audit site", "Audit Google Ads");
3. `filter` — the dashboard filter id, also the prefix of each row key ("site", "gads");
4. `prospects()` — the module's audits as dashboard rows.

`routes/audits.ts` lists the audit modules and `routes/dashboard.ts` gives the list to the dashboard, which imports no
audit module by name: a new audit is one more line in `routes/audits.ts`. Start, waiting-screen steps and the report
stay each module's own addresses: the Google Ads audit has no waiting-screen steps, so a contract requiring them would
be false for one of its two members.

## 6. Storage

One read/write implementation in `shared/storage/` for the five JSON stores of today (audits, Google Ads leads,
dashboard statuses, dashboard sessions, pending Google Ads reports). A write goes to a temporary file that then
replaces the old one. **File names, locations, environment variables and formats stay exactly as today**: the audits
already stored on the production volume `/app/data` must open unchanged.

## 7. Errors

1. A step that fails (PageSpeed, browser, Claude) is "de verificat" and the audit continues (`docs/AUDIT-SPEC.md`
   §5.1, unchanged).
2. An `agency` address without a session redirects to the login in `proxy.ts`, with today's 401 / 503 answers kept.
3. An unknown id: the controller returns "not found"; the page shows today's error screen.
4. A failed write leaves the previous file whole and is logged.

## 8. The site-audit pipeline

`runAudit` (`lib/audit-engine.ts`, about 260 lines in a 1,180-line file) is split into one file per step in
`modules/site-audit/model/steps/` — citire, robots, alegere, probes, pagini, viteza, verificari, ai, scor — each with
a declared input and output; `controller/start-audit.ts` calls them in order and reports progress. The step ids and
the texts the waiting screen shows stay the same.

## 9. Verification

Everything is published once, at the end. On the branch the work is committed in parts, each with its own proof:

1. **Skeleton** (`shared/`, the register, the structure tests): each structure test is seen failing with a breach put
   in on purpose, then passing.
2. **site-audit**: stored reports copied from production render the same deck, byte for byte, on the old and the new
   code. A live site and PageSpeed change between two runs, so a fresh audit is compared on recorded answers: the
   responses of one audit of magazinfitness.ro (and of one lead site) are recorded once at the `lib/net.ts` /
   browser boundary and replayed to the old and the new engine, which must return the same data.
3. **google-ads**: the hand-computed tests pass; the demo report (`GADS_DEMO=1`) renders the same.
4. **dashboard**: the same rows, statuses and login behaviour.
5. **Final**: the full suite (818 tests today, moved to the new paths) passes, `npm run build` passes, and the 30
   addresses answer locally as in production (status code and content).

## 10. Out of scope

1. Changing an address (for example `/r/` to `/raport/`): not chosen.
2. The 28 FAIL lines of `skill/audit-google-ads/scripts/check_report_coverage.py`: they predate the rewrite (same
   output before and after the skill move on 2026-10-05); the script's paths are updated, its findings are not fixed
   here.
3. `skill/mistakes.md`: untracked and holding a client's sales figures; it stays out of the public repo.
