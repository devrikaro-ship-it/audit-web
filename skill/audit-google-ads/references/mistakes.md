# Google Ads Web Audit — Mistakes

## Declared evidence that was never selected by the test runner

**Symptom:** the contract gate reported rendered evidence as passing while the test-name filter
selected zero tests.

**Cause:** an anchored filter assumed the runner's internal full-name format and treated a skipped
file as success.

**Recognition:** a deliberately broken declared render test leaves the gate green, or the runner
reports every test skipped.

**Fix:** validate the declared test and its surface assertions through the TypeScript AST, then run
the unique declared names with a compatible filter and require the selected tests to pass.

## Registered labels without registered operations or inputs

**Symptom:** a pipeline step kept a valid ID while executing another analyzer, and a surface kept a
valid guard name while transforming an undeclared input expression.

**Cause:** IDs were checked independently from the imported operation and guard projection they
were supposed to govern.

**Recognition:** changing the callback body or guard argument leaves the contract gate green as
long as the surrounding ID remains unchanged.

**Fix:** bind each step to exactly one module and exported operation, reject nested domain calls,
and bind each conditional surface to its exact dependency projection, executable predicate, and
real-page boundary tests.

## Source tokens presented as executable coverage

**Symptom:** the documentation gate stayed green for a function name in a comment, a dead function,
or a local import alias while claiming to validate the report pipeline.

**Cause:** regular-expression matches were treated as program reachability and rendering evidence.

**Recognition:** the validator reads source substrings, manually lists call names, or calls a prose
condition evidence without exercising both rendered branches.

**Fix:** traverse the TypeScript AST from the report entry point, preserve exported import identity,
ignore unreachable bodies, derive marked JSX guards, and require rendered assertions for each
surface and both branches of every conditional surface.

## Optional-source resilience described as client-visible disclosure

**Symptom:** the skill said every failed optional source was disclosed in report caveats.

**Cause:** keeping successful sections after one source fails was treated as equivalent to telling
the client which source failed. The application silently omits several dependent modules.

**Recognition:** documentation uses one failure rule for tracking, catalog, structure, PMax,
Shopping, Search, and keyword reads without checking each catch path and downstream condition.

**Fix:** maintain a structured per-source visibility and dependency contract derived against every
source and analysis call in the report. State silent omissions as current behavior, not as caveats.

Read this file before changing intake, classification, or report behavior.

## The active audit was documented as product-only

**Symptom:** the skill described only Shopping product classification while the rendered report
also audited tracking, account structure, Performance Max, Standard Shopping, Search campaigns,
negative keywords, and search terms, then exposed a simulator and contact path.

**Cause:** the documentation followed the original classification engine instead of inventorying
the report page and every analyzer it invokes.

**Recognition:** the report source imports an analyzer or renders a top-level surface that has no
entry in the active skill, or the documentation calls every report section unconditional.

**Fix:** inventory the rendered report and its tests mechanically, document measured audit areas
separately from simulator and contact surfaces, and record each top-level surface as always,
conditional, or alternative. Run `scripts/check_report_coverage.py` against the app and skill.

## A shared label still depended on a neighboring label

**Symptom:** the primary 365-day label was centralized but silently changed when the first short
window was reordered or renamed.

**Cause:** the label borrowed its localized day unit from `FERESTRE[0]`, making a semantic source
depend on array position.

**Recognition:** the primary label formatter reads any neighboring report window or presentation
label.

**Fix:** format day-count labels directly with the runtime's Romanian unit formatter. Assert the
formatter and primary constant do not reference the neighboring-window array.

## A helper-presence guard accepted unprocessed legacy copy

**Symptom:** a file passed the copy gate when it imported the shared helper but also contained a
standalone legacy promise that bypassed it.

**Cause:** the gate tested whether a helper name appeared anywhere in the file, not whether every
period promise was structurally composed from the common token.

**Recognition:** planting a standalone numeric period in a file that already imports the helper
leaves the gate green.

**Fix:** compose every active promise directly from `AUDIT_WINDOW_LABEL` and reject every raw
numeric legacy-period phrase on client-facing surfaces, regardless of imports elsewhere.

## Recovery state was encoded as an empty error string

**Symptom:** the timezone failure redirected back to account selection, but the explanation and
retry path did not render.

**Cause:** the query flag became `error = ""`, while rendering used the string's truthiness.

**Recognition:** a recoverable-state flag and optional technical details share one string value.

**Fix:** keep a boolean recovery state separate from optional error details, and render-test both
the visible explanation and retry target.

## A correct period label changed the client-facing language

