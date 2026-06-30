export type Importanta = "critic" | "major" | "important";
export type Sectiune = "viteza" | "seo" | "continut" | "keywords" | "structura" | "schema" | "social" | "securitate";
export type StatusCheck = "ok" | "atentie" | "critic";

export interface Problem {
  id: string;
  label: string;
  sectiune: Sectiune;
  importanta: Importanta;
  problema: string;
  fix: string;
}

export interface CheckDef {
  id: string;
  label: string;
  sectiune: Sectiune;
  importanta: Importanta;
  descriereOk: string;
}

export const CHECKS: Record<string, CheckDef> = {
  // 1. Viteza & Core Web Vitals (5)
  pagespeed_mobile:   { id: "pagespeed_mobile",   label: "PageSpeed Mobile",       sectiune: "viteza",    importanta: "critic",    descriereOk: "Scor peste 90 — viteza excelenta pe telefon" },
  pagespeed_desktop:  { id: "pagespeed_desktop",   label: "PageSpeed Desktop",      sectiune: "viteza",    importanta: "major",     descriereOk: "Scor peste 90 — viteza excelenta pe calculator" },
  lcp:                { id: "lcp",                 label: "LCP — Continut principal",sectiune: "viteza",   importanta: "critic",    descriereOk: "Sub 2.5s — continutul principal apare rapid" },
  cls:                { id: "cls",                 label: "CLS — Stabilitate",      sectiune: "viteza",    importanta: "major",     descriereOk: "Sub 0.1 — elementele nu sar in timp ce se incarca" },
  inp:                { id: "inp",                 label: "INP — Reactivitate",     sectiune: "viteza",    importanta: "major",     descriereOk: "Sub 200ms — site-ul raspunde instant la click-uri" },

  // 2. SEO Tehnic (5)
  title_tag:          { id: "title_tag",           label: "Title Tag",              sectiune: "seo",       importanta: "critic",    descriereOk: "Titlu unic, 50-60 caractere, cu keyword principal" },
  meta_description:   { id: "meta_description",    label: "Meta Description",       sectiune: "seo",       importanta: "major",     descriereOk: "Descriere unica, 150-160 caractere, convingatoare" },
  h1:                 { id: "h1",                  label: "H1 — Titlu principal",   sectiune: "seo",       importanta: "critic",    descriereOk: "Exact un H1 per pagina, cu keyword principal" },
  canonical_tags:     { id: "canonical_tags",      label: "Tag Canonical",          sectiune: "seo",       importanta: "major",     descriereOk: "Canonical setat corect pe toate paginile" },
  url_structure:      { id: "url_structure",       label: "Structura URL",          sectiune: "seo",       importanta: "important", descriereOk: "URL-uri scurte, fara parametri inutili, SEO-friendly" },

  // 3. Calitatea Continutului (5)
  continut_subtire:   { id: "continut_subtire",    label: "Continut subtire",       sectiune: "continut",  importanta: "major",     descriereOk: "Paginile au minim 300 cuvinte de continut util" },
  pagini_duplicate:   { id: "pagini_duplicate",    label: "Pagini duplicate",       sectiune: "continut",  importanta: "major",     descriereOk: "Nu exista pagini cu continut identic sau similar" },
  structura_headings: { id: "structura_headings",  label: "Structura Headings",     sectiune: "continut",  importanta: "important", descriereOk: "H2, H3 folosite corect in ierarhie logica" },
  lizibilitate:       { id: "lizibilitate",        label: "Lizibilitate text",      sectiune: "continut",  importanta: "important", descriereOk: "Textul e clar, cu fraze scurte si paragraf aerisit" },
  cuvinte_cheie:      { id: "cuvinte_cheie",       label: "Folosire cuvinte cheie", sectiune: "continut",  importanta: "major",     descriereOk: "Keyword principal prezent in titlu, H1 si primele 100 cuvinte" },

  // 4. Analiza Cuvinte Cheie (5)
  kw_in_title:        { id: "kw_in_title",         label: "Keyword in Title Tag",   sectiune: "keywords",  importanta: "critic",    descriereOk: "Keyword principal prezent in title tag-ul tuturor paginilor tinta" },
  kw_in_h1:           { id: "kw_in_h1",            label: "Keyword in H1",          sectiune: "keywords",  importanta: "critic",    descriereOk: "Keyword principal prezent in H1-ul paginilor tinta" },
  kw_in_url:          { id: "kw_in_url",           label: "Keyword in URL",         sectiune: "keywords",  importanta: "major",     descriereOk: "URL-urile reflecta keyword-ul targetat — slug descriptiv" },
  kw_categorii:       { id: "kw_categorii",        label: "Kw acoperit de categorii",sectiune: "keywords", importanta: "major",     descriereOk: "Kw principale sunt acoperite de pagini de categorie dedicate" },
  kw_fara_canibalizare:{ id: "kw_fara_canibalizare",label: "Fara canibalizare kw",  sectiune: "keywords",  importanta: "important", descriereOk: "Fiecare keyword este targetat de o singura pagina principala" },

  // 5. Structura Site-ului (5)
  robots_llm:         { id: "robots_llm",          label: "robots.txt & LLM access",sectiune: "structura", importanta: "critic",    descriereOk: "robots.txt configurat corect, toti crawlerii importanti au acces" },
  sitemap_xml:        { id: "sitemap_xml",         label: "Sitemap XML",            sectiune: "structura", importanta: "critic",    descriereOk: "Sitemap valid, cu pagini importante si date lastmod" },
  breadcrumbs:        { id: "breadcrumbs",         label: "Breadcrumbs",            sectiune: "structura", importanta: "major",     descriereOk: "Breadcrumbs prezente pe paginile de categorie si produs" },
  broken_links:       { id: "broken_links",        label: "Linkuri broken",         sectiune: "structura", importanta: "major",     descriereOk: "Nicio pagina nu contine linkuri interne sau externe rupte" },
  internal_linking:   { id: "internal_linking",    label: "Internal linking",       sectiune: "structura", importanta: "major",     descriereOk: "Paginile importante primesc linkuri interne relevante" },

  // 6. Schema Markup (5)
  schema_markup:      { id: "schema_markup",       label: "Schema JSON-LD",         sectiune: "schema",    importanta: "major",     descriereOk: "Date structurate JSON-LD prezente" },
  schema_tipuri:      { id: "schema_tipuri",       label: "Tipuri schema potrivite",sectiune: "schema",    importanta: "important", descriereOk: "LocalBusiness, Product, Article sau FAQ prezente dupa caz" },
  schema_validare:    { id: "schema_validare",     label: "Schema fara erori",      sectiune: "schema",    importanta: "major",     descriereOk: "Schema valida — Google Rich Results Test trece fara erori" },
  schema_breadcrumbs: { id: "schema_breadcrumbs",  label: "Breadcrumb schema",      sectiune: "schema",    importanta: "important", descriereOk: "Breadcrumb JSON-LD prezent pentru navigare clara in Google" },
  schema_rating:      { id: "schema_rating",       label: "Rating / Review schema", sectiune: "schema",    importanta: "important", descriereOk: "AggregateRating prezent pe pagini de produse si servicii" },

  // 7. Social & OG Tags (5)
  og_tags:            { id: "og_tags",             label: "Open Graph titlu & desc",sectiune: "social",    importanta: "major",     descriereOk: "og:title si og:description prezente si completate" },
  og_image:           { id: "og_image",            label: "Imagine OG (1200x630)",  sectiune: "social",    importanta: "major",     descriereOk: "og:image prezenta, minim 1200x630px" },
  twitter_card:       { id: "twitter_card",        label: "Twitter / X Card",       sectiune: "social",    importanta: "important", descriereOk: "Meta tag-uri Twitter Card prezente pentru previzualizare corecta" },
  favicon:            { id: "favicon",             label: "Favicon",                sectiune: "social",    importanta: "important", descriereOk: "Favicon setat corect si vizibil in tab-ul browserului" },
  apple_icon:         { id: "apple_icon",          label: "Apple Touch Icon",       sectiune: "social",    importanta: "important", descriereOk: "apple-touch-icon prezent pentru shortcut-uri iOS" },

  // 8. Securitate (5)
  https:              { id: "https",               label: "HTTPS",                  sectiune: "securitate",importanta: "critic",    descriereOk: "Certificat SSL activ, toate paginile servite prin HTTPS" },
  imagini_alt:        { id: "imagini_alt",         label: "Imagini cu Alt Text",    sectiune: "securitate",importanta: "major",     descriereOk: "Toate imaginile au atribut alt descriptiv" },
  imagini_optimizate: { id: "imagini_optimizate",  label: "Imagini Optimizate",     sectiune: "securitate",importanta: "important", descriereOk: "Imagini comprimate si in format WebP" },
  hsts:               { id: "hsts",               label: "HSTS activ",             sectiune: "securitate",importanta: "major",     descriereOk: "HTTP Strict Transport Security forteaza HTTPS mereu" },
  security_headers:   { id: "security_headers",   label: "Headere de securitate",  sectiune: "securitate",importanta: "important", descriereOk: "X-Frame-Options, CSP si X-Content-Type-Options prezente" },
};

