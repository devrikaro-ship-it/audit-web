# seo-audit — dev mistakes

## 2026-09-24 — The report said a page lacks a trail while also saying every page has one

Symptom: magazinfitness.ro's checklist listed "Pagini fara traseu: 1 din 60" above "Traseul paginii afisat in Google: 54 din 54". Measured cause: the visible-trail check judged every page read, home page included, while the structured-data check judges category and product pages only; the one "missing" trail was the home page, which has none by design. Recognition signal: two checks about the same element with different page sets (60 vs 54). Repair: `computeStructuraChecks` takes the category and product lists and judges the trail on those pages only; now 54 / 54 on both.

## 2026-09-24 — Two report rows measured the same heading, and titles were read with their HTML codes

Symptom: the magazinfitness.ro report listed "Cuvantul cautat lipseste din titlul paginii" (10 pages) and "Text fara cuvantul pe care il cauta clientii" (7 pages) as two problems. Measured cause: both tested whether the H1 contains the first words of the title (3 words vs 2), so one fault was counted twice in the score. While moving the second one to the written text, diente.ro showed two more defects: category pages were judged on the delivery sentence every page repeats, and `parseTitle` kept `&ndash;`, so "ndash" became a searched word. Recognition signal: two checks whose code reads the same element; a searched word that is an HTML entity name. Repair: `cuvinte_cheie` reads the page's own written text (`ownWrittenText`, template excluded, pages without own text not judged); `parseTitle` decodes character references (`decodeEntities`). Each fix has a test that failed first.

## 2026-09-24 — Two report findings were a fixed share of the pages, shown as measured

Symptom: the public report of magazinfitness.ro said "Text repetat intre pagini: 5 din 60" and "Pagini care concureaza pe aceeasi cautare: 10 din 60", labelled MASURAT. Measured cause: `continut_unic` was `total - round(total * 0.08)` ("placeholder") and `kw_fara_canibalizare` was `round(total * 0.84)`, so every shop got the same two findings. Measured on the same shop, both are 0. Recognition signal: a finding whose count is a constant share of the pages read on every audit; grep the engine for `total * 0.`. Repair: `duplicateTextPages` and `sameHeadingPages` measure the pages read; a test on 25 distinct pages fails with either formula put back. The first version of the duplicate measure flagged filter lists (magazinfitness.ro/magazin) and product names on cards (diente.ro/collections/lucas); only blocks ending a sentence count as written text now.

## 2026-09-24 — Three report links read as lost by a deploy, when they had never been saved

Symptom: after the font deploy, three production report ids used in earlier sessions answered 404, and a memory summary said they had been verified live that same morning, so the deploy looked like it had wiped the saved reports. Measured cause: none of them was ever in the durable store. The one created on production (2d924663, 2026-09-23 15:59 UTC) predates "save every finished audit" (d437a1c, committed 17:40 UTC, deployed after 18:22 UTC), so an audit with no contact lived only in memory and was dropped by the evening deploy; a fresh production audit survived a container restart (new internal IP, same answer). Recognition signal: a report id that 404s after a deploy. Check its creation time against the deploy of d437a1c and repeat the test with a fresh audit and a restart before suspecting the volume. Repair: none needed in the code; an automatic memory summary is a claim, not proof that a report was checked.

## 2026-09-24 — The 16:9 PDF printed the phone layout

Symptom: the first PDF of the deck had every two-column slide stacked in one column, and one slide spilled onto an extra page with only its footer. Measured cause: the deck's `@media (max-width:760px)` phone rules matched while Chrome laid out the page for printing. Recognition signal: a PDF page count higher than the slide count, or stacked columns only in the PDF. Repair: the phone rules are `@media screen and (max-width:760px)`, so print keeps the desktop layout; the check is PDF pages == slides.

Related: Chrome's `--print-to-pdf` never finishes against `next dev` (the hot-reload connection keeps the page busy), so a PDF is verified against `next build && next start`, never the dev server.

## 2026-09-24 — llms.txt reported missing on a shop that has one

