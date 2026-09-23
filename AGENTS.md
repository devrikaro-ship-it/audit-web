<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Raportul de audit — sursa unica

Inainte sa modifici raportul (`components/report-renderer.tsx`, `lib/audit-engine.ts`,
`lib/page-selection.ts`) **citeste `docs/AUDIT-SPEC.md`** — structura raportului rece
(cele 2 rubrici: SEO · UX/UI; site only since 2026-09-23), campurile exacte, ce e EXCLUS
si regulile de detectie sunt acolo. E sursa unica: daca codul si specul se contrazic,
castiga specul. Nu adauga/scoate rubrici sau campuri de capul tau.