**Symptom:** the 365-day correction made individual Romanian audit sentences render in English.

**Cause:** the period was corrected by rewriting each complete sentence instead of changing the
shared localized period label consumed by those sentences.

**Recognition:** client-facing Google Ads audit source contains a standalone English `365 days`
literal, or a legacy period-bearing sentence does not pass through the shared label function.

**Fix:** derive the 365-day label from the existing localized day unit and replace only the legacy
period fragment at render time. Guard every active surface against standalone English period copy.

## Invalid account time zone reached the signed session

**Symptom:** an invalid non-empty `customer.time_zone` value passed account selection and failed
later when the report tried to format a date.

**Cause:** the selection flow checked only for a missing value and treated every non-empty string
as a valid IANA time zone.

**Recognition:** the value is sealed without first constructing an `Intl.DateTimeFormat` with it.

**Fix:** validate missing and invalid values before sealing. Return either failure to the account
selection screen and keep the existing session recoverable; seal only a proven IANA time zone.

## Server-calendar dates used for an account-calendar audit window

**Symptom:** the report promised a fixed evidence window, but an inclusive GAQL `BETWEEN` query
returned one extra date and could end on the wrong day near UTC midnight.

**Cause:** subtracting the requested day count ignored that both GAQL endpoints are included, and
formatting the server date ignored that `segments.date` follows the Google Ads customer time zone.

**Recognition:** the start date is calculated by subtracting the full window length, or the date
formatter does not receive the selected account's `customer.time_zone` value.

**Fix:** read and retain `customer.time_zone`, derive today's calendar date in that zone, and
subtract `windowDays - 1` calendar dates so the inclusive query contains exactly `windowDays`.

## Retired architecture presented as current

**Symptom:** the skill described COLD, WARM, CONNECTED, and FULL modes and routed work through an
MCC and local agents.

**Cause:** documentation from the former combined audit architecture survived after Audit Web and
Google Ads Audit became separate products.

**Recognition:** a proposed flow mentions access modes, `audit-devrika`, an MCC, `gads_*` scripts,
or collector/report agents.

**Fix:** derive the flow from `~/seo-audit/app/google-ads`, its product engine, and its tests. The
current product has one OAuth-based, non-mutating web flow.

## Broad OAuth scope described as read-only permission

**Symptom:** the skill promised that Google OAuth itself granted read-only access.

**Cause:** the application's read-only behavior was confused with the capability of Google's
`adwords` scope, which is not technically read-only.

**Recognition:** a sentence attributes the mutation boundary to OAuth instead of to the API
operations implemented by the application.

**Fix:** state both facts together: Google grants the broad `adwords` scope, while the application
implements only read operations and contains no account mutation path.

## Catalog-only products disappear

**Symptom:** the report shows no invisible products even though the catalog contains products with
no activity.

**Cause:** the intake starts from performance rows or filters the catalog by metrics/date, so a
product with no impressions never reaches the classifier.

**Recognition:** the catalog query contains metric/date filters, or the catalog/performance join
cannot create zero-valued product rows.

**Fix:** query the catalog independently, left-join performance by item ID, and preserve catalog-only
products as zero-valued rows.

## A dead product is counted as a losing product

**Symptom:** one product appears in both the invisible/untested group and the below-target group.

**Cause:** ROAS comparison runs before evidence and visibility classification.

**Recognition:** group counts exceed the number of unique catalog products.

**Fix:** use the closed classification order in `google-ads/RULES.md` and assert that every product
appears exactly once.

## Product ROAS is reported with unreliable tracking

**Symptom:** the report accuses named products of not selling while conversion measurement is
broken.

**Cause:** measured cost was mistaken for proof that measured conversion value is trustworthy.

**Recognition:** the report displays product ROAS while the tracking gate is not clean.

**Fix:** keep spend and product identity, quarantine profitability claims, and omit product ROAS as
a verdict until measurement is reliable.

## Imported audit operations escape through containers

**Symptom:** the report coverage gate passes even though a domain operation runs outside its declared step.

**Cause:** the gate validates direct call syntax but does not follow the imported operation when it is stored
in an array, object, or intermediate binding.

**Recognition:** a raw domain import appears anywhere except as the direct callee of its matching inline
governed operation.

**Fix:** resolve identifier declarations through the TypeScript type checker and reject every raw domain
operation reference that is not the exact direct callee owned by its governed step.

## Import spelling is mistaken for operation identity

**Symptom:** an ungoverned audit operation passes when imported through a relative path, local re-export, or
reachable wrapper, while the same operation is rejected through the standard alias.