Symptom: the local audit of diente.ro (Shopify) scored llms.txt 0/1 while fetching https://diente.ro/llms.txt alone returned 4,471 characters. Measured cause: the file was requested after the 60-page burst, when the shop was rate-limiting the audit, so the small request failed and read as "no file". Recognition signal: a site-level file check that fails only on shops that throttle (Shopify, MerchantPro) and passes when fetched by hand. Repair: site-level files (robots.txt, llms.txt) are read before the page burst; the sameAs signal is read from the JSON-LD of every page fetched instead of a regex on the homepage.

## 2026-09-23 — The report PDF printed an error page and returned 200

Symptom: after Chromium was installed, "Descarca PDF" answered 200 with a one-page PDF showing "ERR_SSL_PROTOCOL_ERROR". Measured cause: the route asked Chrome for req.nextUrl.origin, which behind the proxy is https://localhost:3000, while the container serves plain HTTP; the route never checked what it printed. Recognition signal: a report PDF of one page or ~20 KB. Repair: Chrome reads http://127.0.0.1:<PORT>/r/<id>?print=1 and the route checks the report answers before printing (502 otherwise).

## 2026-09-23 — One failed remote-browser open cost a whole audit

Symptom: spishop.ro (refuses the server) read 6 pages instead of 45 and was not recognised as PrestaShop. Measured cause: the first BrightData open failed, so detection, robots and the sitemap used the 403 page; the browser opened only later. Repair: openWithRetry (two attempts). Still open: later the same day the store also refused in-page requests from production after about ten test audits; local reads through the same browser returned 200.

## 2026-09-23 — The public report said "BreadcrumbList / Organization missing" on sites that have them

Symptom: magazinfitness.ro was reported without BreadcrumbList and without Organization schema; diente.ro and mariart.ro without Organization. Measured cause: the checks read only the homepage (BreadcrumbList lives on category and product pages, rating on product pages), read only the top-level `@type` (Rank Math, Yoast and Shopify put entities in `@graph`; `@type` can be an array; AggregateRating is nested in Product), and accepted only three exact organization names (OnlineStore was missed). A check with no key was also shown as OK. Recognition signal: a schema finding that contradicts a JSON-LD block visible in the page source of a category or product page. Repair: `schemaTypes` walks the whole JSON-LD; each element is checked on the page type where it belongs, as coverage (80%+ good, some = partial, none = missing) with real counts; organization subtypes by schema.org naming; a check whose page type was not read is left out and the renderer no longer shows a missing check as OK.

## 2026-09-23 — Shops that block datacenter IPs produced near-empty reports

Symptom: from production, spishop.ro read 0 pages and invictusmedical.ro 3-24 pages, while from a residential IP the same stores read 58-60 pages. Measured cause: spishop.ro and vegis.ro answer 403 to the Hetzner IP; invictusmedical.ro accepts about 2 requests per 7 s from it, with a browser identity too; most large Romanian Magento stores answer 403. Recognition signal: a production audit with far fewer pages than a local run of the same URL, or 403/429 on the homepage or on 30%+ of pages. Repair: `lib/browser-fetch.ts` opens the homepage once in the BrightData browser (residential EU IP) and fetches the rest from inside that page, only when `looksBlocked` says the server was refused.

## 2026-09-23 — Platform detection called almost every shop Magento or WooCommerce

Symptom: the scan reported pcgarage, dedeman and flanco as Magento, MerchantPro stores (invictusmedical, modlet) as WooCommerce, apivitalis (GoMag) as WooCommerce and zevo (OpenCart) as Magento. Measured cause: the Magento pattern contained bare `mage/`, which matches every `image/` path, and the WooCommerce pattern contained `add-to-cart`, a button name every platform uses; WooCommerce was also tested before the hosted platforms. Recognition signal: a platform marker that is a generic word or a substring of a common path. Repair: each platform is recognised by markers specific to it (its CDN host, module prefix or route), hosted-CDN platforms first; checked live on 11 stores.

