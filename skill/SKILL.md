---
name: audit-devrika
description: "Devrika audits — the container skill. Its branch `audit-site` is the website audit for online stores and lead sites (lead magnet): starting only from the site URL, with no account access, it reads the pages that sell and produces a public report as a 16:9 deck in two parts, SEO (including visibility in AI assistants) then UX/UI, each closing with a checklist, written for a non-technical decision maker. The Google Ads audit is the separate `audit-google-ads` skill. Use when: site audit, website audit, audit a prospect's store or site, store audit report, run the audit tool on a URL."
user-invokable: true
argument-hint: "[url]"
license: MIT
metadata:
  author: Devrika
  version: "4.0.0"
  category: audit
---

# Devrika audits

`audit-devrika` is the container. Each audit product is a branch in its own folder; open the branch's `SKILL.md`
before acting.

| Branch | What it audits | Where |
|---|---|---|
| **audit-site** | a site, from its URL only: SEO and UX/UI | `audit-site/SKILL.md` |

The Google Ads audit (a connected Google Ads account) is still the separate skill `audit-google-ads`
(`~/.claude/skills/audit-google-ads`), although its code lives in the same app.

## Where the container lives

The container is the `skill/` folder of the web app `audit-web` (`~/seo-audit`, repo `devrikaro-ship-it/audit-web`),
symlinked as `~/.claude/skills/audit-devrika`. The code, the specs (`docs/`) and the skill are one git repository.

## Routing

1. A site audit, a report on a prospect's site, the funnel, the report deck or its PDF → `audit-site/SKILL.md`.
2. A connected Google Ads account → the `audit-google-ads` skill.
