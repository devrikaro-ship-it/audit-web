# Spec Raport Audit — sursa unica

> **Autoritate:** daca codul si acest fisier se contrazic, castiga acest fisier
> (sau schimbam fisierul explicit, nu codul pe furis).
> **Se citeste INAINTE** de a atinge raportul: `components/report-renderer.tsx`,
> `lib/audit-engine.ts`, `lib/css-detect.ts`.
> **Ultima actualizare:** 2026-07-03 — tot backlog-ul implementat (UX/UI, Catamo, landing ecom, fiabilitate CSS + FAZA 2: pret/brand/GBP).

---

## 1. Scop (de ce)

Raport de audit pentru un **prospect ecom netehnic**. E instrument de **vanzare**, nu document tehnic.
- **RECE** (lead-magnet): pornind DOAR de la URL, fara acces la cont. Superficial, cat sa agate.
- Se vede **public** -> onestitate: nu marca "lipsa" ce nu putem confirma.
- Fiecare problema in limbaj de client (clienti pierduti / bani / loc in Google), nu jargon.
- Se termina cu **CTA Devrika**.

**Scope: ECOM-ONLY (all-in).** Auditul, **landing-ul si toata comunicarea** sunt orientate 100% pe magazine online — Devrika merge all-in pe ecom. Non-ecom **nu** e acoperit: nu construim varianta separata. Un URL non-ecom primeste un raport degradat (fara rubrica Google Ads, tracking doar din HTML) — acceptat, nu-l optimizam. Landing (`app/audit-seo`) + copy + CTA = mesaj ecom.

**Principiu strategic (nordul auditului):** raportul e construit ca problemele gasite sa mapeze EXACT pe solutiile Devrika de optimizare pe Google. Fiecare finding relevant duce spre unul din 3 servicii — prospectul trebuie sa iasa cu senzatia *"problema mea = fix ce rezolva solutiile lor"*:

| Finding | Serviciul vandut |
|---|---|
| CSS (Google / custom / fara) | **ProductHero** — CSS partener, -~20% CPC |
| Produse neoptimizate (titluri/descrieri/feed) | **Catamo** — optimizarea SEO a produselor |
| Concurenti, prezenta Shopping, tracking | **Management campanii** (Google/Meta) |

## 2. Doua moduri

| | RECE (lead-magnet) | CALD (intern) |
|---|---|---|
| Cand | prospect, fara acces | client care ne-a dat acces la conturi |
| Input | doar URL | URL + Google Ads / Meta / GA4 / GSC / GMC |
| Iesire | `/r/<id>` (+ PDF) | `/cald/<slug>` (+ PDF) |

Detaliile de orchestrare: `skill/SKILL.md`. Acest spec descrie **structura raportului RECE** (partea 3-8) si **leaga** partea CALD (partea 9).

---

## 3. RECE — structura raportului: EXACT 4 rubrici, in ordine

### 3.1 Tracking
**Campuri (fix acestea, nimic in plus):** GA4 · Google Ads conversii · Meta Pixel · TikTok Pixel · Consent Mode v2
**Detectie:** runtime in **browser real** (BrightData) — `window.google_tag_manager` (expune GTM/GA4/AW) + `fbq`/`ttq` + host CMP. **NU** din HTML brut (tag-urile prin GTM nu apar in sursa).
> Nota: **Consent Mode v2** = detectam *prezenta unui CMP* + semnal `gcs=` (proxy), nu ca e corect legat la gtag. Cand incert -> "de verificat".
**Fallback** cand browserul nu ruleaza: daca GTM e in HTML dar tag-ul nu se confirma -> "de verificat", **NICIODATA "lipsa"**.
**Cod:** `lib/css-detect.ts` (`analyzeProspectLive`, `detectTrackingOnPage`) + `lib/audit-engine.ts` (`computeConversieAudit`, `applyLiveTracking`); render `TrackingSection`.

