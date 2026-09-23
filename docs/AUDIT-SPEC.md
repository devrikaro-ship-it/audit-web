# Spec Raport Audit — sursa unica

> **Autoritate:** daca codul si acest fisier se contrazic, castiga acest fisier
> (sau schimbam fisierul explicit, nu codul pe furis).
> **Se citeste INAINTE** de a atinge raportul: `components/report-renderer.tsx`,
> `lib/audit-engine.ts`, `lib/css-detect.ts`.
> **Last update:** 2026-09-23 — the cold audit analyses the site only: two rubrics, SEO and UX/UI (operator decision). Tracking, Google Ads and the revenue simulation are removed; see `docs/superpowers/specs/2026-09-23-site-audit-only-design.md`. <!-- LANG: pending full translation to EN -->

---

## 1. Scop (de ce)

Raport de audit pentru un **prospect ecom netehnic**. E instrument de **vanzare**, nu document tehnic.
- **RECE** (lead-magnet): pornind DOAR de la URL, fara acces la cont. Superficial, cat sa agate.
- Se vede **public** -> onestitate: nu marca "lipsa" ce nu putem confirma.
- Fiecare problema in limbaj de client (clienti pierduti / bani / loc in Google), nu jargon.
- Se termina cu **CTA Devrika**.

**Scope: ECOM-ONLY (all-in).** Auditul, **landing-ul si toata comunicarea** sunt orientate 100% pe magazine online — Devrika merge all-in pe ecom. Non-ecom **nu** e acoperit: nu construim varianta separata. Un URL non-ecom primeste un raport degradat (fara rubrica Google Ads, tracking doar din HTML) — acceptat, nu-l optimizam. Landing (`app/audit-seo`) + copy + CTA = mesaj ecom.

**Strategic principle (2026-09-23):** the report shows what is wrong on the site itself — how Google finds the pages and how easily a visitor buys. Findings lead to fixing the site (SEO, speed, category and product pages); the report does not sell ads services.

> The landing page and the funnel stay neutral and diagnostic; the CTA lives in the report.

## 2. Doua moduri

| | RECE (lead-magnet) | CALD (intern) |
|---|---|---|
| Cand | prospect, fara acces | client care ne-a dat acces la conturi |
| Input | doar URL | URL + Google Ads / Meta / GA4 / GSC / GMC |
| Iesire | `/r/<id>` (+ PDF) | `/cald/<slug>` (+ PDF) |

Detaliile de orchestrare: `skill/SKILL.md`. Acest spec descrie **structura raportului RECE** (partea 3-8) si **leaga** partea CALD (partea 9).

---

## 3. Cold report structure: EXACTLY 2 rubrics, in order

### 3.1 SEO
**5 sub-sectiuni** (definite de Vlad):
1. **SEO Tehnic (On-page):** Title, Meta description, H1, Canonical, structura URL
2. **Calitatea Continutului:** text subtire, duplicat, ierarhie H2/H3, lizibilitate, keyword principal
3. **Analiza Cuvinte Cheie:** kw in title/H1/URL, acoperire categorii, canibalizare
4. **Structura Site-ului:** robots.txt + crawlere AI, sitemap, breadcrumbs, linkuri rupte, internal linking
5. **Schema Markup:** JSON-LD, tipuri, validare, breadcrumb, rating
**Verificat pe** home + categorii + produse.
**Product pages (2026-09-23):** a card at the top of the rubric reports, from the product pages actually read, how many have short or generic titles and how many lack a meta description (`computeProductSignal`, `ProductContentCard`); when no product page was read it says "de verificat", never a generic claim.
**Cod:** `computeSeoChecks/Continut/Keywords/Structura` + `computeSchemaChecks`; render `SectionBlock` x5.

### 3.2 UX / UI
**Campuri (fix acestea, 5 — decis 2026-07-01):**
1. **Viteza** — scor de incarcare pe mobil
2. **Analiza homepage** — hero/mesaj clar, meniu + categorii vizibile, cale spre produse, mobil OK
3. **Analiza pagina categorie** — grila produse (poza+pret), breadcrumbs, paginare, text intro categorie
4. **Analiza pagina produs** — imagini multiple, pret+stoc, "Adauga in cos", descriere, recenzii, produse similare
5. **Filtre & sortare** — marime / culoare / pret / brand + optiuni de sortare
Fiecare camp: status bun/partial/slab (necunoscut cand tipul de pagina lipseste din crawl, exclus din medie) + semnale gasit/lipsa in limbaj de client. Scor rubrica = media campurilor cu status != necunoscut.
**Cod:** `lib/audit-engine.ts` (`computeUxAudit` + detectori) -> `UxAudit`/`UxField` in `lib/types.ts`; render `UxCard`/`UxUiSection` (`components/report-renderer.tsx`). ✅ construit.

