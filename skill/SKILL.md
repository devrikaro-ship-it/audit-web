---
name: audit-devrika
description: "Skill UNIC de audit client Devrika (ecom), cu 2 moduri. (1) RECE / lead-magnet: pornind DOAR de la URL, fara acces la cont — raport pe 4 rubrici (Tracking · SEO · UX/UI · Google Ads), superficial cat sa agate, ambalat persuasiv pt un decident netehnic, cu CTA Devrika; structura = docs/AUDIT-SPEC.md. (2) CALD / intern: cand avem acces la conturile clientului (Google Ads, Meta, GA4, GSC, GMC, site) — trage date REALE si face audit profund pe toate canalele, cu cross-check intre instrumente. Foloseste cand userul zice: audit client, audit prospect, raport audit, agata client (RECE) SAU audit intern, avem acces, audit cont, audit client existent (CALD)."
user-invokable: true
argument-hint: "[url] [nume-client] [--intern]"
license: MIT
metadata:
  author: Devrika
  version: "2.0.0"
  category: audit
---

# Audit Devrika — skill unic, 2 moduri

Un singur skill de audit client, cu **doua functii** clar separate. Alegi modul DUPA cat acces ai:

| | **RECE (lead-magnet)** | **CALD (intern)** |
|---|---|---|
| Cand | Prospect, **nu avem acces** la nimic | Client/prospect care **ne-a dat acces** la conturi |
| Input | Doar URL-ul site-ului | URL + acces: Google Ads, Meta, GA4, GSC, GMC, site |
| Date | Doar ce e public (crawl + Ad Library) | Date REALE din conturi (spend, ROAS, conversii, structura) |
| Adancime | **Superficial** — cat sa agate | **Profund** — tot ce e in neregula, cross-check intre tool-uri |
| Ton | Persuasiv, netehnic, durere+bani, CTA | Direct, tehnic, pentru noi/echipa |
| Iesire | 1 PDF branduit -> `seo-audits/{client}/` | Raport intern -> `clients/{client}/AUDIT-{data}.md` (+ PDF optional) |
| Scop | **Agata clientul** | **Plan de lucru real** dupa ce l-am luat |

## ⚠️ Arhitectura — motorul traieste in app-ul web (`~/seo-audit`)

Skill-ul e un **wrapper** peste app-ul web `audit-web` (repo `devrikaro-ship-it/audit-web`, local `~/seo-audit`; acest skill = folderul `skill/` din el, symlink in `~/.claude/skills/`). Motorul, catalogul, scoringul, raportul si PDF-ul sunt **acolo**, intr-un singur loc — nu dublam logica in Python.

- **RECE**: calea principala = app-ul web (detaliu la *MOD RECE* mai jos). Structura raportului = `docs/AUDIT-SPEC.md`.
- **CALD**: ruleaza pull-urile reale (`meta_pull.py --json`, `ga4_pull.py`, gads), **asambleaza** un raport (judecata ta) ca JSON in forma `WarmReport` (`~/seo-audit/lib/warm-report.ts`), apoi trimite-l cu `python scripts/post_cald.py raport.json --base <url-web>` → apare la `/cald/<slug>` (+ PDF `/cald/<slug>/pdf`) si in dashboard-ul CALD.
- **Fallback Python** (`collect.py`/`build.py`/`html_to_pdf.py`): doar cand web-ul nu poate crawla (ex: Cloudflare). NU e calea implicita.
- Knowledge de framing Ads (Ad Library, CSS Shopping, segmentare) in `~/seo-audit/docs/ads-research/` (= `references/`).

## Cum aleg modul (auto-detect)

1. **`--intern` in argumente** SAU userul zice "audit intern / avem acces / audit cont" -> **CALD**.
2. Exista deja `clients/{client}/profile/accounts.json` sau ID-uri de cont (Google customer / Meta act_) -> **CALD**.
3. Avem token Meta (`~/.config/meta-ads/token`) si/sau MCC Google care contine clientul -> **CALD** posibil; confirma scurt cu userul ce conturi atingem.
4. Altfel (doar un URL de prospect, fara acces) -> **RECE**.

Daca e ambiguu, intreaba o singura data: *"Avem acces la conturile lor sau e audit la rece de prospect?"*

---

# MOD RECE (lead-magnet) — proces

> Principiu: **superficial si rapid**, pentru un magazin online (ecom-only). Scopul nu e exhaustivitate, e sa agate. Fara date de cont.
> **Structura raportului = `docs/AUDIT-SPEC.md` (SURSA UNICA).** Cele **4 rubrici** (Tracking · SEO · UX/UI · Google Ads), campurile exacte, ce e EXCLUS si regulile de detectie sunt acolo. Citeste-o inainte sa atingi raportul; nu adauga/scoate rubrici.

## Principii (NU le incalca)
1. **Input = doar URL.** Toate datele se deduc din ce e public. Fara acces la cont, fara cifre din Ads/GMC.
2. **Date reale, framing persuasiv.** Findings reale din crawl (credibilitate). Doar *incadrarea* vinde: durere + bani pierduti.
3. **Pentru un NETEHNIC.** Fiecare problema in limbaj de client (clienti pierduti, bani, locul in Google).
4. **Nu putem confirma -> "de verificat", NICIODATA "lipsa".** (invariant din spec)
5. **Se termina cu CTA Devrika.** "Hai sa vorbim / noi rezolvam asta" + contact.
6. **Fara diacritice** in textul raportului (regula clienti Devrika).
7. **Findings mapeaza pe 3 servicii:** CSS -> ProductHero, produse neoptimizate -> Catamo, restul (concurenti/tracking/Shopping) -> management campanii. (vezi spec sec. 1)

