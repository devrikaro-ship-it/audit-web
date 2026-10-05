# Devrika audits — Claude Code skill

`audit-devrika` is the container skill of the Devrika audits; each audit is a branch in its own folder:

```
skill/                      ← audit-devrika (container)
├── SKILL.md                ← what the container holds and where each request goes
├── audit-site/SKILL.md     ← the website audit: SEO and UX/UI, from the URL only
└── audit-google-ads/       ← the Google Ads audit on a connected account (SKILL, SPEC, RULES, references)
```

The container is the `skill/` folder of the `audit-web` app (`~/seo-audit`); the engine, report and PDF live in the
app. Installed as a symlink: `~/.claude/skills/audit-devrika` → `~/seo-audit/skill/`.

## Run

```
/audit-devrika https://store.ro
```

or open `/start` on https://audit.devrika.io. Report at `/r/<id>`, PDF at `/r/<id>/pdf`, leads in `/dashboard`.

## Sources

1. `SKILL.md` — the container and its routing.
2. `audit-site/SKILL.md` — how the website audit runs.
3. `audit-google-ads/SKILL.md` — how the Google Ads audit runs.
4. `docs/AUDIT-SPEC.md` — the report structure (single source; when code and spec disagree, the spec wins).
5. `modules/site-audit/model/platform-knowledge/` — how each platform is read.

— Devrika Agency · devrika.ro
