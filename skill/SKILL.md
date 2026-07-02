---
name: audit-devrika
description: "Skill UNIC de audit client Devrika, cu 2 moduri. (1) RECE / lead-magnet: pornind DOAR de la URL, fara acces la cont — gaseste superficial problemele de SEO + semnale publice de Ads (pixel, Meta Ad Library, Shopping/CSS), ambalat persuasiv pt un decident netehnic, PDF + CTA Devrika, ca sa agati prospectul. (2) CALD / intern: cand avem acces la conturile clientului (Google Ads, Meta, GA4, GSC, GMC, site) — trage date REALE si face audit profund pe toate canalele, cu cross-check intre instrumente. Foloseste cand userul zice: audit client, audit prospect, raport PDF, agata client (RECE) SAU audit intern, avem acces, audit cont, audit client existent (CALD)."
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

## ⚠️ Arhitectura — motorul traieste in app-ul web (audit-web / `~/seo-audit`)

Acest skill e acum un **wrapper** peste app-ul web `audit-web` (repo `devrikaro-ship-it/audit-web`, local `~/seo-audit`). Motorul de audit, catalogul de probleme, scoringul, raportul si PDF-ul sunt **acolo**, intr-un singur loc. Nu mai dublam logica in Python.

- **RECE**: NU mai rula `collect.py` + `build.py` ca prima optiune. Calea principala = app-ul web:
  - porneste un audit din UI (`/start`) sau `POST /api/audit` cu `{ url }`;
  - raportul iese la `/r/<id>`, PDF la `/r/<id>/pdf` (Chrome headless, acelasi mecanism ca vechiul `html_to_pdf.py`).
  - Motorul web acopera deja: crawl + PageSpeed, 40+ verificari, tracking/PPC (pixel, GA4, Ads, CAPI, consent), TTFB, feed produse, detectie blocker anti-bot, link-uri Ad Library + Ads Transparency, segmentare Shopping.
- **CALD**: ruleaza pull-urile reale (`meta_pull.py --json`, `ga4_pull.py`, gads), **asambleaza** un raport (judecata ta) ca JSON in forma `WarmReport` (vezi `~/seo-audit/lib/warm-report.ts`), apoi trimite-l cu:
  `python scripts/post_cald.py raport.json --base <url-web>` → raportul apare la `/cald/<slug>` (+ PDF la `/cald/<slug>/pdf`) si in dashboard-ul CALD.
- **Fallback**: `collect.py` / `build.py` / `html_to_pdf.py` raman pentru cazuri in care web-ul nu poate crawla (ex: site in spatele Cloudflare unde colectezi din browser). NU sunt calea implicita.
- Knowledge-ul de framing Ads (Ad Library, CSS Shopping, segmentare) e oglindit in `~/seo-audit/docs/ads-research/`.

## Cum aleg modul (auto-detect)

1. **`--intern` in argumente** SAU userul zice "audit intern / avem acces / audit cont" -> **CALD**.
2. Exista deja `clients/{client}/profile/accounts.json` sau ID-uri de cont (Google customer / Meta act_) -> **CALD**.
3. Avem token Meta (`~/.config/meta-ads/token`) si/sau MCC Google care contine clientul -> **CALD** posibil; confirma scurt cu userul ce conturi atingem.
4. Altfel (doar un URL de prospect, fara acces) -> **RECE**.

Daca e ambiguu, intreaba o singura data: *"Avem acces la conturile lor sau e audit la rece de prospect?"*

---

# MOD RECE (lead-magnet) — proces

> Principiu: **superficial si rapid**. Scopul nu e exhaustivitate, e sa agate. 5-9 probleme SEO + 3-6 Ads, cele cu impact maxim. Fara date de cont.

## Principii (NU le incalca)
1. **Input = doar URL.** Toate datele se deduc din ce e public. Fara acces la cont, fara cifre din Ads/GMC.
2. **Date reale, framing persuasiv.** Findings reale din crawl (credibilitate). Doar *incadrarea* vinde: durere + bani pierduti.
3. **Pentru un NETEHNIC.** Fiecare problema are linia `Ce inseamna pentru tine` in limbaj de client (clienti pierduti, bani, locul in Google).
4. **Se termina cu CTA Devrika.** "Hai sa vorbim / noi rezolvam asta" + contact.
5. **Fara diacritice** in textul raportului (regula clienti Devrika).

## Pasi
1. **Colecteaza semnale**
   ```
   python scripts/collect.py https://domeniul-clientului.ro
   ```
   Aduna: title/meta/H1/H2, robots+sitemap, schema, HTTPS/www, security headers, broken links (esantion), readability+citability AI, imagini/alt/format, viteza TTFB+CWV (CrUX cu cheie), **tracking & pixeli** (GA4, GTM, Google Ads AW-, **Meta Pixel**, TikTok, Bing UET, Consent), ecom/stoc, feed/Shopping, competitie Ads. Citeste tot output-ul.
   **Daca apare `!!! BLOCKER` (Cloudflare/anti-bot):** datele sunt false. NU genera audit. Fallback: ia paginile prin Playwright (`browser_navigate` + `browser_evaluate`). Daca nici asa, spune userului ca site-ul blocheaza crawl.

2. **Verifica manual ce conteaza** (superficial, nu sapa): 1 pagina produs + 1 categorie (schema Product/pret/availability/reviews); raport stoc OutOfStock; GMC/Shopping "de verificat"; deschide linkurile Ads Transparency / Meta Ad Library.

2b. **Research Google Shopping (Playwright, best-effort)** — `references/google-ads-research.md`. CSS "De la Google" = fara CSS (CPC mai mare). MEREU constatarea de segmentare produse (Heroes/Villains/Zombies).

2c. **Research Meta (Playwright, cold)** — `references/meta-ads-research.md`. Pixel DA/NU + CAPI "de verificat"; Meta Ad Library: ruleaza reclame ACUM? cate? compara cu 2-3 competitori.

3. **Scoreaza** 0-100 per categorie — `references/scoring.md`. Scor global ponderat.

4. **Construieste raportul (JSON -> build.py)** — date reale + framing din `references/framing.md`. DOAR SEO + Google Ads + semnal Meta. Design vizual, putin text: carduri `{sev,title,impact,tag,effort}`. Max 5 carduri/pagina, impact 2-3 randuri.
   ```
   python scripts/build.py date.json raport.html
   ```

5. **PDF** -> `python scripts/html_to_pdf.py raport.html "Audit-Devrika-{client}.pdf"`

6. **Salveaza** in `seo-audits/{client}/` (pastreaza si JSON-ul).

Structura raport (5 pagini A4, vizual): Coperta (gauge global + SEO/Ads) / Ce am gasit pe scurt / SEO / Google Ads+Shopping / Plan + CTA.

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
- Model proven template (rece): `seo-audits/sndeco/`. Model audit cald: `clients/mansarda-online/AUDIT-2026-06-30.md`.