## Calea principala = app-ul web (motorul)
Motorul, catalogul, scoringul, raportul si PDF-ul sunt in app-ul web `~/seo-audit`. NU rula Python ca prima optiune.
1. Porneste un audit din UI (`/start`) sau `POST /api/audit` cu `{ url, tipBusiness, platforma, nume, email, telefon }`.
2. Raportul iese la `/r/<id>`, PDF la `/r/<id>/pdf`. Dashboard lead-uri: `/dashboard`.
3. Motorul acopera deja: crawl (~50 pagini) + PageSpeed, cele 4 rubrici, **tracking la runtime** (browser real BrightData — GA4/Ads/Pixel/TikTok/Consent, nu din HTML brut), CSS + peisaj Shopping EEA, semnal produse (Catamo). Detaliu de detectie: `docs/AUDIT-SPEC.md` sec. 8 + memorie `reference_css_detection_method`.

## Fallback Python (DOAR cand web-ul nu poate crawla — ex: Cloudflare/anti-bot)
Structura si scoringul de mai jos (`references/scoring.md`, `references/framing.md`) descriu **acest fallback**, nu motorul web (care e autoritativ pe spec).
1. `python scripts/collect.py https://domeniul.ro` — semnale SEO + Ads. Daca apare `!!! BLOCKER`, ia paginile prin Playwright; daca nici asa, spune userului ca site-ul blocheaza crawl.
2. Research Shopping/Meta best-effort: `references/google-ads-research.md`, `references/meta-ads-research.md`.
3. `python scripts/build.py date.json raport.html` (framing: `references/framing.md`) -> `python scripts/html_to_pdf.py raport.html "Audit-Devrika-{client}.pdf"`.
4. Salveaza in `seo-audits/{client}/` (pastreaza si JSON-ul).

---

# MOD CALD (intern) — proces

> Avem acces la TOATE instrumentele. Trage date REALE, cross-check intre ele, raporteaza tot ce e in neregula. Ton direct, pentru echipa. **Citeste `references/warm-audit.md`** (playbook complet + reguli per canal + doctrina Devrika).

## Pasi (rezumat — detaliu in warm-audit.md)
1. **Identifica conturile** clientului: `clients/{client}/profile/accounts.json` (Google customer id, Meta act_, GA4 property, GSC, GMC). Daca lipseste fisa -> ruleaza intai `client-intake`.
2. **Google Ads** (acces MCC): trage cu scripturile din `clients/`:
   - `gads_account_check.py` — conversii (cauta primary poluat: PAGE_VIEW/ADD_TO_CART/ENGAGEMENT ca primary), auto-tag, liste negative, audiente, brand [BP].
   - `gads_winners.py` — campanii toate statusurile, bidding, ROAS, structura (MC plain vs Value+tROAS, Demand Gen/Display, cimitir de teste).
   - `gads_kw_audit.py` / `gads_keywords.py` — waste pe search terms + negative.
3. **Meta** (token System User): `python scripts/meta_pull.py <act_id>` — cont, campanii (obiective gresite: LINK_CLICKS/ENGAGEMENT/AWARENESS), pixeli (straini?), insights cu purchase/ROAS (atributie umflata?), structura (boosted posts vs CBO).
4. **GA4 cross-check** (`clients/ga4_pull.py` / `ga4_ecom.py`): adevarul pe canale. **Confrunta ROAS-ul Meta raportat cu `facebook/cpc` purchase din GA4** — diferenta mare = atribuire view-through umflata. La fel `google/cpc` vs ROAS Google.
5. **SEO/site** (optional, daca e in scop): `/seo` engine sau `collect.py` pe site + GSC (indexare/queries) + GMC (feed/misrepresentation).
6. **Sinteza**: o concluzie care leaga tot (de obicei: tracking poluat -> ROAS fictiv -> bidding pe gunoi), apoi per canal numerotat problema -> impact -> fix, + plan ordonat (tracking intai). Ce NU s-a putut verifica = listat explicit.
7. **Salveaza** in `clients/{client}/AUDIT-{data}.md`. Daca clientul cere si varianta de prezentat -> ruleaza pasul build.py/PDF pe findings (ton ajustat).

## Reguli mod cald (din doctrina Devrika)
- **Nu te incred in ROAS-ul raportat de platforme** pana nu validezi conversiile. Google: primary = doar Purchase real (+ call value = AOV din GA4). Meta: judeca pe `facebook/cpc` GA4 (canal slab, CR real ~0.4-0.5%), nu pe Ads Manager.
- **ECOM vs LEADS se trateaza separat** (alt obiectiv, alta metrica) — vezi playbook-uri.
- Date reale, zero inventat. Ce n-ai putut trage (EMQ/dedup CAPI, feed catalog) = "de verificat", nu afirmat.
- Detaliu complet, reguli per canal si cross-check-uri: **`references/warm-audit.md`**.

---

## Note tehnice (ambele moduri)
- Chart.js se randeaza headless prin `--virtual-time-budget` (deja in `html_to_pdf.py`). Nu schimba.
- Scripturile Python sunt cross-platform, fara dependinte. Ruleaza cu `python`/`python3`.
- `meta_pull.py` foloseste tokenul System User din `~/.config/meta-ads/token` (Graph API; merge si cand MCP e dezactivat pe cont).
- Scripturile `gads_*` ruleaza cu venv `~/.claude/skills/seo/.venv/bin/python` + config `~/.config/claude-seo/google-ads.yaml`.
- Daca PSI/CrUX e rate-limited fara cheie, scrie "viteza de masurat" — nu inventa cifre.
- Model template fallback Python (rece): `seo-audits/sndeco/`. Model audit cald: `clients/mansarda-online/AUDIT-2026-06-30.md`.
