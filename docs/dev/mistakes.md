# seo-audit — dev mistakes

Code-level defects in this repo, one entry per incident. Not domain doctrine (that lives in `docs/AUDIT-SPEC.md`
and `docs/ads-research/`) — this is what broke in the code, how it was caught, and what fixes it. Report copy in
this file is user-facing Romanian by design; where quoted below it is TRANSLATED, with the exact source location
given so the literal string can be read directly in the file.

## 2026-09-04 — The production Google Ads OAuth client displays Google's unverified-app warning

**Symptom.** A real production OAuth run in standard Google Chrome passed the automated-browser check but then
displayed Google's warning that the application has not been verified. A developer can continue through the
advanced option, but a prospect sees a high-risk warning before granting read-only Google Ads access.

**Cause.** The OAuth client requests Google's sensitive Ads scope, while the public OAuth application
verification has not been completed for the production consent screen. The application routes, verified domain,
privacy page, and terms page can all exist while Google still treats the client as unverified until the consent
screen and requested scope complete Google's review.

**How to recognise it.** The redirect reaches `accounts.google.com` in a supported browser and displays the
unverified-application warning with an advanced bypass. This is distinct from the earlier unsupported-browser
screen: changing browsers removes the first screen but cannot remove this one.

**Fix.** Complete Google's OAuth application verification for the production client and sensitive Ads scope,
including the consent-screen identity, verified production domain, policy links, scope justification, and the
required demonstration. Keep the manual advanced bypass limited to internal verification until Google approves
the application. The customer launch is not friction-free while this warning remains.

**Class.** A successful OAuth callback proves the integration, not the public trust path. Production acceptance
for a customer-facing OAuth flow must begin in a clean supported browser and include every provider-owned screen
shown before consent; a warning outside the application's own domain can still block the product outcome.

## 2026-09-04 — Lock release raced stale-lock inspection and made the full suite alternate between pass and failure

**Symptom.** A fresh final verification run reported `553/554` tests with `ENOENT` while inspecting the Google
Ads lead-storage lock. The immediate rerun passed `554/554`, and repeated isolated runs also passed. The same
revision therefore alternated between success and failure without any source change.

**Cause.** After lock acquisition returned `EEXIST`, the waiter inspected the lock directory to decide whether
it was stale. The holder could remove that directory between those two filesystem operations. The resulting
`ENOENT` came from normal lock contention, but the waiter treated it as an unexpected storage failure.

**How to recognise it.** A lock implemented as a directory first reports that the directory exists and then
fails to inspect the same path because it no longer exists. A rerun often passes because the failure requires
the releasing process to land inside the small gap between the acquisition attempt and metadata read.

**Fix.** Treat disappearance during stale-lock inspection as successful release by another contender and retry
acquisition immediately. Preserve stale-lock cleanup when metadata still exists and continue propagating every
filesystem error other than the expected disappearance. Prove the ordering deterministically, then restore the
old behavior and observe the test fail as the negative control.

**Class.** A multi-step observation of shared filesystem state is not atomic. Every intermediate absence that
another valid participant can create must be modeled as a state transition, not as corruption; unexpected
errors still fail closed.

## 2026-08-26 — A deploy was incorrectly treated as a browser task even though Coolify API access already existed

**Symptom.** After the application changes were tested and pushed, delivery was reported as blocked because
Computer Use no longer had session approval for Google Chrome. The operator was asked to restore a browser
permission even though the project already had a configured Coolify API endpoint and token.

**Cause.** The deployment path was selected from the most recently used interface instead of being derived from
the available control surfaces in priority order. A transient browser-control failure was mistaken for a
deployment blocker before checking the existing official API credential.

**How to recognise it.** A deployment is described as blocked by Chrome, Computer Use, a dashboard login, or a
browser session before the project-local Coolify API configuration has been checked. A second signal is asking
the operator to repair browser access for an operation that the provider exposes through an authenticated API.

**Fix.** For Coolify deployments, check the configured official API first, resolve the exact application UUID,
queue the deployment through the API, poll its deployment UUID to a terminal state, and verify the deployed
revision plus live behavior. Use the browser only when the API cannot perform the required operation or when a
human-only login, MFA, CAPTCHA, consent, or legal acknowledgement is required.

**Class.** A failed interface is not a failed operation. Before escalating any interface failure, enumerate the
available control surfaces in this order: connected provider tool, official API or CLI with an existing
credential, authenticated persistent browser, then human intervention. The operation is blocked only when all
safe in-scope paths are exhausted.

## 2026-08-21 — A Romanian singular/plural fix landed on some report strings and not their siblings, and two titles were fixed while their bodies stayed plural

