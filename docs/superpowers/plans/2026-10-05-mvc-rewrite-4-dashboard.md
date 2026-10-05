# MVC Rewrite — Plan 4: the dashboard module and the audit contract

> **Execution:** inline (subagents disabled by `~/AGENTS.md`); implementation first, then tests, then negative controls.

**Goal:** move the agency dashboard into `modules/dashboard/`, give every audit module the contract the dashboard reads
(spec §5), bind the last 6 addresses, and close the rewrite: every address bound, `routes/index.ts` typed against all
30 entries, `lib/` and `components/` empty.

## Global Constraints

1. Same as plans 1–3. The dashboard pages render the same HTML (normalized: build hashes, CSS-module class hashes and
   server-action ids removed), captured with a real login on the built app before and after.

## Decisions

1. **The audit contract holds what its consumer uses** (amends spec §5): `name`, `channel` (the dashboard label),
   `filter` (the dashboard filter id) and `prospects()` (the module's audits as dashboard rows). `start`, `steps` and
   `report` stay as each module's own routes: the Google Ads audit has no waiting-screen steps, so a contract that
   required them would be false for one of its two members.
2. `lib/dash-auth.ts` and `lib/dashboard-session.ts` go to `shared/auth/`: `proxy.ts` uses them before any module runs.
3. `lib/dashboard-status.ts` goes to `modules/dashboard/model/data/status-store.ts` on the shared storage.
4. `lib/dashboard-rows.ts` splits: the row of each audit goes to its module (`model/prospects.ts`); the statuses,
   filter, sort and counts stay in `modules/dashboard/model/rows.ts`.

## Tasks

1. Move the files above; contract type in `shared/audit-contract.ts`; `siteAudit` and `googleAds` implement it.
2. Split the dashboard server pages into controller + view; client components and CSS to `view/`; actions and the
   login/logout handlers to `controller/`; bind the 6 addresses in `routes/dashboard.ts`.
3. `routes/index.ts` checks `satisfies Record<RouteId, unknown>`; the structure tests pass with every address bound;
   `lib/` and `components/` hold no source.
4. Prove: same dashboard pages, same 18 public pages, full suite (sequential, 8 GB host), build with the same 31 routes,
   local run of the audit and of the dashboard login.