## 2026-09-23 — Shopify and GoMag/PrestaShop sitemaps were read empty

Symptom: on diente.ro only the product sitemap was read, collections and pages came back empty; GoMag and PrestaShop sitemaps yielded no URLs to the old parser. Measured cause: Shopify answers 429 to bursts (4 simultaneous requests: 23 of 24 refused; 2: 3 of 24), its child URLs carry an XML-escaped `&amp;` query, and GoMag/PrestaShop wrap every `<loc>` in CDATA. Recognition signal: a typed sitemap that returns zero URLs while the same URL fetched alone returns hundreds. Repair: bounded 429 retry in `lib/net.ts`, XML-unescaping and CDATA stripping of `<loc>`, and per-platform concurrency from the reading profile (Shopify 2).

## 2026-09-23 — The cold audit analysed the blog instead of the shop

Symptom: the production cold audit of magazinfitness.ro (61 pages) reported "product page: not caught in crawl", scored the category page on blog posts, counted 0 product titles for the Catamo signal, and every Google Ads field said "could not verify". Measured cause: pages were taken in sitemap order up to 60, and the sitemap index listed 63 blog posts first; URLs were typed by path depth, so one-segment WooCommerce product URLs counted as categories; only the first 5 child sitemaps were read, so `product_cat` (6th) was never seen. The Shopping queries were then built from blog titles. Recognition signal: an ecom audit with `productSignal.checked = 0` or a product UX field "necunoscut" on a store that has products. Repair: `lib/page-selection.ts` types child sitemaps by name, reads every product and category sitemap, applies per-type quotas with even sampling, and confirms products by content; category-sitemap URLs stay categories because WooCommerce category grids carry add-to-cart buttons.

## 2026-09-08 — Preserve optional-property narrowing across report callbacks

Symptom: the report UI passed its Vitest checks, but strict TypeScript compilation reported six `string | undefined` arguments where currency formatting happened inside callbacks. Measured cause: the code guarded `session.currencyCode` as a mutable object property, and TypeScript did not retain that property narrowing across callback boundaries. Recognition signal: a required value is checked on an object and then read again from that object inside `map` or another closure. Repair: capture the property once in a stable local constant, guard the constant, and use the narrowed local throughout the report construction and legacy views. Keep the currency read from the opened signed snapshot authoritative for the active dashboard. Run strict TypeScript checking in addition to transpile-only UI tests.

## 2026-09-08 — Validate finite handoff and proof shapes before launch

Symptom: point-two launch rejected a missing predecessor mapping, and later code-proof registration rejected an extra reference inside the reviewer verdict. Measured cause: document links do not substitute for `context.dependency_results`, and `reviewer_verdict` permits exactly `status`, `revision` and `repo_root`. Recognition signal: a dependent point without its exact point/result/reference entry, or an otherwise correct verdict object with extra keys. Repair: supply every declared predecessor once, and place optional provenance outside the exact verdict object. Both corrected records were accepted without changing their substantive evidence.

## 2026-09-08 — Keep the local browser host consistent

Symptom: demo connection from `127.0.0.1` returned a session-expired screen. Measured cause: the application redirected to `localhost`, while its host-only cookie belonged to `127.0.0.1`. Recognition signal: different loopback hostnames before and after the redirect. Repair: start and continue the local demo flow on `http://localhost:3100`; normal connection and account selection then succeeded. No cookie policy or production behavior was changed.

## 2026-09-08 — Preserve a completed review across a handoff timeout

Symptom: the review artifact and checkpoint recorded PASS, while the launcher reached its deadline before terminal handoff. Measured cause: the bounded attempt ended after the finite review was complete; the reason for delayed terminal output was not established. Recognition signal: completed checkpoint, persisted exact-revision verdict, and a timeout attempt record. Repair: preserve the completed checkpoint, which correctly refuses modification, and use the permitted identical retry to return the saved result after identity checks. The retry must not repeat completed source review or tests.

## 2026-09-08 — Extensionless test declarations silently reduced the executed test set

