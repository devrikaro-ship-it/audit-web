# Spec Raport Audit — sursa unica

> **Autoritate:** daca codul si acest fisier se contrazic, castiga acest fisier
> (sau schimbam fisierul explicit, nu codul pe furis).
> **Se citeste INAINTE** de a atinge raportul: `components/report-renderer.tsx`,
> `lib/audit-engine.ts`, `lib/css-detect.ts`.
> **Ultima actualizare:** 2026-07-06 — landing pe ton NEUTRU (nu vinde), funnel post-click (scan rapid + "uite ce am gasit" + 5 pasi) si simulare de venit (ROAS acum vs posibil). Vezi partea 11 (de construit).

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

> **Unde apare maparea (decis 2026-07-06):** tabelul asta e **INTERN raportului** — findingurile duc spre servicii in interiorul raportului `/r/<id>`. **Landing-ul (`app/audit-seo`) si funnel-ul sunt NEUTRE/diagnostic** — nu numesc niciun serviciu, nu spun "ce reparam" / "de ce noi", ci "unde pierzi bani si clienti". Un pitch pe landing sperie; o unealta neutra convinge sa completeze. Detaliile: **partea 11**.

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
**Auto-accept cookies (2026-07-07):** browserul real apasa singur "Accept" pe bannerul de consent INAINTE sa citeasca tag-urile (`acceptCookies` in `css-detect.ts`: selectoare CMP cunoscute — OneTrust/Cookiebot/CookieYes/Complianz/etc. — + fallback pe text, in pagina si iframe-uri). Multe tag-uri (GA4/Pixel) sunt gated pe consent si nu se declanseaza pana la accept; fara pas, ar iesi fals neconfirmate. Best-effort: fara banner, merge mai departe.
**Fallback / invariant (intarit 2026-07-07):** din HTML brut NU se poate dovedi absenta unui tag → `veil` in `computeConversieAudit` returneaza **"da" (confirmat) sau "necunoscut" (de verificat), NICIODATA "nu"/lipsa** (§5.1 universal, raport public). Pe ecom, `applyLiveTracking` face upgrade la "da" ce vede runtime-ul.
**Cod:** `lib/css-detect.ts` (`analyzeProspectLive`, `detectTrackingOnPage`, `acceptCookies`) + `lib/audit-engine.ts` (`computeConversieAudit`, `applyLiveTracking`); render `TrackingSection`.

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

**Scor global (gauge hero) — 2026-07-07:** doar componentele VIZIBILE in raport (`computeOverallScore`: viteza 0.17 + seo 0.24 + continut 0.20 + keywords 0.16 + structura 0.13 + schema 0.10 = 1.00). Social + securitate **NU** intra in nota (nu-s rubrici, §4) — inainte ponderau 10% ascuns; scoase ca nota sa reflecte exact ce se afiseaza. (`social`/`securitate` raman calculate in `checksRezultate` dar neafisate — cod mort inofensiv.)

## 7. Wrapper de persuasiune (fix, in afara celor 4 rubrici)

Hero (domeniu + gauge scor global) · "Ce te costa asta" · **simulare de venit** (ROAS acum vs posibil — vezi 11.3) · "De ce Devrika" · CTA + contact. Raportul e locul unde se face vanzarea (dupa ce vede scorul slab), deci CTA + maparea pe servicii raman aici; simularea se adauga.

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

**Backlog partea 11 — CONSTRUIT (2026-07-06), tsc verde + verificat vizual (Playwright):**
1. ✅ **Landing rescris pe ton NEUTRU** — 7 sectiuni (11.1), zero pitch/serviciu; "Ce castigi daca repari" inlocuieste "de ce noi"; fonturi Sora/Inter; fara emoji-ca-iconite. `app/audit-seo/page.tsx`.
2. ✅ **Cele 4 zone = carduri interactive** — `<details>` nativ, click deschide ce verificam (limbaj client). In landing.
3. ✅ **Funnel redesign** (11.2) — `app/start/page.tsx` rescris: URL -> scan rapid (`app/api/scan`) -> card "Uite ce am gasit" (platforma/tip/tracking-in-cod) -> 5 intrebari (conversie pe intervale + "nu stiu" / AOV / buget / preocupare / contact). Auditul complet porneste la scan si ruleaza in fundal (API 2 faze: `start` + `finalize`, `tryFinalize` idempotent la race).
4. ✅ **Motor simulare venit** (11.3) — `lib/roi-sim.ts` (pur, `computeRoiSim`) + `RoiSimSection` in raport + teaser pe landing. Formula `ROAS=AOV/CPA`; ipoteze legate de audit (uxWeak/trackingWeak/CSS partener), plafonate, etichetate "estimare orientativa". Verificat pe mock (buget 1500 / AOV 55 / conv 1.5% -> ~1.830 EUR/luna).

