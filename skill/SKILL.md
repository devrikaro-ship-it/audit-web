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
| **Google Ads** | `audit-google-ads` | contul + tipul + targetul din fisa |
| Meta | `meta-ads-optimize` (pana are skill de audit propriu) | act_id + token |
| SEO / site | `devrika-seo` | domeniul |

**Regula:** doctrina unui canal traieste in skill-ul lui. Aici NU se copiaza praguri de canal —
daca scrii un prag de Google Ads in acest fisier, ai bifurcat doctrina.

---

**Doua moduri**, alese dupa cat acces ai: **RECE** (prospect, doar URL → `/r/<id>`) si **CALD**
(client care ne-a dat acces la conturi → `/cald/<slug>`). Tabelul complet = `docs/AUDIT-SPEC.md` §2.
Un skill de canal poate avea moduri in plus — ex `audit-google-ads` are **CONNECTED**, unde
prospectul isi conecteaza singur contul: nici RECE, nici CALD.

> **Granita cu specul** (declarata in `docs/AUDIT-SPEC.md`): acolo = **structura raportului**
> (rubrici, campuri, invarianti, praguri de scor). Aici = **orchestrarea** (ce mod, ce canal,
> ce rulez, unde livrez). Nu copia invarianti sau praguri in acest fisier.

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

## Principii
Invariantii modului RECE (input = doar URL · "de verificat" niciodata "lipsa" · limbaj de client ·
CTA · fara diacritice · maparea findings-urilor pe cele 3 servicii) sunt in **`docs/AUDIT-SPEC.md`
§1 si §5** — sursa unica. Nu-i redeclara aici; daca se schimba, se schimba acolo.

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
2. **Google Ads** (acces MCC) → **deleaga la `audit-google-ads`**
   (SOP + agenti `audit-gads-collect` / `audit-gads-report`). Comenzile si pragurile stau acolo.
3. **Meta** — `python scripts/meta_pull.py <act_id>` (obiective gresite, pixeli straini, atributie
   umflata). Detaliu: `references/warm-audit.md`.
4. **GA4 cross-check** (`clients/ga4_pull.py` / `ga4_ecom.py`) — adevarul pe canale: confrunta ROAS-ul
   raportat de platforma cu purchase-ul pe `facebook/cpc` si `google/cpc`.
5. **SEO/site**, daca e in scop: `/seo` engine + GSC + GMC.
6. **Sinteza** — o concluzie care leaga tot (tipic: tracking poluat → ROAS fictiv → bidding pe
   gunoi), apoi per canal problema → impact → fix, plan ordonat (tracking intai), plus ce NU s-a
   putut verifica.
7. **Salveaza** in `clients/{client}/AUDIT-{data}.md`; varianta de prezentat → `WarmReport` JSON
   (vezi [references/note-tehnice.md](references/note-tehnice.md)).

## Reguli mod cald
- **Nu te incred in ROAS-ul raportat de platforme** pana nu validezi conversiile — regula generala.
  Ce inseamna "conversie valida" e specific canalului si sta in skill-ul lui (Google →
  `audit-google-ads`, SOP etapa 2).
- **ECOM vs LEADS se trateaza separat** (alt obiectiv, alta metrica).
- Zero inventat: ce n-ai putut trage = "de verificat", nu afirmat.
- Reguli per canal + cross-check-uri: **`references/warm-audit.md`**.

---

## Referinte
- **[references/note-tehnice.md](references/note-tehnice.md)** — runtime, fallback Python, modele
- **[references/warm-audit.md](references/warm-audit.md)** — playbook mod CALD (reguli per canal)
- `docs/AUDIT-SPEC.md` — structura raportului RECE (sursa unica)