**Symptom.** The account UI check reported two passing test files and 13 passing tests even though its declaration named three files. The command still exited successfully, so the missing branch suite could have been mistaken for full coverage.

**Cause.** The declared paths ended in `actions.test.ts` and `actions-branches.test.ts`, while the repository files are `actions.test.tsx` and `actions.branches.test.tsx`. Vitest ran the matching page test and one separately matched file without rejecting every unmatched explicit path.

**How to recognise it.** Compare the declared file list with `rg --files` and compare the expected file count with Vitest's `Test Files` total. A green command with fewer executed files than declared is an incomplete check.

**Fix.** Use the exact `.tsx` filenames and preserve punctuation in the branch test name. The repaired check runs three files and 16 tests. Treat the executed file count as part of the test receipt, not only the exit status.

**Class.** A green test command proves only the tests the runner discovered. Exact input identity and observed test counts are required before accepting the result.

## 2026-09-08 — Result proof requires the verifying state

Symptom: recording valid local result proof failed with `result proof requires point state verifying`. Measured cause: the coordinator left the point at `local_ready` while the independent verifier ran. Recognition signal: a finished verifier receipt with the ledger still at `local_ready`. Repair: use the supported transition to `verifying`, then record the unchanged proof. The first rejected command did not change state. Future dispatches must set the declared role state before recording its result.

## 2026-09-08 — Consume finalized role artifacts

Symptom: an early draft evidence identifier no longer matched the implementation owner's final receipt. Measured cause: the coordinator prepared a mapping before the role process completed. Recognition signal: an active role alongside intermediate receipt files. Repair: wait for the bounded task's terminal result, then derive mappings from the finalized artifact's actual identifiers. File existence alone does not establish a completed handoff.

Code-level defects in this repo, one entry per incident. Not domain doctrine (that lives in `docs/AUDIT-SPEC.md`
and `docs/ads-research/`) — this is what broke in the code, how it was caught, and what fixes it. Report copy in
this file is user-facing Romanian by design; where quoted below it is TRANSLATED, with the exact source location
given so the literal string can be read directly in the file.

## 2026-09-08 — Inline JSX whitespace disappeared from the rendered privacy instructions

**Symptom.** The privacy page source visually separated the inline bold application name from the following
words, but the real server response contained `<b>Audit Devrika</b>in the list`. The visible instruction read
`find Audit Devrikain the list`.

**Cause.** The boundary after the inline `<b>` element had no explicit JSX whitespace node. In the rendered
server HTML, the ordinary source whitespace did not become a leading space in the following text node. The
observed output establishes the missing separator; no unsupported claim about the exact compiler transform is
needed.

**How to recognise it.** Inspect rendered HTML or visible text where prose continues immediately after an
inline JSX element. A closing tag followed directly by the first character of the next word, such as
`</b>in`, is the stable signal; source formatting alone is not evidence that a space renders.

**Fix.** Add an explicit `{" "}` JSX separator after the inline element. Verify both the exact server-rendered
HTML boundary and the normalized visible sentence, then confirm the real local HTTP response contains the
correctly separated words.

**Class.** Whitespace around inline JSX elements is output behavior. Protect the rendered boundary, not the
source indentation that appears to express it.

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

## 2026-09-08 — Locale currency formatting hid the supplied account currency code

**Symptom.** Analytical findings supplied with `EUR` rendered values such as `€148,817` and `€2,977` instead
of displaying the authoritative account currency code. The amount was numerically correct, but readers could
not directly compare the emitted unit with the currency code selected from the Google Ads account.

**Cause.** The emitters passed the account code into `Intl.NumberFormat` with `style: "currency"`. The locale
formatter legitimately converted that code to a symbol, which weakened the explicit account-currency contract.

**How to recognise it.** A non-default currency test supplies an ISO code but asserts only a locale symbol, or
the output contains a money symbol without the exact supplied code. A missing-currency path that silently falls
back to a default code is the same class of defect.