**Operational — REZOLVAT (2026-07-07), verificat live pe audit.devrika.ro:** `PAGESPEED_API_KEY` + `BRIGHTDATA_CDP` setate in env Coolify; audit de productie da viteza reala (90/100) + BrightData ruleaza de pe Hetzner (durata ~53s, obiect `css` prezent). Restrictia de zona BrightData la IP Hetzner **NU** e blocanta — conexiunea CDP merge de pe server. **De reglat dupa date reale:** constantele din `roi-sim.ts` (CPC_BENCH, tinte conversie) — usor de schimbat, sus in fisier.

Cod atins la partea 11: `app/audit-seo/page.tsx`, `app/start/page.tsx`, `app/api/audit/route.ts`, `app/api/scan/route.ts` (nou), `lib/roi-sim.ts` (nou), `lib/types.ts`, `lib/audit-store.ts`, `lib/audit-engine.ts`, `components/report-renderer.tsx`, `app/r/preview/page.tsx` (mock).

---

## 11. Landing + funnel + simulare (RECE) — decis 2026-07-06

**Ton: neutru, diagnostic.** Landing-ul NU vinde. Nu spune "ce reparam" / "de ce noi", ci "unde pierzi bani si clienti". Maparea pe servicii (partea 1) ramane INTERNA raportului; pe landing nu apare niciun serviciu.

### 11.1 Landing (`app/audit-seo`) — 7 sectiuni, in ordine
1. **Hero** — titlu diagnostic ("Afla unde pierde bani magazinul tau online"), subcopy (ce verificam + in cat timp), UN singur CTA, reasigurare "fara card, fara cont, doar adresa". Butonul porneste scanarea (11.2).
2. **Banda de trust** — 4 cifre (magazine analizate · probleme gasite · buget gestionat · nota clienti). Cifre orientative de marketing (aprobate).
3. **Problema** — scurt, context: "primesti vizite, dar putine devin comenzi; de obicei nu e traficul, e masurarea / produsele / experienta". Nu pitch.
4. **Ce analizam — 4 zone** — Tracking · SEO · UX/UI · Google Ads. Fiecare zona = card care se **deschide la click/hover** cu exact ce verificam acolo, in limbaj de client (nu lista tehnica).
5. **Cum functioneaza** — 3 pasi (adresa -> analizam -> raport).
6. **Ce castigi daca repari (simulare)** — inlocuieste "de ce noi". Teaser al simularii de venit (11.3). Ton neutru, orientat pe rezultatul lui.
7. **CTA final** — repeta accesul la raport + contact real. Fara limbaj de vanzare.

### 11.2 Funnel post-click — scan + 5 pasi
La click pe CTA (adresa data in hero):
1. **Scan rapid** (~2-5s, din HTML): platforma (WooCommerce / Shopify / ...), nr. produse, tracking din HTML -> card **"Uite ce am gasit"** (efect "deja imi cunoaste magazinul").
2. **Detectia grea ruleaza in FUNDAL** (CSS / Shopping / tracking runtime prin BrightData, ~40-80s) cat timp userul raspunde la intrebari -> se termina taman la raport. (Umple timpul de asteptare cu intrebarile.)
3. **5 pasi cu intrebari** (ce scanul nu poate sti):
   1. **Rata de conversie medie** — cu optiunea "nu stiu" (fallback pe media pietei ~1.3%)
   2. **Comanda medie (AOV)** — in EUR ("cat cheltuie in medie un client pe o comanda")
   3. **Buget lunar de reclame** — in EUR (aproximativ, "doar pentru simulare")
   4. **Ce te preocupa cel mai mult** — viteza / Google / conversii...
   5. **Contact** — nume, email, telefon (ULTIMUL pas, dupa ce e implicat)
4. **Raport + simulare** — combina scanul cu raspunsurile.

### 11.3 Simulare de venit (RECE)
**Scop:** in loc de "de ce noi", arata in bani ce inseamna reparatul.
**Inputuri:** buget lunar ads (EUR) + AOV (EUR) + rata de conversie (pasul 1; "nu stiu" -> media pietei).
**Formula:** `ROAS = AOV / CPA`. La acelasi buget:
- `ROAS_posibil = ROAS_acum × (conv_nou / conv_acum) × 1/(1 − reducere_CPC)`
- `Venit_extra_luna = (ROAS_posibil − ROAS_acum) × buget`

