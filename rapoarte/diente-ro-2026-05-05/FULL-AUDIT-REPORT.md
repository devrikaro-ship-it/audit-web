# Audit SEO Complet — diente.ro
**Data:** 5 Mai 2026  
**Platforma:** WordPress + WooCommerce + Elementor (tema XStore) + Rank Math PRO  
**Business real detectat:** Magazin online B2B de instrumentar si materiale dentare (Medic Up SRL / brand Puria)  
**Domeniu inregistrat:** Ianuarie 2026 (~4 luni vechime)

---

## SCOR GENERAL SEO: 27 / 100

| Categorie | Pondere | Scor | Contributie |
|-----------|---------|------|-------------|
| Technical SEO | 22% | 28/100 | 6.2 |
| Content Quality | 23% | 25/100 | 5.8 |
| On-Page SEO | 20% | 20/100 | 4.0 |
| Schema / Structured Data | 10% | 30/100 | 3.0 |
| Performance (CWV) | 10% | 30/100 | 3.0 |
| AI Search Readiness | 10% | 31/100 | 3.1 |
| Imagini | 5% | 40/100 | 2.0 |
| **TOTAL** | **100%** | | **27/100** |

---

## CLARIFICARE CRITICA DE CONTEXT

**diente.ro nu este o clinica dentara.** Este un magazin WooCommerce B2B care vinde instrumentar si materiale dentare catre medici stomatologi si cabinete dentare. Operatorul este Medic Up SRL (CUI 46581947), brandul comercial este "Puria".

Aceasta distinctie schimba fundamental strategia SEO:
- Keyword-urile B2C (clinica dentara, implant dentar, stomatologie sector 2) sunt **inaccesibile structural** — Google nu va servi un magazin de instrumente chirurgicale unui pacient care cauta un dentist.
- Audienta corecta: medici stomatologi, chirurgi OMF, administratori de clinici.
- Scorul SXO fata de keyword-uri B2C: 9/100. Scorul SXO fata de audienta B2B reala: 40/100.

---

## TOP 5 PROBLEME CRITICE

### 1. SITE COMPLET BLOCAT DE LA INDEXARE
**Severitate: CRITICAL | Impact: Elimina orice vizibilitate in Google**

Fiecare pagina a site-ului contine:
```html
<meta name="robots" content="nofollow, noindex"/>
```
Site-ul nu apare in Google. `site:diente.ro` = 0 rezultate. Common Crawl nu are nicio captura. Niciun backlink nu produce efect SEO in aceasta stare.

**Cauza probabila:** Setare din Rank Math (Search Engine Visibility dezactivata) sau WordPress > Settings > Reading "Discourage search engines" ramas bifat din perioada de dev.

**Fix (5 minute):** Rank Math > General Settings > dezactiveaza "Noindex Entire Site" SAU WordPress > Settings > Reading > debifezi "Discourage search engines from indexing this site".

---

### 2. robots.txt SITEMAP POINTEAZA CATRE UN ALT DOMENIU
**Severitate: CRITICAL | Impact: Crawlerii urmaresc sitemapul unui site strain**

Continut actual `/robots.txt`:
```
Sitemap: https://brisa.ro/sitemap_index.xml
```
Sitemapul real al diente.ro este la `https://diente.ro/sitemap_index.xml` si contine ~990 URL-uri valide. Artefact dintr-o migrare sau template copiat de pe alta instalare WordPress de pe acelasi server.

**Fix:** Schimba linia Sitemap in robots.txt la `https://diente.ro/sitemap_index.xml`.

---

### 3. ORGANIZATIA IN SCHEMA DECLARA UN ALT DOMENIU (puria.ro)
**Severitate: CRITICAL | Impact: Google nu poate asocia schema cu diente.ro**

In JSON-LD de pe toate paginile:
```json
{"@type":"Organization","name":"Puria","url":"https://puria.ro/","email":"contact@puria.ro"}
```
BreadcrumbList item 1 pointeaza de asemenea la `puria.ro`. Logoul din schema vine de pe `puria.ro`. Google Knowledge Panel si semnalele E-E-A-T sunt atribuite altui domeniu.

**Fix:** In Rank Math > Titluri & Meta > Knowledge Graph: schimba URL organization la `https://diente.ro/`, numele la "Diente.ro", email la `contact@diente.ro`.

---

### 4. WP REST API EXPUNE DATE ADMIN
**Severitate: CRITICAL (Securitate) | Impact: Faciliteaza atacuri brute-force**

`https://diente.ro/wp-json/wp/v2/users` returneaza HTTP 200:
```json
[{"id":1,"name":"ginel","slug":"ginel","is_super_admin":true,"url":"https://veryfix.agentweb.ro",...}]
```
Username-ul admin (`ginel`), ID (1), statut super_admin si URL personal sunt publice.

**Fix:** Adauga in `functions.php`:
```php
add_filter('rest_endpoints', function($endpoints) {
    unset($endpoints['/wp/v2/users']);
    unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    return $endpoints;
});
```

---

