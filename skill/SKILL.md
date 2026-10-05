---
name: audit-devrika
description: "Devrika audits — the container skill, with two branches. `audit-site`: the website audit for online stores and lead sites (lead magnet) — from the site URL only, with no account access, it reads the pages that sell and produces a public 16:9 report deck in two parts, SEO (including visibility in AI assistants) then UX/UI, each closing with a checklist, for a non-technical decision maker. `audit-google-ads`: the self-serve, non-mutating ecommerce Google Ads audit at audit.devrika.ro/google-ads on a connected account, its report flow and its documentation. Use when: site audit, website audit, audit a prospect's store or site, store audit report, run the audit tool on a URL, the Google Ads audit at /google-ads. Not for agency MCC audits, Google Ads optimization, leads accounts or account mutations."
user-invokable: true
argument-hint: "[url]"
license: MIT
metadata:
  author: Devrika
  version: "4.1.0"
  category: audit
---

# Devrika audits

`audit-devrika` is the container. Each audit product is a branch in its own folder; open the branch's `SKILL.md`
before acting.

| Branch | What it audits | Where |
|---|---|---|
| **audit-site** | a site, from its URL only: SEO and UX/UI | `audit-site/SKILL.md` |
| **audit-google-ads** | a connected ecommerce Google Ads account, read only (`/google-ads`) | `audit-google-ads/SKILL.md` |

## Where the container lives

The container is the `skill/` folder of the web app `audit-web` (`~/seo-audit`, repo `devrikaro-ship-it/audit-web`),
symlinked as `~/.claude/skills/audit-devrika`. The code, the specs (`docs/`) and the skill are one git repository.

## Routing

1. A site audit, a report on a prospect's site, the funnel, the report deck or its PDF → `audit-site/SKILL.md`.
2. The Google Ads audit on a connected account (`/google-ads`), its report or its OAuth disclosures →
   `audit-google-ads/SKILL.md`.