**Cause:** the gate classifies the module-specifier string instead of the final declaration TypeScript resolves.

**Recognition:** changing only an import path or inserting a re-export changes the coverage verdict.

**Fix:** recursively resolve aliases to the final symbol and source file, derive the canonical exported identity
from that declaration, and traverse reachable local wrapper bodies.

## Invalid gross margin is normalized into a plausible value

**Symptom:** malformed input, zero, or one hundred percent reaches the report as a different valid-looking
margin instead of being refused.

**Cause:** the server action clamps finite values and substitutes a default for malformed values before signing
the session.

**Recognition:** submitting an invalid value redirects to the report and writes a session cookie containing a
margin the user never supplied.

**Fix:** parse through one finite inclusive 1-through-99 rule, preserve valid decimals exactly, and refuse invalid
input before signing while keeping the margin form visible for retry.

## Session validation checks without normalizing

**Symptom:** a valid localized margin passes validation but remains a string inside the signed cookie or after
legacy-session decoding.

**Cause:** the parsed number is discarded and the original payload is serialized or returned.

**Recognition:** `typeof marginPct` is `string` after a successful seal/unseal round trip.

**Fix:** replace the stored field with the parsed number at both boundaries and preserve a separate signed
invalid-present state when normalization fails.

## Duplicate margin fields bypass submission intent

**Symptom:** a request containing two margin fields is accepted according to whichever value is read first.

**Cause:** the action uses single-value form access without checking the field population.

**Recognition:** reversing two submitted margin values changes acceptance.

**Fix:** read all values and require exactly one before parsing or signing.

## Projection exports bypass the shared margin rule

**Symptom:** a public calculation returns `NaN`, infinity, or a plausible result for an invalid margin even
though the report entry rejects the same value.

**Cause:** validation exists only at the page and break-even boundary, while lower public exports call the
copied formula engine directly.

**Recognition:** calling any exported calculation with zero, one hundred, `NaN`, or infinity does not throw the
same range error.

**Fix:** require the shared gross-margin invariant at every public entry accepting the margin.

## Invalid stored margin loses its recovery explanation

**Symptom:** a legacy invalid margin is erased into the same state as a user who has not reached the margin step,
so report and simulator redirects show no explanation.

**Cause:** session decoding deletes invalid data without retaining why the field is absent.

**Recognition:** invalid-present and truly missing sessions produce the same redirect URL.

**Fix:** derive a signed normalized invalid state during session decoding and route it to the existing localized
margin recovery state; never derive this state from query input.

## Undefined is mistaken for a supplied margin

**Symptom:** account selection throws a margin range error before the user reaches the margin step.

**Cause:** session sealing treats an own `marginPct` property as supplied even when its value is undefined, and
account re-selection writes that explicit undefined value.

**Recognition:** OAuth or demo account selection fails only when the pre-margin session object contains the field.

**Fix:** define effective absence by value as well as property presence, remove undefined before JSON, and carry
the derived invalid state separately until a valid replacement margin clears it.

## Margin rules have scrambled numbering

**Symptom:** one logical list reads 1, 2, 4, 5, 6, 3 after incremental documentation edits.

**Cause:** new rules retain insertion-time numbers without revalidating the complete section.

**Recognition:** the visible sequence differs from the one-through-count sequence or repeats a number.

**Fix:** validate the complete Thresholds section mechanically for unique sequential numbering from one.

## Application behavior is attributed to OAuth permission

**Symptom:** public pages promise that Google Ads access or its OAuth permission is exclusively read-only.

**Cause:** non-mutating application behavior is described as a property of the granted access, even though Google
exposes the broad `adwords` scope.

**Recognition:** one sentence combines access, permission, or right with a read-only claim.

**Fix:** describe the broad Google Ads permission separately from the application's no-mutation behavior through
the canonical public OAuth contract consumed by every registered public surface.

## Synonym matching cannot govern permission truth

**Symptom:** a public-copy gate rejects known read-only wording but accepts an equivalent phrase it was not taught.

**Cause:** the boundary is inferred from sentence vocabulary instead of being rendered from a closed executable
contract.

**Recognition:** adding another synonym to the matcher is the proposed repair after every new phrasing bypass.

**Fix:** register every public route and state, render canonical capability attributes, accept only named canonical
statements, and require every shared localized branch to map to an executed registered state.

## Machine-readable markers do not govern visible claims

**Symptom:** rendered attributes state that OAuth is broad while nearby client-facing text can still claim that
permission is read-only.

**Cause:** the contract decorates a surface but does not generate the sentence the client reads, and route inventory
comes from a duplicated source list rather than the deployed route graph.