### 5. COOKIE BANNER BLOCHEAZA 55% DIN ECRANUL MOBILE
**Severitate: CRITICAL | Impact: Penalizare Google pentru interstitiale intruzive**

Pe mobile (390px), cookie banner-ul Consent Magic Pro v5 ocupa ~55% din ecranul util imediat dupa incarcare, blocheaza orice continut. Google penalizeaza explicit interstitialele care blocheaza continutul pe mobil.

**Fix:** Limiteaza cookie banner-ul la un banner mic la baza ecranului (max 20% inaltime) sau la un overlay care nu blocheaza continutul principal.

---

## PROBLEME HIGH

### 6. TTFB 1.498 secunde (Target < 600ms)
Serverul LiteSpeed raspunde in 1.5s. Cache-ul LiteSpeed (LSCWP) pare neconfigurat. Direct impact pe LCP.

**Fix:** Activeaza LiteSpeed Cache > Page Cache. Verifica daca cache-ul nu e dezactivat pentru utilizatori neautentificati.

### 7. 44 FISIERE CSS + JQUERY RENDER-BLOCKING IN HEAD
44 de tag-uri `<link rel="stylesheet">` in head, incluzand 4 apeluri separate la Google Fonts. jQuery si 4 scripturi PixelYourSite incarcate sincron fara `defer`.

**Fix:** In Rank Math sau LiteSpeed Cache: defer JavaScript. Consolideaza Google Fonts intr-un singur request. Activeaza CSS Critical Path.

### 8. IMAGINEA HERO CA CSS BACKGROUND-IMAGE (LCP slab)
Sliderul Elementor foloseste `background-image` inline. Browser-ul nu poate prioritiza imaginea prin preload scanner. Nu exista `<link rel="preload">` pentru hero.

**Fix:** Adauga in `<head>`:
```html
<link rel="preload" as="image" href="URL-imagine-hero">
```

### 9. OG:IMAGE LIPSA PE TOATE PAGINILE
Cand se distribuie linkul pe Facebook, WhatsApp, LinkedIn, nu apare nicio imagine. Afecteaza direct rata de click din social media.

**Fix:** Seteaza in Rank Math o imagine OG default de 1200x630px. Adauga imagine specifica per pagina.

### 10. SECURITY HEADERS ABSENTE
Lipsesc: HSTS, Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy. Riscuri: clickjacking, XSS, interceptare conexiuni.

