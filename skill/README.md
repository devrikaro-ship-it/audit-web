# Devrika website audit — Claude Code skill

Audit of an online store's **website**, from the URL only: two rubrics, **SEO** and **UX/UI**, in a public report
that ends with the Devrika CTA. The Google Ads audit is a separate product (`audit-google-ads`).

The skill is the `skill/` folder of the `audit-web` app (`~/seo-audit`); the engine, report and PDF live in the
app. Installed as a symlink: `~/.claude/skills/audit-devrika` → `~/seo-audit/skill/`.

## Run

```
/audit-devrika https://store.ro
```

or open `/start` on https://audit.devrika.io. Report at `/r/<id>`, PDF at `/r/<id>/pdf`, leads in `/dashboard`.

## Sources

1. `SKILL.md` — how the skill runs the audit.
2. `docs/AUDIT-SPEC.md` — the report structure (single source; when code and spec disagree, the spec wins).
3. `lib/platform-knowledge/` — how each platform is read.

— Devrika Agency · devrika.ro
