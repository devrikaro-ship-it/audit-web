# Plan de Actiune — diente.ro
**Data:** 5 Mai 2026 | **Scor curent:** 27/100 | **Target 90 zile:** 55/100

---

## CRITICAL — Fix imediat (aceasta saptamana)

### C1. Dezactiveaza noindex global
**Timp:** 5 minute | **Impact:** Elimina cel mai mare blocaj SEO posibil

Rank Math > General Settings > Search Engine Visibility > dezactiveaza "Noindex Entire Site"
SAU WordPress > Settings > Reading > debifezi "Discourage search engines from indexing this site".

Dupa fix: verifica cu Google Search Console > URL Inspection pe `/` ca pagina e indexabila.

---

### C2. Corecteaza robots.txt — Sitemap la domeniu gresit
**Timp:** 5 minute | **Impact:** Crawlerii vor urma sitemapul corect al diente.ro

In robots.txt, schimba:
```
Sitemap: https://brisa.ro/sitemap_index.xml
```
la:
```
Sitemap: https://diente.ro/sitemap_index.xml
```

---

### C3. Corecteaza Organization in Rank Math Knowledge Graph
**Timp:** 15 minute | **Impact:** Schema corecta, Knowledge Panel asociat diente.ro**

Rank Math > Titluri & Meta > Knowledge Graph:
- Organization Name: `Diente.ro`
- Organization URL: `https://diente.ro/`
- Organization Logo: upload logo diente.ro
- Email: `contact@diente.ro`
- Telefon: `+40751794106`

---

### C4. Blocheaza WP REST API users endpoint
**Timp:** 10 minute | **Impact:** Elimina expunere username admin**

In `functions.php` (child theme):
```php
add_filter('rest_endpoints', function($endpoints) {
    unset($endpoints['/wp/v2/users']);
    unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    return $endpoints;
});
```

---

### C5. Redimensioneaza cookie banner pe mobile
**Timp:** 30 minute | **Impact:** Elimina penalizare Google interstitiale**

In setarile Consent Magic Pro: limiteaza banner-ul la o bara fixa la baza ecranului, max 15% din inaltime. Nu popup full-screen pe mobile.

---

## HIGH — Saptamana 1-2

### H1. Activeaza LiteSpeed Page Cache
**Timp:** 30 minute | **Impact:** TTFB scade de la 1.498s la sub 600ms**

LiteSpeed Cache plugin > Page Cache > On. Testeaza cu curl: `curl -I https://diente.ro/ | grep x-cache`.

---

### H2. Adauga defer la scripturi si preload pentru hero
**Timp:** 1-2 ore | **Impact:** LCP imbunatatit semnificativ**

In LiteSpeed Cache > Page Optimization:
- JS Defer: On (exclude jquery-core-js daca e necesar)
- CSS Minify + Combine: On

Manual in `<head>`:
```html
<link rel="preload" as="image" href="URL-imagine-hero-slider">
```

---

### H3. Seteaza OG Image default si per pagina
**Timp:** 30 minute | **Impact:** Previzualizare corecta pe social media**

Rank Math > Titluri & Meta > Global Meta > Default Thumbnail: upload imagine 1200x630px reprezentativa.

---

### H4. Adauga Security Headers in .htaccess
**Timp:** 15 minute | **Impact:** Securitate, trust signals**

```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Content-Type-Options "nosniff"
```

---

### H5. Corecteaza schema Product — availability si itemCondition
**Timp:** 30 minute | **Impact:** Rich results eligibilitate**

In setarile WooCommerce Schema din Rank Math, sau cu un plugin custom:
- `availability` → `https://schema.org/InStock`
- `itemCondition` → `https://schema.org/NewCondition`

---

### H6. Adauga NAP in footer pe toate paginile
**Timp:** 30 minute | **Impact:** Consistenta NAP, Local SEO**

Footer: Medic Up SRL | Str. Nuferilor 16A, Bl.1, Et.3, Ap.21, Rosu, Ilfov 077042 | Tel: 0751 794 106 | Luni-Vineri 09:00-17:00

---

## MEDIUM — Saptamanile 2-4

### M1. Adauga text editorial pe paginile de categorie (prioritate mare)
**Timp:** 3-5 zile | **Impact:** Crawlabilitate, ranking pe keyword-uri de categorie, citabilitate AI**

Fiecare pagina de categorie: minim 150-200 cuvinte introductive. Structura:
- Ce include categoria (tipuri de produse)
- Pentru ce specialitate stomatologica
- Branduri disponibile
- Un link intern catre cel mai popular produs

Categorii prioritare: Instrumentar chirurgical, GBR / Regenerare osoasa, Endodontie, Implantologie.

---

### M2. Implementeaza FAQ pe homepage si /despre-noi/
**Timp:** 2-4 ore | **Impact:** Featured snippets, citabilitate AI, Google AI Overviews**

Intrebari sugerate:
- "Ce tipuri de instrumente dentare distribuiti?"
- "Livrati si catre cabinete individuale sau doar en-gros?"
- "Cat dureaza livrarea comenzilor?"
- "Ce branduri de instrumentar distribuie Diente.ro?"
- "Cum pot plati comanda?"

Adauga schema FAQPage prin Rank Math pe aceste sectiuni.

---

### M3. Adauga brand pe produse in schema
**Timp:** 2-3 ore (sau plugin) | **Impact:** Shopping Graph, Product rich results**

Fiecare produs are producatorul identificabil in titlu (KOHLER Dental, NSK, B.Braun, ZimVie). Adauga camp `brand` in schema Rank Math per produs.

---

