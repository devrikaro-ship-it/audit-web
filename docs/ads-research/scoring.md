# Scoring — cum dai scorurile (0-100)

Scop: scoruri **credibile si consistente** intre clienti. Nu sunt exacte stiintific, dar trebuie sa reflecte realitatea din crawl.

## Categorii + pondere (scor global)
| Categorie | Pondere | Ce masoara |
|-----------|---------|-----------|
| SEO Tehnic | 25% | robots, sitemap, canonical, HTTPS/www, indexare, securitate |
| Continut | 23% | title/meta/H1, descrieri categorii, E-E-A-T, thin content |
| Google Ads / Shopping | 22% | feed, schema produs+pret, reviews, Shopping/PMax, CSS, competitie |
| Viteza & Mobil | 15% | CWV/PSI, greutate HTML, WebP, viewport |
| Schema / Rich results | 15% | Product, Organization, LocalBusiness, Breadcrumb, reviews |

Scor global = suma ponderata. Rotunjeste.

## Bareme rapide (porneste de la 100, scazi)
**SEO Tehnic** — -25 sitemap rupt/404; -20 www duplicat 200 sau **noindex pe homepage**; -15 filtre indexabile sau **broken links multe**; -10 fara canonical; -10 **security headers lipsa** (HSTS/CSP/X-Frame); -5 robots gresit; -5 hreflang lipsa la site multi-limba.
**Continut** — -20 H1 lipsa homepage; -15 meta desc lipsa pagini cheie; -15 zero reviews; -12 descrieri categorii lipsa; -10 **readability slaba** (propozitii lungi) sau **structura H2 lipsa**; -8 title-uri slabe.
**Google Ads/Shopping** — -25 nu ruleaza deloc Ads (oportunitate, dar scor mic = durere); -20 fara feed/Shopping; -15 fara reviews (zero stele Shopping); -15 **fara segmentare produse** (buget pe Villains/Zombies — penalizeaza MEREU daca nu exista sistem); -12 titluri produs neoptimizate; -10 **fara CSS** ("By Google Shopping" = CPC mai mare); -10 multe produse OutOfStock.
**Tracking & masurare** (intra in scorul Ads — fara masurare, reclamele se optimizeaza pe orb) — -15 **fara Google Ads conversion tag** (AW-); -12 **fara Meta Pixel** (la ecom care da/ar da social ads); -10 fara GA4; -10 **CAPI nedetectat** (marcat de verificat, penalizare usoara); -8 fara Consent Mode v2 (date UE pierdute); -5 UA- depreciat inca prezent. Daca GTM e prezent dar pixelii nu apar in sursa, NU penaliza orb — marcheaza "de confirmat live".
**Viteza & Mobil** — -25 PSI <40 sau HTML >800KB; -15 TTFB >1s; -10 fara WebP; -8 fonturi render-blocking.
**Schema** — -30 fara Product; -20 fara reviews/AggregateRating; -15 fara LocalBusiness (la local); -10 fara Breadcrumb; -10 @context http.

## Culori bara (in raport)
- rosu `#C0392B` → scor < 40
- portocaliu `#D45B00` → 40-69
- verde `#1A7A4A` → 70+

## Scor tinta (pt pagina de plan)
Pune un orizont realist (90 zile): de obicei +25 pana la +35 fata de scorul curent, fara sa depasesti ~80 (credibil).

## Nota lead-gen
Un scor prea mare nu vinde. Daca site-ul chiar e bun (75+), muta accentul pe **oportunitatea Ads/Shopping** si crestere, nu pe "e stricat".