### 3.2 SEO
**5 sub-sectiuni** (definite de Vlad):
1. **SEO Tehnic (On-page):** Title, Meta description, H1, Canonical, structura URL
2. **Calitatea Continutului:** text subtire, duplicat, ierarhie H2/H3, lizibilitate, keyword principal
3. **Analiza Cuvinte Cheie:** kw in title/H1/URL, acoperire categorii, canibalizare
4. **Structura Site-ului:** robots.txt + crawlere AI, sitemap, breadcrumbs, linkuri rupte, internal linking
5. **Schema Markup:** JSON-LD, tipuri, validare, breadcrumb, rating
**Verificat pe** home + categorii + produse.
**Cod:** `computeSeoChecks/Continut/Keywords/Structura` + `computeSchemaChecks`; render `SectionBlock` x5.

### 3.3 UX / UI
**Campuri (fix acestea, 5 — decis 2026-07-01):**
1. **Viteza** — scor de incarcare pe mobil
2. **Analiza homepage** — hero/mesaj clar, meniu + categorii vizibile, cale spre produse, mobil OK
3. **Analiza pagina categorie** — grila produse (poza+pret), breadcrumbs, paginare, text intro categorie
4. **Analiza pagina produs** — imagini multiple, pret+stoc, "Adauga in cos", descriere, recenzii, produse similare
5. **Filtre & sortare** — marime / culoare / pret / brand + optiuni de sortare
Fiecare camp: status bun/partial/slab (necunoscut cand tipul de pagina lipseste din crawl, exclus din medie) + semnale gasit/lipsa in limbaj de client. Scor rubrica = media campurilor cu status != necunoscut.
**Cod:** `lib/audit-engine.ts` (`computeUxAudit` + detectori) -> `UxAudit`/`UxField` in `lib/types.ts`; render `UxCard`/`UxUiSection` (`components/report-renderer.tsx`). ✅ construit.

### 3.4 Google Ads
**Scope decis 2026-07-02** — 4 campuri, fiecare cu carligul lui de vanzare:
1. **CSS** (primar) — Google / partener / custom / nu ruleaza Shopping. Fara CSS partener ("By Google") -> "platesti pana la ~20% mai mult pe click". **Carlig: ProductHero.** ✅ construit
2. **Concurenti Shopping** — cine liciteaza pe produsele tale + CSS-ul lor + pret. **Carlig: management campanii.** ✅ construit
3. **Prezenta in Shopping** — apari sau nu pe produsele tale. **Carlig: management.** ✅ construit
4. **Semnal produse (Catamo)** — constatare standard, mereu-prezenta pe ecom: produsele nu-s optimizate pentru Shopping/cautare (titluri/descrieri/feed) -> se pot optimiza. Ancorat in numere reale cand prindem pagini de produs (titluri scurte/generice, meta lipsa), altfel generic. **Carlig: Catamo.** ✅ construit (`computeProductSignal` -> `ProductSignal`; bloc OPTIMIZARE PRODUSE in `GoogleAdsSection`; se randeaza pe ecom chiar si fara BrightData).

**Detectie:** browser real cu IP **EEA** (BrightData) — citeste caruselul "Sponsored products" pe Google. Vezi `reference_css_detection_method` (memorie).
Cand CSS iese **"nedeterminat"** (carusel dinamic / interogari slabe): arata "de verificat" (invariant), nu un scor fals de rau.
> **FIABILITATE:** ✅ imbunatatita. Titlurile de produs pt interogari se iau din pagini detectate pe **continut** (`isProductPage`: schema Product / og:type=product / pret+cos), nu pe adancimea URL (nu mai baga Contact/Blog). `deriveProductQueries` taie sufixul de site/brand + boilerplate. Poate cadea inca pe "nedeterminat" cand caruselul e gol/dinamic — atunci "de verificat".
**FAZA 2** ✅ construita (best-effort, degradare gratioasa): **pozitionare pret** (`analyzePricePosition` din caruselul Shopping, orientativ — nu strict acelasi-produs), **aparare brand** (`collectBrandIntelOn`: concurenti pe SERP-ul de brand -> campanie de brand), **recenzii GBP** (knowledge panel: rating + nr recenzii -> Seller Ratings). O singura navigare extra (brand) acopera brand+GBP.
**Cod:** `lib/css-detect.ts` — `analyzeProspectLive` (tracking + Shopping + faza brand; folosit in `audit-engine.ts`; `analyzeGoogleShopping` e superseded); render `GoogleAdsSection` (`AdsFindingCard`).

