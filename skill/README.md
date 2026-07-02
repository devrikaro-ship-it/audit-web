# Audit Devrika — Skill Claude Code

Skill UNIC de audit client **ecom**, cu 2 moduri. Face parte din repo-ul `audit-web` (`~/seo-audit`) — motorul, raportul si PDF-ul traiesc in app-ul web, skill-ul doar orchestreaza.

![tip](https://img.shields.io/badge/tip-audit%20ecom-orange) ![moduri](https://img.shields.io/badge/moduri-RECE%20%2B%20CALD-blue)

## Doua moduri

| | **RECE (lead-magnet)** | **CALD (intern)** |
|---|---|---|
| Cand | Prospect, **fara acces** la conturi | Client care **ne-a dat acces** |
| Input | Doar URL-ul | URL + Google Ads / Meta / GA4 / GSC / GMC |
| Adancime | Superficial, cat sa agate | Profund, cross-check intre tool-uri |
| Iesire | `/r/<id>` (+ PDF) | `/cald/<slug>` (+ PDF) |

## RECE — 4 rubrici (ecom-only)
Raportul are **strict 4 rubrici**, in ordine: **Tracking · SEO · UX/UI · Google Ads**. Structura exacta (campuri, ce e EXCLUS, reguli de detectie, praguri) = **`docs/AUDIT-SPEC.md`** (sursa unica). Findings mapeaza pe 3 servicii Devrika: CSS → ProductHero, produse neoptimizate → Catamo, restul → management campanii.

Detectie cheie: **tracking la runtime** (browser real BrightData — GA4/Ads/Pixel/TikTok/Consent, nu din HTML brut) + **CSS + peisaj Shopping EEA** + semnal produse (Catamo).

## Cum se ruleaza
Skill-ul e deja instalat ca symlink in `~/.claude/skills/audit-devrika` → `~/seo-audit/skill/`. In Claude Code:
```
/audit-devrika https://site-client.ro [Nume Client]
```
Sau natural: „fa-mi un audit pentru site-ul X" (RECE) / „audit intern, avem acces la conturi" (CALD).

Motorul RECE = app-ul web (`POST /api/audit` → `/r/<id>`, PDF la `/r/<id>/pdf`, lead-uri in `/dashboard`). Vezi `SKILL.md` pentru orchestrare completa.

## Structura
```
skill/
├── SKILL.md                 # orchestrare (cititul de Claude) — 2 moduri
├── scripts/
│   ├── collect.py           # [fallback] semnale SEO + Ads din URL, cand web-ul nu poate crawla
│   ├── build.py             # [fallback] JSON -> HTML raport
│   ├── html_to_pdf.py       # [fallback] HTML -> PDF (Chrome headless)
│   ├── meta_pull.py         # CALD: pull Meta (Graph API, token System User)
│   └── post_cald.py         # CALD: trimite WarmReport JSON -> /cald/<slug>
├── assets/                  # brand Devrika (CSS, logo, example.json)
└── references/ -> ../docs/ads-research/   # framing, scoring, research Ads (symlink)
```

## Note
- **Structura raportului RECE = `docs/AUDIT-SPEC.md`.** Daca codul si specul se contrazic, castiga specul. Nu adauga/scoate rubrici de capul tau.
- `references/scoring.md` + `framing.md` descriu **calea fallback Python**, nu motorul web (autoritativ = spec).
- Text fara diacritice (standard clienti Devrika).
- Repo GitHub separat `audit-devrika` = ARHIVAT; totul traieste acum in `audit-web`.

— Devrika Agency · devrika.ro