## 4. EXCLUS explicit (NU apar in raport)

- **Incredere** (recenzii / politici / plata) ca sectiune
- **Functii magazin** ca sectiune separata (semnalele utile de UX intra in UX/UI)
- **Cos & checkout** ca sectiune
- Sectiunea veche **"Bani pierduti din site si reclame"** pe zone
- **"Top probleme"** (mix pe toate zonele)
- **"Raportul complet"** pe 8 zone
- **social** / **securitate** ca sectiuni de sine statatoare
- **Tracking** (GA4, Google Ads conversions, Meta/TikTok pixels, Consent Mode) — removed 2026-09-23
- **Google Ads** (CSS, Shopping, price position, brand defence, Google Business reviews) — removed 2026-09-23
- **Revenue simulation** and the funnel questions that fed it — removed 2026-09-23

## 5. Reguli / invariante

1. **Nu putem confirma -> "de verificat", NICIODATA "lipsa".** Universal, la toate campurile (adoptat ca default).
2. **Fara diacritice** in textele din raport (client-facing).
3. Fiecare problema tradusa in limbaj de client (durere + bani + loc in Google).
4. Se termina cu **CTA Devrika**.

## 6. Praguri verdict + scor

Scor per rubrica 0-100. Verdict: **>=70 Bun** (verde) · **>=40 De reglat** (galben) · **<40 Slab** (rosu). (decis 2026-07-02)

Scor per rubrica: SEO = media celor 5 sub-sectiuni; UX/UI = media celor 5 campuri (viteza + 3 tipuri de pagini + filtre).

**Scor global (gauge hero) — 2026-07-07:** doar componentele VIZIBILE in raport (`computeOverallScore`: viteza 0.17 + seo 0.24 + continut 0.20 + keywords 0.16 + structura 0.13 + schema 0.10 = 1.00). Social + securitate **NU** intra in nota (nu-s rubrici, §4) — inainte ponderau 10% ascuns; scoase ca nota sa reflecte exact ce se afiseaza. (`social`/`securitate` raman calculate in `checksRezultate` dar neafisate — cod mort inofensiv.)

## 7. Persuasion wrapper (fixed, outside the 2 rubrics)

Hero (domain + overall score gauge) · "Ce te costa asta" · "De ce Devrika" · CTA + contact. The CTA speaks about fixing the site.

## 8. Parametri de detectie

- **Pages analysed (2026-09-23):** budget 60 including the homepage, target at least 50 (`PAGE_BUDGET`, `MIN_PAGES`). The pages that sell come first, never sitemap order: 15 categories + 35 products + at most 5 other pages; unused space goes to products, then categories, then other. Child sitemaps are typed by name (product / category / other), products are sampled evenly across the catalogue, and a page counts as a product only by its content; a category-sitemap URL stays a category. Code: `lib/page-selection.ts`. Design: `docs/superpowers/specs/2026-09-23-site-audit-page-selection-design.md`.
- **Platform reading profiles (2026-09-23):** the platform is detected from the homepage first; its curated profile (`lib/platform-knowledge/<platform>.json`: sitemap entry points, sitemap and URL signals per page type, site-language sitemaps, polite concurrency, traps, observed problems) decides how the site is read. Unknown platforms use `generic.json`. Dead pages (404) are replaced by untried URLs of the same type. Shops that refuse the server (homepage 403/challenge, or 30%+ of pages 403/429) are read through the BrightData browser (`lib/browser-fetch.ts`); page fetching is bounded to 30 s (`PAGE_FETCH_BUDGET_MS`). Design: `docs/superpowers/specs/2026-09-23-platform-knowledge-base-design.md`.
- **BrightData browser:** used only to read shops that refuse the server (see Platform reading profiles below).
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

## 11. Landing + funnel (cold) — updated 2026-09-23

**Tone: neutral, diagnostic.** The landing page (`app/audit-seo`) presents two areas, SEO and UX/UI, as interactive cards; no revenue simulation.
**Funnel (`app/start`):** URL → quick scan (platform, shop or not) → "here is what we found" card → 2 steps: what worries you (site-related options only) and contact. The full audit runs in the background from the scan.

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

---

## 13. Cancelled 2026-09-23 — tracking health and consent indicator

The cold audit no longer covers tracking (section 4).