**Ipoteze (conservatoare, plafonate, LEGATE de audit):**
- **conv_nou:** tinta ~2.0% doar daca UX/tracking ies slabe in audit; daca magazinul e deja ok, uplift mic. Plafon ferm (nu promite 3×).
- **reducere_CPC:** −10..15% **DOAR** daca nu are CSS partener ("By Google"); daca are deja partener -> 0.
- **conv_acum:** raspunsul userului; doar "nu stiu" cade pe media pietei.

**Onestitate (invariant):** afiseaza clar **"estimare orientativa"**; cifra exacta doar cu acces la cont (GA4/Ads) = CALD. Nu prezenta estimarea drept cifra reala.
**Cod (de construit):** input in funnel `app/start`, calcul in `lib/roi-sim.ts` (nou), afisare in raport (`report-renderer.tsx`) + teaser pe landing.

---

## 12. Refactor calitate cod (2026-07-07) — module noi + teste

Audit de calitate (skill `improve-codebase-architecture` + ESLint). Aplicate TOATE cele 7 refactoruri identificate (tsc/eslint verzi, verificate live), + plasa de teste. Inainte: zero teste, paleta+praguri+detectie duplicate in mai multe locuri, `runAudit` god-function fara seam.

- **Teste:** `vitest` (script `npm test`), teste in `lib/**/*.test.ts` — **39 teste, 6 fisiere** (roi-sim, site-signals, scoring, audit-request, parse-page, net). Interfata = suprafata de test; fiecare modul nou e testat pur.
- **`lib/site-signals.ts`:** sursa UNICA pentru amprenta site-ului (platforma / ecom / tracking-in-HTML). Inlocuieste detectia duplicata din `app/api/scan` + `computeConversieAudit` (nu se mai pot contrazice).
- **`lib/scoring.ts`:** pragurile de verdict din §6 (70/40) + mapari scor↔status, intr-un singur loc. Inainte copiate in ~7 locuri (renderer + engine).
- **`lib/audit-store.ts` (adancit):** detine tot CICLUL DE VIATA al job-ului (`startJob`/`finalizeJob`/`getJobView`); race-ul audit/finalize + calculul roiSim + persistenta traiesc aici, nu in ruta. `app/api/audit/route.ts` e subtire (doar coerce). `runAudit` nu mai calculeaza roiSim (o singura casa pentru leviere = `tryFinalize`).
- **`lib/theme.ts` (design tokens):** paleta `C` + fonturi (Sora/Inter) + gradient brand intr-un singur loc; ambele renderere (RECE `report-renderer` + CALD `warm-report-renderer`) importa de aici, nu mai hardcodeaza hex.
- **`lib/audit-request.ts` (contract tipat):** wire-type discriminat (`AuditRequestBody`) + `parseAuditRequest` centralizeaza coerce-ul (numere din string, convRate "nu stiu"→null) si validarea. Clientul din `app/start` se leaga prin `satisfies AuditRequestBody`.
- **`lib/parse-page.ts` (model pagina parsata):** cele 12 parsere HTML pure (title/meta/canonical/h1/jsonld/imagini/linkuri/cuvinte/breadcrumb/faq) extrase din mijlocul engine-ului; string → valoare, testabile izolat.
- **`lib/net.ts` (seam de retea):** SINGURUL loc care atinge `fetch()` — `fetchText`/`fetchPage`/`measureTTFB`/`probeProductFeed`/`fetchPSI` + tipurile `PageData`/`PSIResult`. Mockabil in teste (mock pe global.fetch) si chokepoint unde s-ar adauga o garda SSRF (validare IP) daca e nevoie. `runAudit` nu mai defineste primitive HTTP inline.

**Neatacat (constient):** garda SSRF (scan/audit fac fetch pe URL-uri arbitrare server-side — chokepoint pregatit in `lib/net.ts`, dar validarea de IP nu e pusa); componenta comuna `FindingCard` intre RECE↔CALD (design tokens impartasite, dar structura cardului inca dublata).

**Deploy productie (2026-07-07):** cele 3 commituri (refactor + landing/funnel/simulare + fix PSI) pushate pe `main` -> redeploy Coolify. Env-uri productie complete: `PAGESPEED_API_KEY` + `BRIGHTDATA_CDP`. Ramas doar `CALD_TOKEN` (amanat — CALD merge deschis fara el). Gotcha env Coolify (POST valoare prin argv node = gol) in [[infra_hetzner_coolify]].