**Fix.** Format the rounded, grouped numeric value independently, append the unchanged supplied ISO code, and
emit `currency units` when no authoritative currency is available. Prove both arms with independently expected
strings and a witnessed non-RON negative control.

**Class.** When provenance is part of a displayed value's meaning, a human-friendly formatter must not erase
the provenance token. Preserve the authoritative identifier explicitly and treat its absence as unavailable.

## 2026-09-08 — Reporting verification omitted the metric emitter and left a split language contract

**Symptom.** The report metric emitter returned English account, classification, and unavailable-state copy,
while three expectations in `lib/gads-report-metrics.test.ts` still asserted Romanian text. The previously
reported UI verification remained green because its declared command did not execute the metric test file.

**Cause.** The reporting surface and its metric emitter were verified as separate change fragments without one
impact plan mapping the emitter to both the focused metric contract and the rendered report suite. That allowed
production and test language contracts to diverge while each partial handoff appeared complete.

**How to recognise it.** A reporting-language change has one green UI command but no explicit emitter check, or
the change-impact plan maps a report metric module to only its unit test and not its consuming UI. Searching the
focused expectations for the retired language exposes the split immediately.

**Fix.** Map `lib/gads-report-metrics.ts` to both `report_metrics` and `report_ui`, repair the stale expectations,
and require witnessed negative controls plus restored positive runs for both commands before handoff.

**Class.** A cross-layer user-visible contract is complete only when the producer and every declared consumer
share one impact plan. Separate green receipts do not prove the seam between them.

## 2026-09-09 — Test fixtures escaped focused checks but failed the strict repository compiler

**Symptom.** The strict `tsc --noEmit --incremental false` control reported eight diagnostics in three test
files even though their focused runtime tests had previously passed. Account-list mocks rejected valid account
arrays, environment tests assigned directly to the readonly `NODE_ENV` declaration, and one OAuth assertion
indexed a React `HTMLAttributes` value with a custom data-attribute key absent from that generic interface.

**Cause.** Empty-array mock implementations inferred `never[]`, runtime-mutability assumptions bypassed the
installed Node type declaration, and a valid runtime custom attribute was read through a narrower library type.
Focused transpile-and-run checks did not type-check the complete test population, so these fixture-only defects
remained invisible until the global strict compiler ran.

**How to recognise it.** A mock initialized with an untyped empty array later receives structured fixtures; a
test writes `process.env.NODE_ENV` directly; or an assertion indexes a library-owned generic object using a
custom key. A focused test that passes without a repository-level strict compiler is not evidence that its
fixture types are valid.

**Fix.** Bind empty-array mocks to the exported production return type, use Vitest's environment stubbing with
guaranteed cleanup, and assert custom attributes by object shape. Keep the supplied account objects, environment
states, and expected OAuth attribute values unchanged, then require both strict compilation and the focused
runtime suite in the same declared impact plan.

**Class.** Runtime-green test code can still be compiler-invalid. Fixture repair must preserve the exercised
inputs and behavior while replacing only the invalid test representation; production types must not be loosened
to accommodate a mock.

## 2026-09-09 — A shared translated label changed an excluded legacy consumer

**Symptom.** Translating the shared 365-day audit label to English repaired public reporting pages but also
changed the copy rendered by the excluded collaboration page. The final suite then failed its unchanged legacy
snapshot. Repository lint also treated generated delivery evidence as application source and obscured four real
JSX apostrophe errors.

**Cause.** One exported display string served consumers with different language contracts, so changing the
producer silently expanded the reporting-only change into an excluded route. Separately, the lint perimeter did
not distinguish application code from generated `.superpowers` evidence scripts.

**How to recognise it.** A translated shared constant has consumers inside and outside the authorized surface,
or a repository lint failure is dominated by generated evidence paths while a smaller set of errors remains in
tracked application files. Enumerate every import before changing shared presentation copy and classify lint
failures by source ownership.

