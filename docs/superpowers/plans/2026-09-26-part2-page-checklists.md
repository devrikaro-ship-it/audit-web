# Part 2 as a checklist per page type — Implementation Plan

> Executed inline in the primary session (AGENTS.md: no subagents). Spec:
> `docs/superpowers/specs/2026-09-26-conversion-design-rules-design.md` (approved by the operator 2026-09-26: AI
> evaluation; key copied from darwin-backend with his approval, option 1).

## Global constraints

1. Each increment is committed, deployed and checked on production before the next starts.
2. Every new row has in the register: title, problem (`bad`), negative impact (`problem`), positive impact (`good`),
   fix; both kinds where the wording differs. The register gates (report-copy.test.ts) cover new rows automatically.
3. Every new test is seen failing with its fault put back; the commit names what fell.
4. Reports saved before keep rendering as they did.

### Increment 1 — page types and questions for today's rows

- Groups: shop `viteza · home · categorie (filters and sort join it) · produs`; lead `viteza · home (trust joins it)
  · serviciu · contact`.
- A register map `UX_QUESTION[rowId] = aspect | text | experienta | vanzare`.
- Report: one checklist per page type, rows grouped under the four questions (a question heading with its verdict),
  speed first.
- Tests: every UX row has a question; a report renders the four question headings for each page type, both kinds.

### Increment 2 — rendered capture and new measured rows

- `lib/page-render.ts`: real Chrome (findChrome) at 390 × 844 and 1440 × 900 on one page per type; returns
  screenshots (kept for increment 3 and saved with the audit) and measured facts.
- New measured rows: heading ≤ 10 words; no paragraph over 4 lines on a phone; primary action in the first screen;
  primary action contrast (text ≥ 4.5 : 1, background ≥ 3 : 1); primary action still visible after two screens of
  scrolling; variants as buttons (shop product); contact form fields ≥ 16 px and no drop-down (lead contact).
- Runs alongside the PageSpeed step; a page that cannot be rendered makes its rows "de verificat".
- Tests: local fixture pages rendered by real Chrome, one passing and one failing per row.

### Increment 3 — AI evaluation

- `lib/design-eval.ts`: `@anthropic-ai/sdk`, model `claude-opus-5`, `fallbacks: "default"`, structured output (Zod)
  per page type: for each of the four questions a verdict (bun / de-reglat / rau), the evidence (quoted text or the
  element named) and the problem sentence; no evidence → "de verificat".
- Rows `<page>_ai_<question>`, labelled "Evaluat pe capturi"; measured rows labelled "Masurat".
- Without `ANTHROPIC_API_KEY` or on an API error, evaluated rows are "de verificat".
- Tests: the client stubbed (schema, prompt contents, fallback to "de verificat"); a real call on the fixture pages
  run by hand three times for consistency.

### Increment 4 — verification

- Production audits of dentalview.ro, magazinfitness.ro, diente.ro; every ✗ checked by hand against the saved
  screenshots; audit duration before and after; PDFs to the Desktop; AUDIT-SPEC, skill SKILL.md, mistakes.md updated.
