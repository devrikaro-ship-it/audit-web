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

# Audit Devrika — skill general de audit

Skill-ul **general** de audit client: alege modul dupa acces, tine framing-ul comun (durere + bani,
netehnic, fara diacritice), livrarea si sinteza multi-canal.

## Skill-uri specifice pe canal (auditul profund se DELEAGA)

| Canal | Skill specific | Ce ii dai |
|---|---|---|
| **Google Ads** | [`audit-google-ads`](../audit-google-ads/SKILL.md) | contul + tipul + targetul din fisa |
| Meta | `meta-ads-optimize` (pana are skill de audit propriu) | act_id + token |
| SEO / site | `devrika-seo` | domeniul |

**Regula:** doctrina unui canal traieste in skill-ul lui. Aici NU se copiaza praguri de canal —
daca scrii un prag de Google Ads in acest fisier, ai bifurcat doctrina.

---

Cele **doua moduri** de mai jos raman valabile; alegi modul DUPA cat acces ai:

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

Skill-ul e un **wrapper** peste app-ul `audit-web` (repo `devrikaro-ship-it/audit-web`; acest skill
= folderul `skill/` din el, symlink in `~/.claude/skills/`). Motorul, catalogul, scoringul, raportul
si PDF-ul sunt **acolo**, intr-un singur loc — nu dublam logica in Python.
Cai de rulare si publicare (WarmReport, post_cald, PDF local):
**[references/note-tehnice.md](references/note-tehnice.md)**.

## Cum aleg modul (auto-detect)

**CALD** daca: `--intern` in argumente · userul zice "audit intern / avem acces / audit cont" ·
exista `clients/{client}/profile/accounts.json` sau ID-uri de cont · avem token Meta / MCC-ul
contine clientul (aici confirma scurt ce conturi atingem). **Altfel RECE** (doar URL, fara acces).
Ambiguu → intreaba o singura data: *"Avem acces la conturile lor sau e audit la rece?"*

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

## Calea principala = app-ul web (motorul). NU rula Python ca prima optiune.
1. Porneste din UI (`/start`) sau `POST /api/audit` `{url, tipBusiness, platforma, nume, email, telefon}`.
2. Raport la `/r/<id>`, PDF la `/r/<id>/pdf`, lead-uri in `/dashboard`.
3. Motorul acopera deja crawl (~50 pagini) + PageSpeed, cele 4 rubrici, tracking **la runtime**
   (browser real BrightData, nu HTML brut), CSS + peisaj Shopping EEA, semnal produse (Catamo),
   si simularea de venit multi-moneda din funnel. Detalii: `docs/AUDIT-SPEC.md` §8 si §11.

## Fallback Python (DOAR cand web-ul nu poate crawla — ex: Cloudflare/anti-bot)
Pasii + limitele: **[references/note-tehnice.md](references/note-tehnice.md)**.

---

# MOD CALD (intern) — proces

> Avem acces la TOATE instrumentele. Trage date REALE, cross-check intre ele, raporteaza tot ce e in neregula. Ton direct, pentru echipa. **Citeste `references/warm-audit.md`** (playbook complet + reguli per canal + doctrina Devrika).

## Pasi (rezumat — detaliu in warm-audit.md)
1. **Identifica conturile** clientului: `clients/{client}/profile/accounts.json` (Google customer id, Meta act_, GA4 property, GSC, GMC). Daca lipseste fisa -> ruleaza intai `client-intake`.
2. **Google Ads** (acces MCC) → **deleaga la [`audit-google-ads`](../audit-google-ads/SKILL.md)**
   (SOP + agenti `audit-gads-collect` / `audit-gads-report`). Comenzile si pragurile stau acolo.
3. **Meta** (token System User): `python scripts/meta_pull.py <act_id>` — cont, campanii (obiective gresite: LINK_CLICKS/ENGAGEMENT/AWARENESS), pixeli (straini?), insights cu purchase/ROAS (atributie umflata?), structura (boosted posts vs CBO).
4. **GA4 cross-check** (`clients/ga4_pull.py` / `ga4_ecom.py`): adevarul pe canale. **Confrunta ROAS-ul Meta raportat cu `facebook/cpc` purchase din GA4** — diferenta mare = atribuire view-through umflata. La fel `google/cpc` vs ROAS Google.
5. **SEO/site** (optional, daca e in scop): `/seo` engine sau `collect.py` pe site + GSC (indexare/queries) + GMC (feed/misrepresentation).
6. **Sinteza**: o concluzie care leaga tot (de obicei: tracking poluat -> ROAS fictiv -> bidding pe gunoi), apoi per canal numerotat problema -> impact -> fix, + plan ordonat (tracking intai). Ce NU s-a putut verifica = listat explicit.
7. **Salveaza** in `clients/{client}/AUDIT-{data}.md`. Daca clientul cere si varianta de prezentat -> asambleaza `WarmReport` JSON (`slug`/`client`/`verdict`/`channels[]`) si publica via `post_cald.py` (web) sau `warm_report.py` + `html_to_pdf.py` (PDF local).

## Reguli mod cald (din doctrina Devrika)
- **Nu te incred in ROAS-ul raportat de platforme** pana nu validezi conversiile. Google: primary = doar Purchase real (+ call value = AOV din GA4). Meta: judeca pe `facebook/cpc` GA4 (canal slab, CR real ~0.4-0.5%), nu pe Ads Manager.
- **ECOM vs LEADS se trateaza separat** (alt obiectiv, alta metrica) — vezi playbook-uri.
- Date reale, zero inventat. Ce n-ai putut trage (EMQ/dedup CAPI, feed catalog) = "de verificat", nu afirmat.
- Detaliu complet, reguli per canal si cross-check-uri: **`references/warm-audit.md`**.

---

## Referinte
- **[references/note-tehnice.md](references/note-tehnice.md)** — runtime, fallback Python, modele
- **[references/warm-audit.md](references/warm-audit.md)** — playbook mod CALD (reguli per canal)
- `docs/AUDIT-SPEC.md` — structura raportului RECE (sursa unica)