export const PROBLEMS: Record<string, Problem> = {
  // Viteza
  pagespeed_mobile_critic:  { id: "pagespeed_mobile_critic",  label: "Viteza mobil foarte slaba",         sectiune: "viteza",    importanta: "critic",    problema: "Site-ul se incarca foarte greu pe telefon (scor sub 50). Google penalizeaza direct aceste site-uri in rezultate, iar utilizatorii abandoneaza paginile care dureaza mai mult de 3 secunde.", fix: "Comprima toate imaginile si treci la WebP. Verifica daca hostingul are cache activ. Elimina scripturile JavaScript care blocheaza randarea." },
  pagespeed_mobile_slab:    { id: "pagespeed_mobile_slab",    label: "Viteza mobil medie",                sectiune: "viteza",    importanta: "major",     problema: "Scorul de viteza pe telefon e intre 50-89. Exista potential de imbunatatire care ar aduce mai mult trafic organic.", fix: "Comprima imaginile la sub 100KB, elimina scripturile JavaScript inutile si activeaza lazy loading." },
  pagespeed_desktop_slab:   { id: "pagespeed_desktop_slab",   label: "Viteza desktop medie",             sectiune: "viteza",    importanta: "major",     problema: "Scorul de viteza pe calculator e sub 90. Serverul sau codul sunt subdimensionate.", fix: "Activeaza caching la nivel de server, comprima CSS si JavaScript, si verifica daca serverul raspunde in sub 200ms." },
  lcp_critic:               { id: "lcp_critic",               label: "LCP slab",                         sectiune: "viteza",    importanta: "critic",    problema: "Cel mai mare element de pe pagina apare dupa mai mult de 4 secunde. Google considera asta o experienta proasta.", fix: "Adauga 'fetchpriority=high' imaginii principale. Asigura-te ca serverul raspunde in sub 600ms." },
  lcp_atentie:              { id: "lcp_atentie",              label: "LCP acceptabil dar imbunatatibil",  sectiune: "viteza",    importanta: "major",     problema: "Continutul principal apare intre 2.5s si 4s.", fix: "Preincarca imaginea principala cu <link rel='preload'>. Verifica ca serverul are CDN activ." },
  cls_critic:               { id: "cls_critic",               label: "Elemente care sar pe pagina",       sectiune: "viteza",    importanta: "major",     problema: "Elementele de pe pagina isi schimba pozitia in timp ce se incarca.", fix: "Adauga dimensiuni fixe (width si height) pe fiecare imagine si video." },
  inp_slab:                 { id: "inp_slab",                 label: "Site-ul raspunde lent la click-uri",sectiune: "viteza",    importanta: "major",     problema: "Cand utilizatorul da click, site-ul raspunde cu intarziere vizibila (peste 200ms).", fix: "Elimina sau incarca asincron scripturile JavaScript de la terti." },

  // SEO
  title_missing:            { id: "title_missing",            label: "Title tag lipsa",                  sectiune: "seo",       importanta: "critic",    problema: "Pagina nu are un titlu. In Google apare fie URL-ul, fie ceva generat automat.", fix: "Adauga un <title> unic pe fiecare pagina, 50-60 de caractere, cu keyword principal si numele firmei." },
  title_long:               { id: "title_long",               label: "Title tag prea lung",               sectiune: "seo",       importanta: "important", problema: "Titlul depaseste 60 de caractere si Google il taie cu '...' in rezultate.", fix: "Scurteaza titlul la 50-60 de caractere. Prioritizeaza keyword-ul principal la inceput." },
  meta_desc_missing:        { id: "meta_desc_missing",        label: "Meta description lipsa",            sectiune: "seo",       importanta: "major",     problema: "Nu exista o descriere pentru pagina. Google alege aleatoriu text din pagina.", fix: "Adauga o meta description de 150-160 caractere cu un call-to-action clar." },
  h1_missing:               { id: "h1_missing",               label: "H1 lipsa",                         sectiune: "seo",       importanta: "critic",    problema: "Pagina nu are un titlu principal H1. Google nu poate intelege subiectul central.", fix: "Adauga exact un H1 pe fiecare pagina cu cuvantul cheie principal." },
  h1_multiple:              { id: "h1_multiple",              label: "H1 multiple pe aceeasi pagina",     sectiune: "seo",       importanta: "major",     problema: "Exista mai mult de un H1 pe pagina. Google se asteapta la exact unul.", fix: "Pastreaza un singur H1 cu subiectul principal. Transforma restul in H2 sau H3." },
  canonical_missing:        { id: "canonical_missing",        label: "Tag canonical lipsa",               sectiune: "seo",       importanta: "major",     problema: "Paginile nu au tag canonical. Google poate indexa variante duplicate ale aceluiasi URL (cu/fara www, cu/fara slash).", fix: "Adauga <link rel='canonical' href='URL-canonical'> pe fiecare pagina. In WordPress, Yoast si Rank Math fac asta automat." },
  url_probleme:             { id: "url_probleme",             label: "URL-uri cu probleme SEO",           sectiune: "seo",       importanta: "important", problema: "URL-urile contin parametri, ID-uri numerice sau caractere speciale care le fac greu de inteles de Google si utilizatori.", fix: "Foloseste URL-uri scurte, cu cuvinte separate prin cratime: /servicii/implant-dentar in loc de /page?id=47." },

  // Continut
  continut_subtire_found:   { id: "continut_subtire_found",   label: "Pagini cu prea putin continut",     sectiune: "continut",  importanta: "major",     problema: "Unele pagini au sub 300 de cuvinte. Google le considera de calitate scazuta.", fix: "Adauga minim 300-500 de cuvinte relevante pe fiecare pagina importanta." },
  pagini_duplicate_found:   { id: "pagini_duplicate_found",   label: "Continut duplicat detectat",        sectiune: "continut",  importanta: "major",     problema: "Exista pagini cu continut identic sau foarte similar. Google alege doar una sa o indexeze.", fix: "Adauga tag canonical pe paginile duplicate sau unifica continutul intr-o singura pagina mai completa." },
  headings_dezordonate:     { id: "headings_dezordonate",     label: "Structura headings dezordonata",    sectiune: "continut",  importanta: "important", problema: "Titlurile H2, H3, H4 nu sunt in ordine logica sau lipsesc cu totul.", fix: "Structureaza continutul cu H2 pentru sectiunile principale si H3 pentru subsectiuni." },
  lizibilitate_slaba:       { id: "lizibilitate_slaba",       label: "Text greu de citit",                sectiune: "continut",  importanta: "important", problema: "Frazele sunt prea lungi sau textul e ingramadit fara spatiere. Utilizatorii abandoneaza paginile greu de scanat.", fix: "Foloseste fraze scurte (max 20 cuvinte), paragrafe de 3-4 randuri si liste cu bullet points pentru informatii enumerate." },
  cuvinte_cheie_lipsa:      { id: "cuvinte_cheie_lipsa",      label: "Keyword principal absent",          sectiune: "continut",  importanta: "major",     problema: "Cuvantul cheie principal nu apare in titlu, H1 sau primele 100 cuvinte. Google nu intelege despre ce e pagina.", fix: "Include keyword-ul principal in Title Tag, H1 si in primul paragraf al paginii. Nu exagera — o data per element." },

  // Keywords
  kw_title_lipsa:           { id: "kw_title_lipsa",           label: "Keyword absent din Title Tag",      sectiune: "keywords",  importanta: "critic",    problema: "Keyword-ul principal nu apare in title tag-ul paginii care il targeteaza. Google citeste title tag-ul primul cand decide relevanta pentru o interogare.", fix: "Rescrie title tag-ul sa inceapa cu keyword-ul principal. Formula recomandata: [Keyword] — [Beneficiu] | [Brand]." },
  kw_h1_lipsa:              { id: "kw_h1_lipsa",              label: "Keyword absent din H1",             sectiune: "keywords",  importanta: "critic",    problema: "Keyword-ul principal lipseste din H1-ul paginii tinta. H1 este al doilea cel mai important semnal on-page dupa title tag.", fix: "Rescrie H1-ul sa includa keyword-ul principal formulat natural. H1 nu trebuie sa fie identic cu title tag-ul — variaza formularea." },
  kw_url_slab:              { id: "kw_url_slab",              label: "Keyword absent din URL",            sectiune: "keywords",  importanta: "major",     problema: "URL-urile paginilor nu contin keyword-ul targetat. Un URL descriptiv ajuta Google sa inteleaga topicul paginii inainte sa o crawleze complet.", fix: "Restructureaza URL-urile sa contina keyword-ul: /servicii/implant-dentar in loc de /p?id=47. Adauga redirecturi 301 de la URL-urile vechi." },
  kw_categorie_lipsa:       { id: "kw_categorie_lipsa",       label: "Kw fara pagina de categorie",       sectiune: "keywords",  importanta: "major",     problema: "Kw cu volum mare nu au o pagina de categorie dedicata. Paginile de categorie acumuleaza autoritate de la linkurile interne si rankeaza mai bine pe kw de nisa.", fix: "Creeaza pagini de categorie pentru grupele principale de kw. Fiecare categorie trebuie sa aiba minim 500 cuvinte de continut propriu, nu doar lista de produse." },
  kw_canibalizare_found:    { id: "kw_canibalizare_found",    label: "Canibalizare de cuvinte cheie",     sectiune: "keywords",  importanta: "important", problema: "Mai multe pagini concureaza pe acelasi keyword. Google nu stie care sa o afiseze si fluctueaza intre ele, reducand pozitia ambelor.", fix: "Alege o pagina principala pentru fiecare keyword. Adauga canonical de la paginile secundare catre aceasta si diferentiaza continutul lor." },

  // Structura
  robots_llm_blocat:        { id: "robots_llm_blocat",        label: "LLM crawlere blocate in robots.txt",sectiune: "structura", importanta: "critic",    problema: "robots.txt blocheaza crawlerii LLM (GPTBot, ClaudeBot, PerplexityBot). Site-ul nu poate fi citat de ChatGPT, Claude sau Perplexity ca sursa in raspunsurile AI — pierdere de vizibilitate in noua cautare.", fix: "Adauga in robots.txt: User-agent: GPTBot\\nAllow: /\\nUser-agent: ClaudeBot\\nAllow: /\\nUser-agent: PerplexityBot\\nAllow: /. Verifica si OAI-SearchBot si Applebot." },
  robots_gresit:            { id: "robots_gresit",            label: "robots.txt configurat gresit",      sectiune: "structura", importanta: "critic",    problema: "robots.txt exista dar contine reguli gresite care blocheaza pagini importante din indexare sau lasa deschise pagini admin.", fix: "Verifica robots.txt cu Google Search Console > Inspectie URL. Blocheaza /wp-admin/, /cart, /checkout si asigura-te ca paginile importante sunt accesibile." },
  sitemap_invalid:          { id: "sitemap_invalid",          label: "Sitemap incomplet sau invalid",     sectiune: "structura", importanta: "critic",    problema: "Sitemap-ul lipseste, nu e valid XML sau nu contine paginile importante. Google nu stie ce pagini sa indexeze prioritar.", fix: "Genereaza un sitemap.xml valid care include toate paginile importante cu <lastmod> si <priority>. Trimite-l in Google Search Console." },
  breadcrumbs_lipsa_pagini: { id: "breadcrumbs_lipsa_pagini", label: "Breadcrumbs lipsa",                sectiune: "structura", importanta: "major",     problema: "Paginile nu au breadcrumbs vizibile sau schema BreadcrumbList. Breadcrumbs ajuta utilizatorii sa navigheze si Google sa inteleaga ierarhia site-ului.", fix: "Adauga breadcrumbs vizibile pe toate paginile de categorie si produs. In WordPress, Yoast si Rank Math genereaza automat si schema BreadcrumbList." },
  broken_links_gasite:      { id: "broken_links_gasite",      label: "Linkuri interne rupte",            sectiune: "structura", importanta: "major",     problema: "Pagini cu linkuri interne care duc catre URL-uri inexistente (404). Google interpreteaza asta ca semnal de calitate slaba si pierde autoritate la crawl.", fix: "Scaneaza site-ul cu Screaming Frog sau Ahrefs Site Audit. Redirectioneaza (301) sau corecteaza toate linkurile rupte." },
  internal_linking_slab:    { id: "internal_linking_slab",    label: "Internal linking slab",            sectiune: "structura", importanta: "major",     problema: "Paginile importante nu primesc linkuri interne de la alte pagini. Fara linkuri interne, autoritatea nu se distribuie catre paginile pe care vrei sa le rankezi.", fix: "Adauga 3-5 linkuri interne relevante pe fiecare pagina importanta. Paginile de categorie si cele cu volum mare de kw trebuie sa fie legate din homepage si din alte pagini principale." },

  // Schema
  schema_missing:           { id: "schema_missing",           label: "Schema markup lipsa",               sectiune: "schema",    importanta: "major",     problema: "Nu exista date structurate pe pagina. Pierzi sansa de a aparea cu stele, preturi sau FAQ direct in Google.", fix: "Adauga JSON-LD potrivit tipului de pagina: Product pentru produse, LocalBusiness pentru pagina principala." },
  schema_tipuri_gresite:    { id: "schema_tipuri_gresite",    label: "Tipuri schema nepotrivite",         sectiune: "schema",    importanta: "important", problema: "Schema markup exista dar tipurile folosite nu corespund continutului paginii.", fix: "Verifica cu Google Rich Results Test si corecteaza tipurile." },
  schema_cu_erori:          { id: "schema_cu_erori",          label: "Erori de validare in schema",       sectiune: "schema",    importanta: "major",     problema: "Schema contine campuri obligatorii lipsa sau valori gresite. Google o ignora sau afiseaza avertisment in Search Console.", fix: "Testeaza schema pe search.google.com/test/rich-results si corecteaza toate erorile marcate cu rosu." },
  breadcrumbs_lipsa:        { id: "breadcrumbs_lipsa",        label: "Breadcrumb schema lipsa",           sectiune: "schema",    importanta: "important", problema: "Nu exista schema de tip BreadcrumbList. Google nu poate afisa calea de navigare sub rezultat — mai putin click-uri.", fix: "Adauga schema BreadcrumbList pe paginile de categoria si produs. In WordPress, Rank Math si Yoast o genereaza automat." },
  rating_schema_lipsa:      { id: "rating_schema_lipsa",      label: "Rating schema lipsa",               sectiune: "schema",    importanta: "important", problema: "Nu exista AggregateRating pe paginile de servicii sau produse. Concurentii cu stele in Google primesc mai multe click-uri.", fix: "Adauga AggregateRating cu ratingValue, reviewCount si bestRating in JSON-LD. Asigura-te ca recenziile sunt reale." },

  // Social
  og_title_desc_missing:    { id: "og_title_desc_missing",    label: "OG titlu sau descriere lipsa",      sectiune: "social",    importanta: "major",     problema: "Lipsesc og:title sau og:description. Cand se distribuie link-ul apare titlul paginii generic, fara un mesaj optimizat pentru social.", fix: "Adauga <meta property='og:title'> si <meta property='og:description'> cu texte scrise specific pentru previzualizare sociala." },
  og_image_missing:         { id: "og_image_missing",         label: "Imagine OG lipsa",                  sectiune: "social",    importanta: "major",     problema: "Cand cineva distribuie link-ul pe Facebook, WhatsApp sau LinkedIn nu apare nicio imagine.", fix: "Adauga og:image cu o imagine de minim 1200x630px, reprezentativa pentru pagina." },
  twitter_card_missing:     { id: "twitter_card_missing",     label: "Twitter Card lipsa",                sectiune: "social",    importanta: "important", problema: "Link-urile distribuite pe Twitter/X nu arata previzualizare cu imagine. Primesc mai putine click-uri.", fix: "Adauga: <meta name='twitter:card' content='summary_large_image'> si <meta name='twitter:image' content='URL'>." },
  favicon_missing:          { id: "favicon_missing",          label: "Favicon lipsa",                     sectiune: "social",    importanta: "important", problema: "Site-ul nu are favicon — tab-ul browserului apare cu o iconica generica. Reduce increderea vizitatorilor.", fix: "Adauga un favicon.ico si variante PNG (32x32). In WordPress se seteaza din Appearance > Customize > Site Identity." },
  apple_icon_missing:       { id: "apple_icon_missing",       label: "Apple Touch Icon lipsa",            sectiune: "social",    importanta: "important", problema: "Cand un utilizator iOS adauga site-ul pe ecranul principal, apare o captura de ecran generica in loc de o iconica.", fix: "Adauga <link rel='apple-touch-icon' sizes='180x180' href='/apple-touch-icon.png'> in <head>." },

  // Securitate
  https_missing:            { id: "https_missing",            label: "Site-ul nu are HTTPS",              sectiune: "securitate",importanta: "critic",    problema: "Browserele afiseaza 'Nesecurizat' langa adresa site-ului. Utilizatorii nu au incredere. Google penalizeaza direct.", fix: "Instaleaza un certificat SSL — Let's Encrypt e gratuit. Redirectioneaza tot traficul HTTP catre HTTPS." },
  imagini_fara_alt:         { id: "imagini_fara_alt",         label: "Imagini fara text alternativ",      sectiune: "securitate",importanta: "major",     problema: "Imaginile nu au atribut alt. Google nu le poate indexa in Google Images. Pierzi trafic potential.", fix: "Adauga atribut alt descriptiv la fiecare imagine: alt='Implant dentar din zirconiu la clinica Diente'." },
  imagini_neoptimizate:     { id: "imagini_neoptimizate",     label: "Imagini neoptimizate",              sectiune: "securitate",importanta: "important", problema: "Imaginile au dimensiuni mari (peste 200KB) sau sunt in format JPEG/PNG in loc de WebP.", fix: "Comprima toate imaginile la sub 100KB si converteste-le in format WebP. In WordPress, pluginul ShortPixel face asta automat." },
  hsts_lipsa:               { id: "hsts_lipsa",               label: "HSTS neconfigurat",                 sectiune: "securitate",importanta: "major",     problema: "HTTPS e activ dar nu e fortat prin HSTS. Un atacator poate intercepta prima conexiune HTTP inainte de redirect.", fix: "Adauga headerul: Strict-Transport-Security: max-age=31536000; includeSubDomains. Se configureaza din panoul de hosting sau .htaccess." },
  security_headers_lipsa:   { id: "security_headers_lipsa",   label: "Headere de securitate lipsa",       sectiune: "securitate",importanta: "important", problema: "Lipsesc headere de securitate standard (X-Frame-Options, X-Content-Type-Options, CSP). Site-ul e vulnerabil la atacuri de tip clickjacking.", fix: "Adauga in .htaccess sau din panoul de hosting: X-Frame-Options: SAMEORIGIN si X-Content-Type-Options: nosniff." },
};

