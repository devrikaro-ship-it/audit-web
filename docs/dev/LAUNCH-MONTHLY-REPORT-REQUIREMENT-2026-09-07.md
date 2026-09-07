# Launch: optional monthly report delivery

## Priority correction

The operator explicitly deferred this feature on September 7: the immediate priority is obtaining Google OAuth approval. Keep monthly delivery in the future backlog. Do not implement or activate it as part of OAuth preparation.

## Operator clarification

On September 7, 2026, the operator confirmed the intended PDF report is part of an optional monthly email workflow. The user can enable monthly delivery and receive an email containing a button that opens the corresponding report and its data in the application.

Required observable behavior:

1. The user can enable monthly report delivery by email.
2. The enabled workflow delivers the report automatically each month, including its PDF representation.
3. The email contains a clear button opening the corresponding report in the application, rather than a generic landing page.
4. The application destination corresponds to the account, reporting period, and data represented in that email and PDF.

This explicitly adds scheduled report delivery to the desired product scope. It supersedes the earlier handoff's exclusion of implied scheduling only for this user-enabled monthly reporting workflow. It does not authorize campaign changes, unrelated alerts, or other advertising platforms.

## Status and boundary

Requirement recorded; implementation and current scheduling capability were not verified in this discussion. No scheduler was enabled, no client data was collected, and no external email was sent. Existing paused-client restrictions continue to apply.

Before implementation, inspect existing email, PDF, report-link, authorization, and scheduling code. Define reporting period, delivery date/time zone, persistent authorized account access, and duplicate-send prevention in a bounded design. These details are not settled by the current clarification.

The preceding language discussion proposed English as the initial public version with Romanian later at `/ro/google-ads`, using one application and preserving existing Romanian copy. No localization changes were authorized or implemented during these discussions. English UI does not guarantee faster Google OAuth verification; Google explicitly requires the consent screen shown in the demo to be English: https://support.google.com/cloud/answer/13804565?hl=en.
