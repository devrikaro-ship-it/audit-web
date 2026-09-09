# Generated report persistence

## Operator amendment

On September 9, the operator explicitly requested saving every generated Google Ads report, even without contact details. This supersedes the contact-submission admission rule in MANAGER-DASHBOARD-2026-09-09.md. Contact submission remains optional and does not govern internal report retention. This change does not imply email delivery consent or recurring reporting enrollment.

## Measured current state

At revision 54c7703f7a528704a9b8111b2bf4474791f2f416, report generation signs and stages a temporary snapshot through stagePendingReportSnapshot. saveContact later registers a lead, promotes the snapshot and delivers a PDF. registeredReports reads only ledger entries with reportId. Production observation found zero ledger rows and a READY MagazinFitness.ro snapshot generated at 08:47:32 UTC, with no contact submission.

## Intended outcome

Every successfully generated report has an immutable durable snapshot and account-bound internal directory entry before the report page succeeds. Empty contact fields remain empty and are displayed honestly. The manager lists the account and opens the exact generated report without requiring email delivery. Retrying registration of the same report is idempotent; later contact submission preserves the same report identity, enriches real contact fields and retains the existing consent requirement for sending email. Different accounts and report versions remain distinct.

Recover the already generated MagazinFitness.ro snapshot without new Google collection, fake contact details, implicit email or recurring enrollment. Verify its signed integrity and original identity before recovery. Existing manager authentication, protected snapshot access, signature checks, immutable storage and existing contact delivery controls remain required. Do not import external MCC accounts or alter report calculations. Preserve paused-client restrictions during any recovery.

## Verification

Retain witnessed failing controls for missing-contact persistence, duplicate registration and protected report identity. Prove subsequent contact enrichment and existing delivery compatibility. Publish the reviewed revision and verify the real MagazinFitness.ro row and report in the protected production manager. Local fixtures establish negative cases, not the real-client result.

## Published result

Revision `e31c3279563e8d97f9da18bfd7f45732619bb97d` was published through Coolify deployment `eizm7olnmv4oq7iwnws4wwye`, completed September 9 at 10:23:11 UTC. The report page now persists the signed snapshot and a stable directory entry before successful rendering. Contact submission enriches that same entry. Existing explicit delivery consent remains required.

The original MagazinFitness.ro report is available at `https://audit.devrika.io/dashboard/google-ads/reports/620937c6-d8be-4bd1-aa0a-d36d8265dbe8`. Its original generated time is `2026-09-09T08:47:32.837Z`; its signed bytes retain SHA256 `9575b12a9324fb05f702a2328b51ebeb09c0a6bdd778dd44054c15987965eecc`. Recovery used customer ID `4198109331` from the existing matching client profile, after verifying website identity and both authoritative paused flags were false. It did not recollect data, manufacture contact details, send email, or enroll recurring reporting.

Root verification found exactly one durable record after initial recovery and replay. An altered expected digest was refused. Authenticated manager and exact report returned 200; anonymous access redirected and an unknown report returned 404. Actual Chrome verification showed the client row with missing-contact labels and opened the complete original report by clicking that row's link. The displayed ROAS was 10.56 against target 5.00. Ledger data remained unchanged during diagnostic reads.

Technical evidence: 598 passing repository tests, 107 focused repair checks, type checking, lint and production build passed. Independent exact-revision code review returned PASS. Evidence and production verification receipts are retained under `.superpowers/sdd/2026-09-09-autosave/`.

Independent production verification returned PASS on the same deployed revision. Three fresh bounded checks confirmed the protected manager/report matrix, unchanged retained source bytes, and startup-positive logs with zero error indicators. The final verdict is `verification/verdict.json` in the evidence directory.