export const SECTIUNI_CONFIG: Record<Sectiune, { label: string; importantaLabel: string; importanta: Importanta; icon: string }> = {
  viteza:     { label: "Viteza & Core Web Vitals", importantaLabel: "Impact direct pe ranking",        importanta: "critic",    icon: "zap" },
  seo:        { label: "SEO Tehnic",               importantaLabel: "Vizibilitate in Google",          importanta: "critic",    icon: "search" },
  continut:   { label: "Calitatea Continutului",   importantaLabel: "Relevanta si autoritate",         importanta: "major",     icon: "file-text" },
  keywords:   { label: "Analiza Cuvinte Cheie",    importantaLabel: "Vizibilitate organica in Google", importanta: "critic",    icon: "trending-up" },
  structura:  { label: "Structura Site-ului",      importantaLabel: "Crawlabilitate si indexare",      importanta: "major",     icon: "link" },
  schema:     { label: "Schema Markup",            importantaLabel: "Rich results in Google",          importanta: "major",     icon: "code" },
  social:     { label: "Social & OG Tags",         importantaLabel: "Previzualizare pe retele sociale",importanta: "important", icon: "share" },
  securitate: { label: "Securitate",               importantaLabel: "Incredere si protectie",          importanta: "critic",    icon: "shield" },
};