---

## 4. EXCLUS explicit (NU apar in raport)

- **Incredere** (recenzii / politici / plata) ca sectiune
- **Functii magazin** ca sectiune separata (semnalele utile de UX intra in UX/UI)
- **Cos & checkout** ca sectiune
- Sectiunea veche **"Bani pierduti din site si reclame"** pe zone
- **"Top probleme"** (mix pe toate zonele)
- **"Raportul complet"** pe 8 zone
- **social** / **securitate** ca sectiuni de sine statatoare

## 5. Reguli / invariante

1. **Nu putem confirma -> "de verificat", NICIODATA "lipsa".** Universal, la toate campurile (adoptat ca default).
2. **Fara diacritice** in textele din raport (client-facing).
3. Fiecare problema tradusa in limbaj de client (durere + bani + loc in Google).
4. Se termina cu **CTA Devrika**.

## 6. Praguri verdict + scor

Scor per rubrica 0-100. Verdict: **>=70 Bun** (verde) · **>=40 De reglat** (galben) · **<40 Slab** (rosu). (decis 2026-07-02)

Scor per rubrica: Tracking = % campuri prezente (necunoscut exclus); SEO = media celor 5 sub-sectiuni; UX/UI = media celor 5 campuri (viteza + 3 tipuri de pagini + filtre); Google Ads = mapare pe status CSS.

## 7. Wrapper de persuasiune (fix, in afara celor 4 rubrici)

Hero (domeniu + gauge scor global) · "Ce te costa asta" · "De ce Devrika" · CTA + contact. Aprobat, ramane.

## 8. Parametri de detectie

- **Pagini analizate:** tinta minim **50** (`MIN_PAGES=50`, `MAX_PAGES=60` candidati). Home + mix categorii/produse.
- **Tracking + CSS:** runtime, browser real EEA (BrightData), doar pe **ecom**.
- **Crawl:** fetch + PageSpeed; fallback link-crawl daca sitemap slab.

## 9. CALD — pe scurt (NU redefini aici)

- Structura datelor: `lib/warm-report.ts` (`WarmReport`)
- Playbook: `docs/ads-research/warm-audit.md`
- Scoring: `docs/ads-research/scoring.md`
- Iese la `/cald/<slug>` (+ PDF)

## 10. Stare decizii + implementare

**Decizii: toate rezolvate** (A1 UX/UI, A2 Google Ads scope, A3 praguri — 2026-07-02).

**Implementat (2026-07-03) — codul se potriveste cu specul:**
1. ✅ **UX/UI** — `computeUxAudit` (analiza home/categorie/produs + viteza + filtre) + `UxCard`/`UxUiSection`. (3.3)
2. ✅ **Semnal Catamo** — `computeProductSignal` + bloc OPTIMIZARE PRODUSE in `GoogleAdsSection`. (3.4)
3. ✅ **Landing + comunicare ecom** — `app/audit-seo` rescris 100% pe magazine online (hero/features/CTA/meta).
4. ✅ **Fiabilitate CSS** — `isProductPage` (detectie pe continut) + `deriveProductQueries` curatat. (3.4)

5. ✅ **FAZA 2** — pozitionare pret + aparare brand + recenzii GBP in rubrica Google Ads (best-effort, `analyzePricePosition` + `collectBrandIntelOn`). (3.4)

**Backlog: gol.** Tot ce era in spec e implementat. Ce ramane e operational: cheie PageSpeed in env Coolify, restrictie zona BrightData la IP Hetzner la deploy.

Cod atins: `components/report-renderer.tsx`, `lib/audit-engine.ts`, `lib/css-detect.ts`, `lib/types.ts`, `app/audit-seo/page.tsx`.
