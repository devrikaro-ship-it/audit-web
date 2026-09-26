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

### Increment 2 — screenshots of each page type

- `lib/page-render.ts`: real Chrome (findChrome) renders the first page read of each type at 390 × 844 and
  1440 × 900: phone first screen, phone full page scaled, desktop first screen (JPEG), plus the readable text.
- Runs alongside the PageSpeed step; a page that cannot be rendered leaves its evaluated rows "de verificat".
- The small measured rules of the first plan are dropped (operator, 2026-09-26: low impact).
- Tests: a local fixture page rendered by real Chrome gives three images of the right sizes and its text.

### Increment 3 — AI evaluation: structure and the four questions

- `lib/design-eval.ts`: `@anthropic-ai/sdk`, `claude-opus-5`, `fallbacks: "default"`, Zod structured output per page
  type: each section present or missing (hero first or not), each question's verdict, evidence and problem.
- Rows: one per section (`st_<kind>_<page>_<section>`, question Structura) and one per question
  (`ai_<page>_<question>`), labelled "Evaluat pe capturi"; register copy for every section, both kinds.
- No key, an API error or a verdict without evidence: "de verificat".
- Tests: the client stubbed (prompt contents, rows, fallbacks); real calls on built pages three times.

### Increment 4 — verification

- Production audits of dentalview.ro, magazinfitness.ro, diente.ro; every ✗ checked by hand against the saved
  screenshots; audit duration before and after; PDFs to the Desktop; AUDIT-SPEC, skill SKILL.md, mistakes.md updated.