**Recognition:** changing visible permission copy leaves the marker assertions green, or a route group/layout/API
emitter appears without entering the evidence population.

**Fix:** generate localized sentences and metadata from the closed contract values, compare actual rendered text to
that projection, and derive the governed population from the current source tree plus rewrite and emitter sources.

## Proof disclosure leaks into unrelated screens

**Symptom:** landing, account picker, margin, simulator, report, and recovery DOM contain hidden OAuth sentences that
were added only to satisfy a contract test.

**Cause:** every registered state is treated as a disclosure surface, and tests depend on a prior `.next` build.

**Recognition:** permission prose appears in accessibility output where the screen has no permission explanation, or
a clean checkout cannot run the source guard before building.

**Fix:** render semantic clauses only on natural disclosure surfaces; inspect non-disclosure sources for bypasses;
derive routes, layouts, handlers, metadata, rewrites, and recursive imports from the current source tree.

## A clause ID can carry a false translated sentence

**Symptom:** the semantic contract remains correct while a localized sentence under the correct clause ID states the
opposite permission boundary.

**Cause:** a complete sentence is mutable data beside the fact instead of a grammatical projection of the fact.

**Recognition:** changing one localized sentence does not require changing the capability, behavior, or mutation
value that the sentence claims to explain.

**Fix:** derive visible disclosure from closed fact identities, localized atomic tokens, and explicit negation or
capability operators; verify the result against an independent immutable oracle.

## Text scanning misses executable public emitters

**Symptom:** a route group, computed metadata property, response helper, re-export, or dynamic JSON import adds public
copy without entering the disclosure check.

**Cause:** regular expressions approximate TypeScript and Next routing instead of reading their syntax and resolved
module identities.

**Recognition:** changing import syntax or wrapping the same emitter changes the verdict without changing runtime
behavior.

**Fix:** parse Next filesystem segments individually and traverse the TypeScript compiler graph through resolved
aliases, re-exports, computed imports, metadata expressions, and response constructors.

## A canonical sentence does not authorize a neighboring claim

**Symptom:** a page renders the correct projected disclosure and an additional false OAuth sentence beside it while
the contract test remains green.

**Cause:** evidence checks presence of canonical truth instead of provenance for every emitted boundary claim.

**Recognition:** adding an extra sentence leaves all expected-text assertions unchanged.

**Fix:** inventory emitted boundary literals and require each one to descend from the canonical projector; separately
resolve final metadata, response bodies, shared copy, and every finite import target, failing closed on ambiguity.
# Output provenance cannot be inferred from permission vocabulary

- Symptom: A public page could render a truthful canonical disclosure and an unrelated false sibling phrase while the source provenance check still passed.
- Cause: The check classified selected OAuth and permission words instead of approving the complete client-visible output.
- Recognition: A guard needs a growing synonym list, or a projected descendant implicitly authorizes surrounding text.
- Fix: Snapshot the complete normalized visible output, metadata, and public API text for every registered state; use source analysis only to prove the inventory is exhaustive.

# Opaque output hashes hide the evidence they protect

- Symptom: A copy gate detected changes but reviewers could not see what sentence, accessible label, or destination had changed.
- Cause: The approved output was stored only as a digest, and handler results were represented by assumed empty bodies instead of executed responses.
- Recognition: Reviewing a golden change requires running a separate decoder, or a public handler has no fixture for each branch.
- Fix: Commit readable structural snapshots, execute each closed handler branch, preserve accessibility and navigation fields, and keep a separate semantic oracle over the rendered OAuth facts.

# Application-owned truth and global placeholders are not independent proof

- Symptom: Updating runtime copy and its application snapshot together could approve a false permission statement, while a fixture value could replace identical static prose at another node.
- Cause: The semantic oracle lived with the application and placeholders were matched globally by value instead of by structural provenance.
- Recognition: One repository can change both the claim and its proof, or a placeholder declares a value without exact output locations.
- Fix: Keep approved OAuth clauses in the independent skill repository, compare disclosure nodes in both directions, and bind placeholders to exact node paths and text or attribute positions.

# A report-only source registry understates the public audit path

- Symptom: Public copy listed report inputs but omitted account discovery fields and the selected account time zone read before the report.
- Cause: The source population was manually defined from the report page instead of derived from every reachable public Google Ads route and action.
- Recognition: Account selection calls Google Ads before the report registry starts, while disclosure validation still passes.
- Fix: Bind every reachable operation that ultimately calls the Google Ads search transport to one executable read registry, derive localized categories from it, and compare discovered operations with registered operations in both directions.