### M4. Corecteaza Offer.availability si itemCondition global
**Timp:** 1 ora | **Impact:** Validare schema Google**

Verifica dupa fix cu Google Rich Results Test pe o pagina de produs.

---

### M5. Adauga LocalBusiness schema corecta
**Timp:** 1-2 ore | **Impact:** Google Knowledge Panel, Local SEO**

In Rank Math > Schema > Add New Schema > Local Business:
```
Type: MedicalSupply (sau LocalBusiness)
Name: Diente.ro — Medic Up SRL
Address: Str. Nuferilor 16A, Bl.1, Et.3, Ap.21, Rosu, Ilfov 077042
Telephone: +40751794106
OpeningHours: Mo-Fr 09:00-17:00
```

---

### M6. Inscrie diente.ro in directoare B2B relevante
**Timp:** 3-5 ore | **Impact:** Citari, Local SEO, backlink-uri**

- listafirme.ro (gratuit, CUI deja indexat automat)
- firmepenet.ro
- paginiaurii.ro
- medstom.ro (specific stomatologie)
- dentis.ro

NAP identic cu cel de pe site si viitorul GBP.

---

### M7. Creaza/revendica Google Business Profile
**Timp:** 1-2 zile (verificare Google) | **Impact:** Vizibilitate locala, Local Pack**

Categoria recomandata: "Furnizor de echipamente medicale" sau "Distribitor de echipamente stomatologice".
Adauga: program, descriere, poze sediu, produse principale.

---

### M8. Corecteaza tap targets pe mobile
**Timp:** 2-4 ore CSS | **Impact:** Mobile UX, Core Web Vitals**

Linkurile din meniu: `min-height: 44px`. Butoanele Cont si Cos: `min-width: 44px; min-height: 44px`.

---

### M9. Activeaza IndexNow
**Timp:** 5 minute | **Impact:** Indexare mai rapida in Bing/Yandex**

Rank Math > General > Others > IndexNow: On.

---

### M10. Creeaza /llms.txt
**Timp:** 30 minute | **Impact:** Semnalizare catre modele AI**

```
# Diente.ro — Distribuitor de instrumentar si materiale dentare profesionale
# Medic Up SRL, Romania

> Diente.ro este un distribuitor B2B de instrumentar si materiale dentare pentru clinici si cabinete stomatologice din Romania.

## Pagini recomandate pentru context AI
- https://diente.ro/despre-noi/
- https://diente.ro/branduri/
- https://diente.ro/magazin/
```

---

## LOW — Luna 2-3

### L1. Consolideaza apelurile Google Fonts
Inlocuieste 4 cereri separate cu un singur request care incarca toate fonturile.

### L2. Adauga linkuri catre producatorii distribuiti
In pagina /branduri/, adauga link extern catre site-ul fiecarui producator (KOHLER Dental, NSK, ZimVie). Oportunitate de link-building reciproc (link de distribuitor autorizat pe site-ul producatorului).

### L3. Corecteaza tip schema Article pe homepage
Rank Math > Titluri & Meta > Homepage > Schema Type: WebPage (nu Article).

### L4. Elimina Person "ginel" din schema publica
Rank Math > Titluri & Meta > Author > dezactiveaza afisarea author schema in public.

### L5. Verifica auto-renewal SSL (expira 16 Iulie 2026)
Acum: `echo | openssl s_client -connect diente.ro:443 2>/dev/null | openssl x509 -noout -dates`. Confirma ca Let's Encrypt auto-renewal e activ.

### L6. Creeaza pagina "Livrare in Romania"
Mentiona judetele si timpii de livrare. Captureaza cautari de tip "materiale dentare cu livrare [judet]".

### L7. Blog / Resurse pentru medici
Un singur articol pe luna pe teme relevante pentru stomatologi: "Ghid alegere freze dentare", "Comparatie materiale GBR", "Cum alegi un aparat de detartraj". Impact SEO cumulativ si E-E-A-T.

---

## PRIORITIZARE VIZUALA

```
SAPTAMANA 1
├── C1: noindex OFF ← cel mai important, 5 min
├── C2: robots.txt fix ← 5 min
├── C3: Rank Math Knowledge Graph ← 15 min
├── C4: Blocheaza /wp-json/wp/v2/users ← 10 min
├── C5: Cookie banner redimensionat ← 30 min
└── H1: LiteSpeed Cache activat ← 30 min

SAPTAMANA 2
├── H2: defer JS + preload hero
├── H3: OG Image default
├── H4: Security Headers
├── H5: Schema Product fix
└── H6: NAP in footer

SAPTAMANILE 3-4
├── M1: Text editorial categorii (prioritate 1)
├── M2: FAQ homepage + /despre-noi/
├── M3: brand pe produse schema
├── M5: LocalBusiness schema
└── M7: Google Business Profile

LUNA 2-3
├── M6: Directoare B2B
├── M8: Tap targets fix
├── L2: Linkuri producatori
└── L7: Incepe blog
```

---

## METRICI DE SUCCES (90 zile)

| Metric | Curent | Target |
|--------|--------|--------|
| Scor SEO global | 27/100 | 55/100 |
| Pagini indexate (GSC) | 0 | 500+ |
| TTFB | 1.498s | <600ms |
| Core Web Vitals (LCP) | necunoscut | <2.5s |
| Schema errors (Rich Results Test) | 5 erori critice | 0 |
| GEO Score | 31/100 | 55/100 |
| Local SEO Score | 18/100 | 45/100 |

Nota: Pana cand noindex nu este rezolvat, nicio alta optimizare nu produce efect vizibil in Google.
