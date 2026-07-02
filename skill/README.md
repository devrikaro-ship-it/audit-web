# Audit Devrika — Skill Claude Code

Genereaza un **raport PDF de audit (SEO + Google Ads/Shopping)** branduit Devrika, pornind **doar de la URL-ul** unui site. Instrument de **lead-generation**: diagnostic real, ambalat persuasiv, scris pentru un decident netehnic, terminat cu CTA Devrika.

![tip](https://img.shields.io/badge/tip-lead--gen-orange) ![input](https://img.shields.io/badge/input-doar%20URL-blue)

## Ce face
- Crawl public al site-ului — **zero acces la cont, doar URL-ul**
- Scor de vizibilitate online 0-100 + sub-scoruri
- **SEO**: tehnic (HTTPS, redirects, sitemap, canonical, robots, hreflang), security headers (HSTS/CSP), broken links, on-page (title/meta/H1/H2), schema, imagini, viteza (TTFB + CWV reali din CrUX), readability + citability AI
- **Tracking & pixeli** (din sursa, cold): GA4, Google Tag Manager, Google Ads conversion (AW-), **Meta Pixel**, TikTok, Bing UET, Pinterest, Consent Mode v2 / CMP — "ce masori vs ce NU masori"
- **Google Ads / Shopping**: ruleaza Shopping?, ce CSS foloseste (ProductHero/TRUDA/fara), segmentare produse (Heroes/Villains/Zombies), competitie
- **Meta Ads** (cold, fara cont): Meta Pixel instalat?, ruleaza reclame acum? (Ad Library public), competitie
- 5 pagini A4: coperta, rezumat, SEO, Google Ads/Shopping, plan + CTA
- PDF profesionist generat din HTML via Chrome headless
- Tot ce e gratis, fara chei API (optional: GOOGLE_API_KEY pt CWV reali fara rate-limit)

## Instalare
macOS / Linux:
```bash
git clone https://github.com/devrikaro-ship-it/audit-devrika.git ~/.claude/skills/audit-devrika
```
Windows (PowerShell):
```powershell
git clone https://github.com/devrikaro-ship-it/audit-devrika.git "$env:USERPROFILE\.claude\skills\audit-devrika"
```
Reporneste Claude Code → apare `/audit-devrika`. Repo public, nu necesita acces.
Necesita doar: **Google Chrome** + **Python 3** (stdlib). Scripturile-s cross-platform (**Windows / macOS / Linux**). Fara chei API, fara pip install.

## Folosire
In Claude Code:
```
/audit-devrika https://site-client.ro [Nume Client]
```
Sau natural: „fa-mi un audit PDF pentru site-ul X ca sa-l agatam”.

PDF-ul iese in `seo-audits/{client}/`.

## Structura
```
audit-devrika/
├── SKILL.md                 # orchestrare (cititul de Claude)
├── scripts/
│   ├── collect.py           # aduna semnale SEO + Ads din URL (cross-platform)
│   ├── build.py             # JSON date -> HTML raport (randuri variabile)
│   └── html_to_pdf.py       # HTML -> PDF (Chrome headless, cross-platform)
├── assets/
│   ├── styles.css           # CSS brand Devrika (design vizual)
│   └── example.json         # schema + exemplu date raport (vegis.ro)
└── references/
    ├── framing.md             # ton lead-gen, traduceri tehnic->client + estimare bani
    ├── scoring.md             # cum dai scorurile 0-100 (incl. tracking)
    ├── google-ads-research.md # research CSS/Shopping via Playwright
    └── meta-ads-research.md   # Meta Pixel + Ad Library (cold, fara cont)
```

## Note
- Datele Google Ads/GMC nu sunt publice → sectiunea Ads e **audit de oportunitate** (feed, Shopping, competitie via Ads Transparency / Meta Ad Library).
- Text fara diacritice (standard clienti Devrika).
- Model de referinta: `seo-audits/sndeco/`.

— Devrika Agency · devrika.ro