**Fix.** Preserve the legacy export for the excluded consumer, add an explicit English export, and migrate only
the authorized reporting consumers. Prove both labels independently, render the public consumers, and compare
their visible text after removing markup so inline emphasis cannot split a valid phrase. Keep the excluded source
unchanged. Exclude `.superpowers/**` from application lint while retaining focused lint coverage for the repaired
application files.

**Class.** Shared presentation constants do not imply a shared language contract. A scoped translation needs an
explicit compatibility boundary, and generated release evidence needs a declared lint boundary that does not
weaken checks on production or test code.

## 2026-09-09 — Import identity did not match the signed report identity

**Symptom.** The actual connected report failed with server error916538762 and
`Signed V2 report snapshot validation failed`. The import allowed repeated performance item IDs
and repeated inactive catalog IDs, while the signed report requires a unique product population.

**Measured cause at the seam.** `buildProducts` appended every performance row and only marked
performance IDs as seen. A repeated performance item remained duplicated, and a catalog-only item
was appended repeatedly. The focused raw-import-to-signed-report control failed in both complete
and partial catalog modes. The old synthetic portal witness bypassed this import seam.

**Recognition signal.** Compare returned product count with the unique product-ID count before
sealing. A successful small hand-authored snapshot does not exercise raw provider row multiplicity.

**Repair.** Group performance rows by the existing product identity and sum every additive metric;
admit each inactive catalog item once. Keep signed uniqueness and signature validation strict.
Prove conserved spend, value, fractional conversions, clicks, impressions and unchanged inputs,
then verify the actual connected route that failed before claiming the user incident resolved.
# 2026-09-09 — Resolve manager population from the product workflow

Symptom: discovery enumerated the agency Google Ads MCC when the operator wanted the reporting application's manager directory. Measured cause: the term MCC was interpreted as an external provider hierarchy before reconciling it with the requested registrant details and generated reports. Recognition signal: the proposed source includes accounts that never configured reporting in the application. Repair: use registered report records as the directory population, explicitly exclude external MCC and temporary staging data, and show absent contacts or unavailable reports truthfully. The operator corrected the interpretation before application changes; the discovery export is not an application input.
# 2026-09-09 — Bind manager snapshot paths to the selected report identity

Symptom: a registered report could display another account's valid signed snapshot if its ledger snapshotPath was cross-linked. Measured cause: the manager checked directory confinement and signature validity without checking that the basename matched reportId. Recognition signal: two legitimate signed files exist in the same report directory, and swapping only the ledger path changes the selected report's figures. Repair: accept only a valid report identifier and its canonical `<reportId>.snapshot` path before opening the signature. A witnessed real-storage test now refuses the crossed association while both original reports remain readable.

## 2026-09-09 — Generated reports and registered reports have different admission points

Symptom: the operator generated a MagazinFitness.ro Google Ads report, then saw an empty manager directory. Measured cause: production contained a READY pending snapshot created at 08:47:32 UTC with no delivery submission, while the saved-report ledger contained zero records. The report page staged a snapshot; only saveContact registered it through saveOrGetReportLead. registeredReports reads only ledger entries with reportId. Recognition signal: a real report is visible in the reporting session but has no ledger entry, rather than an existing ledger entry being hidden by the table. Repair: the operator selected generation as the admission event. Persist an account-bound report independently of email consent and show missing contacts truthfully; never expose temporary bearer references, manufacture contact details or send an email implicitly. Published automatic persistence and recovered the original signed report; the actual manager now contains one row and opens it successfully. See REPORT-AUTOSAVE-2026-09-09.md.

## 2026-09-09 — Preserve the closed public module graph during lifecycle repairs

Symptom: the first final suite had 597 passing tests and one failing public-reachability inventory check. Measured cause: automatic persistence introduced a runtime module outside the declared 54-file graph. Recognition signal: focused lifecycle tests pass while the graph inventory reports an additional reachable file. Repair: consolidate persistence into the existing pending-report lifecycle module, preserving the graph guard and manifest unchanged. Witness the graph failure, then confirm 107 focused checks and all 598 repository tests pass.