export const CHECK_TO_PROBLEM: Record<string, Record<StatusCheck, string | null>> = {
  pagespeed_mobile:   { ok: null, atentie: "pagespeed_mobile_slab",     critic: "pagespeed_mobile_critic" },
  pagespeed_desktop:  { ok: null, atentie: "pagespeed_desktop_slab",    critic: "pagespeed_desktop_slab" },
  lcp:                { ok: null, atentie: "lcp_atentie",               critic: "lcp_critic" },
  cls:                { ok: null, atentie: "cls_critic",                critic: "cls_critic" },
  inp:                { ok: null, atentie: "inp_slab",                  critic: "inp_slab" },
  title_tag:          { ok: null, atentie: "title_long",                critic: "title_missing" },
  meta_description:   { ok: null, atentie: "meta_desc_missing",         critic: "meta_desc_missing" },
  h1:                 { ok: null, atentie: "h1_multiple",               critic: "h1_missing" },
  canonical_tags:     { ok: null, atentie: "canonical_missing",         critic: "canonical_missing" },
  url_structure:      { ok: null, atentie: "url_probleme",              critic: "url_probleme" },
  continut_subtire:   { ok: null, atentie: "continut_subtire_found",    critic: "continut_subtire_found" },
  pagini_duplicate:   { ok: null, atentie: "pagini_duplicate_found",    critic: "pagini_duplicate_found" },
  structura_headings: { ok: null, atentie: "headings_dezordonate",      critic: "headings_dezordonate" },
  lizibilitate:       { ok: null, atentie: "lizibilitate_slaba",        critic: "lizibilitate_slaba" },
  cuvinte_cheie:      { ok: null, atentie: "cuvinte_cheie_lipsa",       critic: "cuvinte_cheie_lipsa" },
  kw_in_title:          { ok: null, atentie: "kw_title_lipsa",          critic: "kw_title_lipsa" },
  kw_in_h1:            { ok: null, atentie: "kw_h1_lipsa",             critic: "kw_h1_lipsa" },
  kw_in_url:           { ok: null, atentie: "kw_url_slab",             critic: "kw_url_slab" },
  kw_categorii:        { ok: null, atentie: "kw_categorie_lipsa",      critic: "kw_categorie_lipsa" },
  kw_fara_canibalizare:{ ok: null, atentie: "kw_canibalizare_found",   critic: "kw_canibalizare_found" },
  robots_llm:         { ok: null, atentie: "robots_llm_blocat",        critic: "robots_llm_blocat" },
  sitemap_xml:        { ok: null, atentie: "sitemap_invalid",           critic: "sitemap_invalid" },
  breadcrumbs:        { ok: null, atentie: "breadcrumbs_lipsa_pagini", critic: "breadcrumbs_lipsa_pagini" },
  broken_links:       { ok: null, atentie: "broken_links_gasite",      critic: "broken_links_gasite" },
  internal_linking:   { ok: null, atentie: "internal_linking_slab",    critic: "internal_linking_slab" },
  schema_markup:      { ok: null, atentie: "schema_missing",            critic: "schema_missing" },
  schema_tipuri:      { ok: null, atentie: "schema_tipuri_gresite",     critic: "schema_tipuri_gresite" },
  schema_validare:    { ok: null, atentie: "schema_cu_erori",           critic: "schema_cu_erori" },
  schema_breadcrumbs: { ok: null, atentie: "breadcrumbs_lipsa",         critic: "breadcrumbs_lipsa" },
  schema_rating:      { ok: null, atentie: "rating_schema_lipsa",       critic: "rating_schema_lipsa" },
  og_tags:            { ok: null, atentie: "og_title_desc_missing",     critic: "og_title_desc_missing" },
  og_image:           { ok: null, atentie: "og_image_missing",          critic: "og_image_missing" },
  twitter_card:       { ok: null, atentie: "twitter_card_missing",      critic: "twitter_card_missing" },
  favicon:            { ok: null, atentie: "favicon_missing",           critic: "favicon_missing" },
  apple_icon:         { ok: null, atentie: "apple_icon_missing",        critic: "apple_icon_missing" },
  https:              { ok: null, atentie: "https_missing",             critic: "https_missing" },
  imagini_alt:        { ok: null, atentie: "imagini_fara_alt",          critic: "imagini_fara_alt" },
  imagini_optimizate: { ok: null, atentie: "imagini_neoptimizate",      critic: "imagini_neoptimizate" },
  hsts:               { ok: null, atentie: "hsts_lipsa",                critic: "hsts_lipsa" },
  security_headers:   { ok: null, atentie: "security_headers_lipsa",    critic: "security_headers_lipsa" },
};

export const PAGE_PROBLEM_IDS = {
  title_missing: "title_missing",
  title_long: "title_long",
  meta_desc_missing: "meta_desc_missing",
  h1_missing: "h1_missing",
  h1_multiple: "h1_multiple",
  og_image_missing: "og_image_missing",
  schema_missing: "schema_missing",
  imagini_fara_alt: "imagini_fara_alt",
  imagini_neoptimizate: "imagini_neoptimizate",
  linkuri_broken_found: "linkuri_broken_found",
} as const;

export type PageProblemId = keyof typeof PAGE_PROBLEM_IDS;