**Fix minim in .htaccess:**
```
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

### 11. CANONICAL TAG LIPSA PE TOATE PAGINILE
Rank Math nu genereaza canonical din cauza noindex global. Dupa rezolvarea noindex, verificati generarea canonicalului.

### 12. TAP TARGETS SUB 44PX PE MOBILE
Linkurile din meniul de categorii au inaltimea de 25px. Contul si cosul sunt 32x32px. Sub pragul recomandat Google de 44x44px.

---

## PROBLEME MEDIUM

### 13. ZERO TEXT EDITORIAL PE PAGINILE DE CATEGORIE
Paginile de categorie (ex: `/instrumentar/`, `/endodontie-2/`) contin doar grila de produse. Zero paragrafe, zero context, zero text crawlabil si citat. Google nu poate determina topicul paginii din continut.

**Fix:** Minim 150-200 cuvinte introductive pe fiecare pagina de categorie. Ex: "Instrumentar chirurgical dentar profesional — ce include, pentru ce specialitate, branduri disponibile."

### 14. NICIO SECTIUNE FAQ PE NICIO PAGINA
FAQ-urile sunt cel mai eficient format pentru citare AI si featured snippets. Nicio pagina nu are FAQ.

**Fix:** Adauga FAQ pe homepage si /despre-noi/ cu intrebari reale: "Livrati catre cabinete individuale?", "Cat dureaza livrarea?", "Ce branduri distribuiti?".

### 15. SCHEMA ERRORS: availability SI itemCondition INCORECTE
```json
"availability": "http://schema.org/InStock"  // trebuie https://
"itemCondition": "NewCondition"              // trebuie https://schema.org/NewCondition
```
Afecteaza toate paginile de produs.

### 16. PRODUCT SCHEMA FARA brand, mpn, gtin
Produsele KOHLER Dental, NSK, ZimVie etc. nu au `brand`, `mpn` sau `gtin13` in schema. Proprietati recomandate Google pentru Product rich results si Shopping Graph.

### 17. Article TYPE PE HOMEPAGE (semantic gresit)
Homepage-ul unui magazin WooCommerce primeste `@type: Article`. Tipul corect este `WebPage` sau `CollectionPage`.

### 18. PERSON "ginel" EXPUS IN SCHEMA PUBLICA
Schema `@type: Person` cu `name: "ginel"` si `sameAs: "https://veryfix.agentweb.ro"` apare pe homepage. Expune date de cont WordPress intern.

### 19. TEXT TRUNCHIAT IN SLIDER PE MOBILE
Headline-ul hero este taiat la stanga pe 390px — textul "Adeziv oral care accelereaza vindecarea..." nu incape in viewport.

### 20. LIPSA llms.txt
`/llms.txt` returneaza 404. Standard emergent pentru declararea intentiei fata de modelele AI. Recomandat pentru un distribuitor B2B care vrea sa fie citat ca sursa.

### 21. NICIO REGULA SPECIFICA LLM IN robots.txt
GPTBot, ClaudeBot, PerplexityBot, CCBot sunt permisi implicit. Daca nu se doreste ca produsele sa fie folosite pentru antrenarea modelelor AI, trebuie reguli explicite de blocare.

### 22. INDEXNOW NEIMPLEMENTAT
Rank Math PRO include suport IndexNow — neactivat. Impact minor, dar usor de activat.

### 23. SSL EXPIRA 16 IULIE 2026
Certificat Let's Encrypt valid inca 2.5 luni. Verifica auto-renewal configurat corect.

---

## PROBLEME LOW

### 24. DOMENIU NOU — 4 LUNI VECHIME (Ian 2026)
Google acorda autoritate incremental in timp. Factorul nu se poate grabi, dar continuitatea si acumularea de backlink-uri ajuta.

### 25. ZERO BLOG / CONTINUT EDITORIAL
Nicio sectiune de articole in sitemap. Raportul editorial:produs este extrem de dezechilibrat (5 pagini statice vs ~990 produse).

### 26. BRANDURI LISTATE FARA LINKURI CATRE PRODUCATORI
Pagina /branduri/ listeaza KOHLER, ZimVie, B.Braun etc. dar fara linkuri catre site-urile producatorilor. Oportunitate rata de link building reciproc.

### 27. CONFUZIE DE BRAND: "Puria" vs "diente.ro"
`og:site_name`, schema `Organization.name`, logo-ul in schema — toate declara "Puria" / "puria.ro". Domeniu este diente.ro. Google si modelele AI nu pot consolida entitatea.

---

## ANALIZA SPECIFICA PE DOMENII

### Technical SEO: 28/100
- Crawlabilitate: 5/20 (noindex global)
- Indexabilitate: 0/20
- Securitate: 10/15 (HTTPS OK, headers lipsa)
- URL Structure: 12/15 (URL-uri curate in romana)
- Mobile: 8/10 (viewport corect, cookie banner problema)
- Core Web Vitals: 5/10 (TTFB 1.498s, render-blocking)

### Schema Markup: 30/100
- Prezent prin Rank Math (JSON-LD generat automat)
- Erori critice: Organization.url si BreadcrumbList item1 pointeaza la puria.ro
- availability si itemCondition cu valori incomplete
- Lipseste: brand pe produse, postalCode, telephone direct pe Organization
- Oportunitate mare: FAQPage, ItemList pe categorii

### GEO / AI Readiness: 31/100
- AI crawlers: permisi implicit (nu explicit) — acceptabil
- llms.txt: absent
- Citabilitate: 18/100 — cel mai slab punct
- Zero text editorial pe categorii (paginile cu cel mai mult trafic potential)
- Zero FAQ
- Structura SSR (WordPress) = avantaj pentru crawlare AI

### Local SEO: 18/100
- GBP: zero semnale detectate pe site
- Recenzii: zero
- NAP: inconsistent (adresa lipseste din homepage, format diferit pe /contact vs /despre-noi)
- Schema LocalBusiness: absent
- Adresa fizica: Str. Nuferilor 16A, Rosu, Ilfov (apartament, nu spatiu comercial)

### SXO: 9/100 (vs keywords B2C) / 40/100 (vs audienta B2B reala)
- Mismatch absolut fata de keyword-urile B2C (clinica, dentist, implant)
- UX functional pentru B2B: add-to-cart, WhatsApp, livrare gratuita >600 lei
- Zero trust signals pentru pacienti (fara medici, fara recenzii pacienti)

### Backlinks: INSUFFICIENT DATA
- Common Crawl: zero capturi (probabil cauzat de noindex)
- Domeniu: 4 luni vechime
- Outbound: ANPC, SAL, EC Europa (obligatii legale), devrika.ro, puria.ro

---

## SITEMAP — STRUCTURA

| Fisier | URL-uri |
|--------|---------|
| product-sitemap1.xml | 201 |
| product-sitemap2.xml | 200 |
| product-sitemap3.xml | 200 |
| product-sitemap4.xml | 200 |
| product-sitemap5.xml | 49 |
| product_cat-sitemap.xml | 135 categorii |
| page-sitemap.xml | 5 pagini |
| **Total** | **~990 URL-uri** |

Toate URL-urile au `<lastmod>`. Sitemapul XML este valid. Problema: nu e declarat corect in robots.txt.

---

## DATE VIZUALE (Screenshots)

Screenshots salvate in `/Users/VladMoloso/seo-audit/screenshots/`:
- `diente_desktop.png` — 1280x800
- `diente_mobile.png` — 390x844

Above-the-fold desktop: slider cu produs specific, fara propozitie de valoare globala, fara telefon vizibil.
Above-the-fold mobile: cookie banner ocupa 55% ecran, textul slider trunchiat.
