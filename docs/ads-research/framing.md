# Framing — cum scrii ca sa agati clientul

> Dictionar de traducere tehnic → client, valabil in **ambele** cai (web + fallback Python). Structura raportului RECE ramane cea din `../AUDIT-SPEC.md` (4 rubrici); aici e doar *cum formulezi* fiecare finding.

Raportul e instrument de **vanzare**, nu document tehnic. Decidentul e netehnic (proprietar de business).

## Regula de aur
Fiecare problema se traduce in **una din astea 3**, niciodata jargon gol:
- **Clienti pierduti** ("nu te gasesc oamenii care cauta exact ce vinzi")
- **Bani irositi / lasati pe masa** ("platesti mai mult pe click decat ar trebui")
- **Locul in Google / increderea** ("competitia apare deasupra ta")

## Tipare de traducere (tehnic ➜ client)
| Tehnic | Ce inseamna pentru tine (in raport) |
|--------|-------------------------------------|
| Product schema lipsa | "Produsele tale nu apar in Google cu pret si stele — clientul da click la competitor" |
| Fara reviews/AggregateRating | "Fara stele langa produs in Google, lumea are mai putina incredere si cumpara de la altul" |
| ~48% produse OutOfStock indexate | "Jumatate din paginile tale arata 'stoc epuizat' clientilor care vin din Google" |
| TTFB lent / HTML greu | "Site-ul se incarca greu, iar 1 din 2 vizitatori pleaca inainte sa vada produsul" |
| Meta description lipsa | "Google scrie singur textul din rezultate — de multe ori prost — si pierzi click-uri" |
| Fara feed Shopping optimizat | "Nu aparti in Google Shopping unde cumparatorii compara preturi gata sa cumpere" |
| Fara CSS pe Shopping (vezi "By Google Shopping") | "Platesti pana la 20% mai mult pe fiecare click decat e nevoie — competitia pe CSS plateste mai putin pe aceeasi pozitie" |
| Fara segmentare produse (mereu) | "Bugetul se duce egal pe tot catalogul, inclusiv pe produsele care nu vand niciodata (Villains/Zombies). Banii pleaca pe ce nu aduce comenzi." |
| Security headers lipsa (HSTS/CSP) | "Site-ul nu are protectiile standard de securitate — risc pentru date si un semnal de incredere mai slab pentru Google" |
| Broken links (404) | "Ai linkuri care duc in pagini moarte — clientul se loveste de erori, iar Google iroseste timp pe ele" |
| Propozitii lungi / fara structura | "Textul e greu de citit si de inteles, si mai greu de citat de Google AI / ChatGPT — pierzi vizibilitate in raspunsurile AI" |
| Fara FAQ / liste / paragrafe scurte | "Continutul nu e usor de extras de motoarele AI — concurentii cu raspunsuri clare sunt citati, tu nu" |
| Meta Pixel lipsa | "Daca dai reclame pe Facebook/Instagram, nu masori ce vand — optimizezi pe orb si arzi buget" |
| Meta CAPI (de verificat) | "Fara partea server-side, pierzi 10-30% din conversiile masurate dupa iOS 14 — reclamele par mai slabe decat sunt" |
| Google Ads conversion tag lipsa | "Google nu stie ce reclama aduce vanzari — nu poate optimiza spre cumparatori, doar spre click-uri ieftine" |
| GA4 lipsa | "Nu vezi de unde vin clientii si ce pagini vand — decizi din burta, nu din date" |
| Consent Mode v2 lipsa | "Fara consimtamant configurat corect, pierzi date de conversie in UE si risti probleme GDPR" |
| Nu ruleaza reclame Meta (Ad Library 0) | "Canalul cu cel mai mare volum pentru magazine online e neatins — competitorul ruleaza N reclame, tu 0" |

## Estimare bani (cifra grosiera, MEREU marcata estimare)
Decidentul vrea un NUMAR. Da unul, dar onest — marcat "estimativ", din semnale, nu din contul lor:
- **CPC mai mare fara CSS**: "fara CSS platesti pana la ~20% mai mult pe click — la un buget de X lei/luna, ~0.2X lei se duc degeaba." (X = il intrebi sau pui un interval "ex. la 5.000 lei/luna = ~1.000 lei").
- **Buget pe Villains/Zombies**: "tipic 20-40% din bugetul de Shopping merge pe produse care nu vand — la X lei, sunt Y lei recuperabili."
- **Conversii pierdute fara CAPI/tracking**: "10-30% din conversii nemasurate = optimizare proasta = buget irosit, nu doar raportare."
- NU inventa spend-ul lor. Foloseste intervale ("la un buget tipic de...") sau lasa loc de completat la discutie.

## Ton
- Direct, simplu, fraze scurte. Zero abrevieri neexplicate.
- Creeaza urgenta, dar fara minciuni. Cifrele = reale din crawl. Estimari = marcate ca estimari.
- Arata cateva **castiguri rapide** (sub 1 zi) ca momeala: "se rezolva azi, iti aduce X".
- Inchide mereu cu CTA Devrika: prima discutie gratuita.

## Ce NU faci
- Nu inventa date din contul de Ads/GMC (nu le ai).
- Nu promite pozitii garantate in Google.
- Nu inghesui 30 de probleme — alege 5-9 SEO + 3-6 Ads, cele cu impact maxim.
- Fara diacritice in textul final.