**Symptom.** A commit (`f8d0c00`) repaired Romanian grammar agreement in several report strings and its own
message claimed the standard was "fixed on the whole sentence, not just the noun". Re-running the report
functions with a population of exactly 1 shows five sites still render the plural form of the noun right after
the literal count "1" (field text, translated: "1 search queries burned budget with no sale" at
`lib/gads-findings.ts:287`; "There are 1 campaigns in the account, none delivered" at
`lib/gads-structure.ts:85`; "1 campaigns of a type that burns budget" at `lib/gads-structure.ts:168`; "1 paused
campaigns were doing better than the account average" at `lib/gads-structure.ts:204`; "Your budget is spread
over 1 times more products than it can carry" at `lib/gads-shopping.ts:81`). Two more findings have a
correctly-singular TITLE and a hardcoded-plural BODY: the "villains-quarantined" finding's title correctly reads
singular at count 1, but its body always uses the plural form of "product" (`lib/gads-findings.ts`, the `body:`
field beside that title's ternary); the "zombies" finding's title correctly reads singular at count 1, but its
body always uses the plural form too (`lib/gads-findings.ts:246`).

**Cause.** Measured by reading the current file content and cross-checking with `git log` per file: `f8d0c00`
(2026-08-21T13:23) touched only `lib/gads-findings.ts`, and only fixed the TITLE ternaries on two findings, not
their bodies. `lib/gads-structure.ts` and `lib/gads-shopping.ts` were both last touched on 2026-08-06, before
this grammar rule existed, and were never revisited. A fix scoped to the sites one commit happens to open leaves
every sibling site with the identical bug exactly as broken, and a title-only fix reads as complete because the
title is the number a person notices first.

**How to recognise it.** Any report string built by interpolating a bare count directly ahead of a Romanian
plural noun, with no singular/plural branch. Second signature: a finding whose TITLE has a singular/plural check
and whose BODY does not — the heading reads right and the paragraph under it does not, shipped in the same
object.

**Fix.** Not yet applied — filed here because it was found and independently re-confirmed against the live code
on 2026-08-21, not because it is fixed. The five bare sites need the same singular/plural branch already used
correctly in this file for the "livrare-limitata" (delivery-throttled) finding in `lib/gads-structure.ts`; the
two half-repairs need their BODY string put through the same check as their TITLE. One shared helper
(`singular(n, one, many)`) used at every site removes the whole class instead of leaving seven separate
instances of it standing.

**Class.** A class-repair proven by reading a diff is proven only on the sites the diff touched, never on the
sites it did not open. The population has to be re-derived by searching the whole tree for the PATTERN (a raw
count interpolated next to a plural noun) and each survivor re-run at count = 1 — never by re-reading the commit
message that claims the class is fixed.

## 2026-08-21 — A cost-tile counter was narrowed, shipped, and reverted the same day; the mismatch is still open, now documented inside the code itself

**Symptom.** The report's "findings that cost money" tile counted every finding, including one that itself
declares a zero cost value — so the tile read "5" while that finding's own text said it cost nothing. A same-day
change narrowed the counter to only findings with a positive cost value, moving the demo account's tile from 5
to 4, reported as proof the fix worked. Printing every finding in the same population showed what "4" actually
contained: a PROJECTED GAIN (the simulation finding, rendered green with a leading "+", 81,000 RON) counted as a
cost, alongside a 30-day figure (a "wasted search terms" finding, 2,800 RON) that the report's own 12-month
headline explicitly excludes. The section below the tile still lists all 5 findings, numbered 1 to 5, so a client
would read "4" at the top and count 5 underneath it.

**Cause.** Measured by building the demo report and printing key, tier, cost value and exclusion-flag for every
finding: the filter (cost value > 0) answers "does this finding carry a positive number", which is a different
question from what the tile's own label asks ("does this cost money"). A gain and a different-time-window figure
both already failed the label before the narrowing, and neither was checked, because the one finding that had
prompted the complaint was fixed and the total moved in the expected direction — 5 to 4 is consistent with a
correct fix AND with this one.

**Current state, re-verified 2026-08-21 at commit `6ba5fcc`.** The narrowed filter was REVERTED the same day, 17
minutes after being reported: `app/google-ads/raport/page.tsx` (around the cost-tile) counts every finding
again, with a code comment in place explaining why (field text, translated): the positive-cost filter "was worse
than the defect it removed... reaching the correct number needs the sign of the money to be a declared property
of a Finding rather than a guess made in three places. That is a change with a contract, not a one-line filter."
So the mismatch between the tile and the list beneath it is currently OPEN and KNOWN, not silently wrong — the
code names its own open defect and defers the real fix rather than shipping a narrower wrong answer.

**How to recognise it.** A filter added to an aggregate whose predicate is about the SHAPE of the data (a
positive number, a non-null value) while the tile's own label is about its MEANING (cost, loss). Second
signature, cheap to check: the aggregate and a visible enumeration of the same population sit on the same
screen — compare them after any change to either. Third: the only evidence offered for a fix is that a total
moved from A to B; a delta is satisfied by removing any one member, correct or not.

**Fix.** Not yet built. The real repair needs "does this cost money" to be a property carried on the finding
object itself (a declared sign: cost, gain, informational) and read identically by the tile, the ordering and
the per-finding rendering — rather than guessed three separate times from the numeric value alone. Tracked as an
open point inside the code's own comment at the tile; this entry is the durable record of why it is there.

**Class.** Narrowing an aggregate to exclude the one member that prompted a complaint leaves every other
mismatched member in place and produces a number that is differently wrong. An aggregate is proved by
enumerating its members against its own label, never by observing that the total moved — and reverting a bad
narrow fix is not the same thing as having fixed the mismatch the narrow fix was trying to close.
