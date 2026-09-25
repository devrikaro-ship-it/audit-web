// THE REGISTRY of every sentence the site audit report shows (operator, 2026-09-25: a finite register of clear
// expressions, never a new wording for the same thing). The report only picks from here and fills the {placeholders}
// with measured numbers or names; lib/report-copy.test.ts fails on any visible text that does not come from this
// file and on a sentence written twice. To change a wording, change it here: one thing, one sentence.

export const fill = (tpl: string, v: Record<string, string | number> = {}): string =>
  tpl.replace(/\{(\w+)\}/g, (all, k: string) => (k in v ? String(v[k]) : all));
// The same entry at the start of a sentence.
export const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

export const WORD = {
  yes: "da",
  no: "nu",
  missing: "lipseste",
  verify: "de verificat",
  repair: "de reparat",
  add: "de adaugat",
  some: "unele",
  notMeasured: "Nu am putut masura din afara site-ului.",
  outOf: "{ok} din {t} {unit}",
  countOf: "{n} {what}",
  ratio: "{ok}/{t}",
};

// The kind of site (lib/site-kind.ts) and who decided it: the scan, or the visitor who corrected it.
export const SITE_KIND = { ecom: "Magazin online", leads: "Site de servicii" } as const;
export const SITE_KIND_BY = { scan: "dedus din site", visitor: "ales de vizitator" } as const;

export const VERDICT = { bun: "Bun", "de-reglat": "De reglat", slab: "Slab" } as const;

export const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

// ── Part 1 from the ten SEO components (reports from 2026-09-24) ──
export type ComponentCopy = { name: string; what: string; stage: "A" | "B" | "C" };
export type RowCopy = { title: string; unit: string; problem: string; fix: string };

export const STAGES: Record<ComponentCopy["stage"], string> = {
  A: "Poate fi citit site-ul?",
  B: "Intelege Google pagina?",
  C: "Il pot folosi asistentii AI?",
};

export const COMPONENTS: Record<string, ComponentCopy> = {
  raspuns: { stage: "A", name: "Paginile raspund corect", what: "Erori, conexiune securizata, redirectionari, acces pentru roboti" },
  robots: { stage: "A", name: "Reguli pentru roboti (robots.txt)", what: "Google si Bing au voie, pagini si stiluri permise, sitemap declarat" },
  sitemap: { stage: "A", name: "Lista de pagini pentru Google (sitemap)", what: "Exista, are categorii si produse, doar pagini valide, date" },
  indexare: { stage: "A", name: "Pot aparea in Google", what: "Pagini neascunse, adresa principala, www, sortari" },
  html: { stage: "A", name: "Continut vizibil fara incarcare ulterioara", what: "Numele, pretul si descrierea sunt in codul paginii" },
  titlu: { stage: "B", name: "Titlul din Google", what: "Exista, lungime, nu se repeta, contine numele" },
  descriere: { stage: "B", name: "Descrierea din Google", what: "Exista, nu se repeta, lungime" },
  continut: { stage: "B", name: "Continutul paginii", what: "Un titlu mare, text propriu, text pe categorii, poze descrise" },
  date_structurate: { stage: "B", name: "Date pentru Google", what: "Firma, pret si stoc, stele, traseu, livrare, pret corect" },
  ai: { stage: "C", name: "Acces pentru asistentii AI", what: "ChatGPT, Perplexity, Claude; profilurile firmei" },
};

// What a count counts. A check of the whole site counts nothing (none).
export const UNIT = { none: "", pagini: "pagini", pagini_produs: "pagini de produs", pagini_servicii: "pagini de servicii", pagini_locatii: "pagini de locatii", crawlere: "roboti AI", criterii: "conditii", fisier: "fisier", legaturi: "legaturi" } as Record<string, string>;

export const ROWS: Record<string, RowCopy> = {
  pagini_200: { title: "Pagini care raspund corect", unit: UNIT.pagini, problem: "Unele pagini citite raspund cu eroare: nu exista sau serverul da gres.", fix: "Repara paginile cu eroare sau trimite-le automat catre cea mai apropiata pagina care exista." },
  https: { title: "Tot site-ul pe conexiune securizata", unit: UNIT.none, problem: "Site-ul se deschide si pe http, fara conexiune securizata, fara sa trimita automat pe https.", fix: "Trimite automat orice adresa http:// catre varianta https://." },
  redirect_scurt: { title: "Variantele adresei duc repede la site", unit: UNIT.none, problem: "O varianta a adresei (cu http sau cu www) trece prin trei sau mai multe redirectionari pana ajunge la site.", fix: "Fa ca fiecare varianta a adresei sa trimita direct la adresa finala a site-ului." },
  acces_server: { title: "Site-ul raspunde cererilor automate", unit: UNIT.none, problem: "Site-ul a refuzat cererile serverului nostru; unele protectii refuza si robotii Google sau ai asistentilor AI.", fix: "Verifica in setarile de protectie (Cloudflare, firewall) ca Googlebot, Bingbot si robotii de cautare AI au acces." },
  robots_exista: { title: "Fisierul robots.txt exista", unit: UNIT.none, problem: "Site-ul nu are fisierul robots.txt, care le spune robotilor ce pot citi.", fix: "Publica la /robots.txt regulile pentru roboti si adresa listei de pagini." },
  robots_motoare: { title: "Google si Bing au voie sa citeasca site-ul", unit: "motoare de cautare", problem: "robots.txt opreste Google sau Bing sa citeasca site-ul.", fix: "Scoate din robots.txt regula care opreste Googlebot sau Bingbot." },
  robots_pagini: { title: "Categoriile, produsele si stilurile nu sunt blocate", unit: "adrese", problem: "robots.txt blocheaza categorii, produse sau fisiere de stil, asa ca Google nu le poate citi.", fix: "Scoate din robots.txt regulile care blocheaza categoriile, produsele sau fisierele de stil." },
  robots_sitemap: { title: "robots.txt arata unde e lista de pagini", unit: UNIT.none, problem: "robots.txt nu spune robotilor unde e lista de pagini (sitemap).", fix: "Adauga in robots.txt linia Sitemap: cu adresa listei de pagini." },
  sitemap_exista: { title: "Lista de pagini pentru Google exista", unit: UNIT.none, problem: "Site-ul nu are o lista de pagini pentru Google (sitemap), asa ca Google afla mai greu de pagini.", fix: "Activeaza lista de pagini din platforma sau din modulul SEO si trimite-o in Google Search Console." },
  sitemap_tipuri: { title: "Lista contine categoriile si produsele", unit: "tipuri de pagini", problem: "Lista de pagini nu contine categoriile sau produsele, paginile care vand.", fix: "Include in lista de pagini toate categoriile si produsele." },
  sitemap_valide: { title: "Lista contine doar pagini care functioneaza", unit: "adrese verificate", problem: "Lista contine adrese care nu duc direct la o pagina: sunt sterse sau redirectionate.", fix: "Scoate din lista paginile sterse si pune in locul celor redirectionate adresa lor finala." },
  sitemap_lastmod: { title: "Lista arata cand s-a schimbat fiecare pagina", unit: UNIT.none, problem: "Lista de pagini nu spune cand s-a schimbat fiecare pagina, asa ca Google revine mai rar.", fix: "Activeaza data ultimei modificari in setarile listei de pagini." },
  fara_noindex: { title: "Categoriile si produsele pot aparea in Google", unit: UNIT.pagini, problem: "Unele pagini de categorie sau de produs sunt marcate sa nu apara in Google.", fix: "Scoate marcajul care ascunde paginile de categorie si de produs; lasa-l doar pe cos, cont si cautarea din site." },
  canonical_propriu: { title: "Fiecare pagina isi declara propria adresa", unit: UNIT.pagini, problem: "Unele pagini nu isi declara propria adresa ca adresa principala sau trimit Google la alta pagina, asa ca pot lipsi din rezultate.", fix: "Fa ca fiecare categorie si fiecare produs sa-si declare propria adresa ca adresa principala." },
  www_unic: { title: "Site-ul are o singura adresa, cu sau fara www", unit: UNIT.none, problem: "Site-ul se deschide separat si cu www si fara www, asa ca Google il poate vedea de doua ori.", fix: "Alege o varianta, cu sau fara www, si trimite-o automat pe cealalta la ea." },
  parametri: { title: "Sortarile nu creeaza pagini noi in Google", unit: UNIT.none, problem: "O categorie sortata (de exemplu dupa pret) apare ca pagina separata, asa ca Google vede aceeasi lista de mai multe ori.", fix: "Fa ca paginile sortate sau filtrate sa declare categoria de baza ca adresa principala." },
  html_nume: { title: "Numele produsului e in pagina, nu incarcat ulterior", unit: UNIT.pagini_produs, problem: "Numele produsului nu e in codul trimis de server, asa ca ChatGPT si Claude nu il vad.", fix: "Afiseaza numele produsului direct in pagina, nu incarcat dupa deschidere prin JavaScript." },
  html_pret: { title: "Pretul e in pagina, nu incarcat ulterior", unit: UNIT.pagini_produs, problem: "Pretul nu e in codul trimis de server, asa ca asistentii AI nu il vad.", fix: "Afiseaza pretul direct in pagina, nu incarcat dupa deschidere prin JavaScript." },
  html_descriere: { title: "Descrierea produsului e scrisa in pagina", unit: UNIT.pagini_produs, problem: "Paginile de produs fara descriere proprie nu le spun clientilor, lui Google si asistentilor AI ce vinzi.", fix: "Scrie pentru fiecare produs o descriere proprie: la ce foloseste, dimensiuni, material, cum il alegi." },
  titlu_exista: { title: "Fiecare pagina are titlu in Google", unit: UNIT.pagini, problem: "Paginile fara titlu nu au ce afisa Google in rezultate.", fix: "Scrie pentru fiecare pagina un titlu propriu, care incepe cu numele produsului sau al categoriei." },
  titlu_lungime: { title: "Titlurile au lungimea potrivita", unit: UNIT.pagini, problem: "Un titlu prea scurt nu spune ce vinzi; unul prea lung e taiat de Google.", fix: "Tine titlurile intre 15 si 65 de caractere, cu numele produsului la inceput." },
  titlu_unic: { title: "Titlurile nu se repeta", unit: UNIT.pagini, problem: "Paginile cu acelasi titlu se incurca in Google: nu stie pe care sa o arate.", fix: "Da fiecarei pagini un titlu propriu." },
  titlu_nume: { title: "Titlul contine numele produsului sau al categoriei", unit: UNIT.pagini, problem: "Titlul din Google nu contine numele scris pe pagina, asa ca clientul nu recunoaste produsul in rezultate.", fix: "Incepe titlul din Google cu numele produsului sau al categoriei, la fel ca pe pagina." },
  descriere_exista: { title: "Fiecare pagina are descriere in Google", unit: UNIT.pagini, problem: "Fara textul scurt de sub titlu, Google alege singur o bucata din pagina, de multe ori nepotrivita.", fix: "Scrie pentru fiecare pagina una-doua propozitii despre ce gaseste clientul acolo." },
  descriere_unica: { title: "Descrierile nu se repeta", unit: UNIT.pagini, problem: "Paginile cu aceeasi descriere arata la fel in rezultatele Google.", fix: "Scrie o descriere proprie pentru fiecare pagina." },
  descriere_lungime: { title: "Descrierile au lungimea potrivita", unit: UNIT.pagini, problem: "O descriere prea scurta spune prea putin; una prea lunga e taiata de Google. Tinta e 70-160 de caractere.", fix: "Tine descrierile intre 70 si 160 de caractere." },
  un_titlu_mare: { title: "Fiecare pagina are un singur titlu mare", unit: UNIT.pagini, problem: "Fara un singur titlu mare, Google intelege mai greu despre ce e pagina.", fix: "Pune pe fiecare pagina un singur titlu mare, cu numele produsului sau al categoriei." },
  text_propriu: { title: "Textul fiecarei pagini e propriu", unit: UNIT.pagini, problem: "Textul copiat de pe alta pagina a magazinului nu ajuta nicio pagina sa urce in Google.", fix: "Scrie text propriu pentru fiecare pagina, incepand cu produsele cele mai vandute." },
  text_categorii: { title: "Categoriile au text de prezentare", unit: "categorii", problem: "Categoriile au doar lista de produse, fara text propriu, desi ele prind cautarile mari.", fix: "Scrie 2-3 paragrafe pe fiecare categorie: ce gaseste clientul acolo si cum alege." },
  alt_imagini: { title: "Pozele produselor au descriere", unit: UNIT.pagini_produs, problem: "Poza produsului nu are descriere, asa ca Google Imagini si asistentii AI nu stiu ce arata.", fix: "Completeaza descrierea (textul alternativ) fiecarei poze de produs cu numele produsului." },
  schema_firma: { title: "Google stie ca site-ul e un magazin", unit: UNIT.none, problem: "Site-ul nu declara pentru Google datele firmei: nume, logo, contact.", fix: "Activeaza datele firmei din modulul SEO sau din tema." },
  schema_produs: { title: "Pret si stoc declarate pentru Google", unit: UNIT.pagini_produs, problem: "Fara pret si stoc declarate, produsele nu apar in rezultatele Google cu pret.", fix: "Activeaza datele de produs (pret, moneda, stoc) pe toate paginile de produs." },
  schema_rating: { title: "Stele (nota clientilor) declarate pentru Google", unit: UNIT.pagini_produs, problem: "Fara nota clientilor declarata, langa produse nu apar stele in Google.", fix: "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului, cu nota inclusa in datele pentru Google; stelele apar doar din recenzii reale." },
  schema_traseu: { title: "Traseul paginii declarat pentru Google", unit: UNIT.pagini, problem: "Traseul (Acasa > Categorie > Produs) nu e declarat pentru Google.", fix: "Activeaza traseul in datele pentru Google, din modulul SEO sau din tema." },
  schema_livrare: { title: "Livrarea si returul declarate pentru Google", unit: UNIT.pagini_produs, problem: "Livrarea si returul nu sunt declarate, desi Google le arata langa pret.", fix: "Adauga in datele de produs costul livrarii si politica de retur." },
  schema_pret_vizibil: { title: "Pretul declarat e cel afisat", unit: UNIT.pagini_produs, problem: "Pretul declarat pentru Google difera de cel afisat, iar Google poate respinge datele.", fix: "Fa ca pretul din datele pentru Google sa fie exact pretul afisat pe pagina." },
  ai_roboti: { title: "ChatGPT, Perplexity si Claude au voie sa citeasca site-ul", unit: "roboti de cautare AI", problem: "robots.txt opreste robotii de cautare AI (ChatGPT, Perplexity sau Claude), asa ca magazinul nu apare in raspunsurile lor.", fix: "Permite in robots.txt robotii OAI-SearchBot, PerplexityBot si Claude-SearchBot." },
  ai_profiluri: { title: "Magazinul e legat de profilurile firmei", unit: UNIT.legaturi, problem: "Paginile nu leaga magazinul de profilurile oficiale ale firmei (Facebook, Instagram), asa ca asistentii AI il recunosc mai greu.", fix: "Adauga in datele firmei pentru Google legaturile catre profilurile oficiale." },
};

// A lead site (spec 2026-09-25 §3): what a component checks, and the rows only a lead site has. Rows shared with a
// shop but worded for products and categories there take their lead wording from ROWS_LEADS.
export const COMPONENTS_LEADS: Record<string, Pick<ComponentCopy, "what">> = {
  sitemap: { what: "Exista, are paginile de servicii si de locatii, doar pagini valide, date" },
  indexare: { what: "Pagini neascunse, adresa principala, www" },
  html: { what: "Numele serviciului, telefonul si adresa, descrierea sunt in codul paginii" },
  continut: { what: "Un titlu mare, text propriu, text pe servicii, locatii diferite" },
  date_structurate: { what: "Afacere locala cu adresa si telefon, program, acelasi telefon, stele, traseu" },
};
export const ROWS_LEADS: Record<string, Partial<RowCopy>> = {
  sitemap_servicii: { title: "Lista contine paginile de servicii si de locatii", unit: UNIT.pagini, problem: "Unele pagini de servicii sau de locatii lipsesc din lista de pagini pentru Google, asa ca Google afla mai greu de ele.", fix: "Include in lista de pagini toate paginile de servicii si de locatii." },
  robots_pagini: { title: "Serviciile, locatiile si stilurile nu sunt blocate", problem: "robots.txt blocheaza pagini de servicii, de locatii sau fisiere de stil, asa ca Google nu le poate citi.", fix: "Scoate din robots.txt regulile care blocheaza paginile de servicii, de locatii sau fisierele de stil." },
  fara_noindex: { title: "Serviciile si locatiile pot aparea in Google", problem: "Unele pagini de servicii sau de locatii sunt marcate sa nu apara in Google.", fix: "Scoate marcajul care ascunde paginile de servicii si de locatii; lasa-l doar pe paginile de confirmare si pe cele interne." },
  canonical_propriu: { fix: "Fa ca fiecare pagina de serviciu si de locatie sa-si declare propria adresa ca adresa principala." },
  html_serviciu: { title: "Numele serviciului e in pagina, nu incarcat ulterior", unit: UNIT.pagini_servicii, problem: "Numele serviciului nu e in codul trimis de server, asa ca ChatGPT si Claude nu il vad.", fix: "Afiseaza numele serviciului ca titlu mare direct in pagina, nu incarcat dupa deschidere prin JavaScript." },
  html_contact: { title: "Telefonul si adresa sunt in pagina", unit: UNIT.pagini, problem: "Pe unele pagini de servicii sau de locatii telefonul (ca legatura pe care se poate apasa) sau adresa lipsesc din codul trimis de server.", fix: "Pune pe fiecare pagina de serviciu si de locatie telefonul ca legatura pe care se poate apasa si adresa scrisa, nu intr-o imagine." },
  html_descriere_serviciu: { title: "Serviciul e descris in pagina", unit: UNIT.pagini_servicii, problem: "Paginile de servicii fara descriere proprie nu le spun clientilor, lui Google si asistentilor AI ce oferi.", fix: "Scrie pentru fiecare serviciu ce este, cui ii foloseste, cum decurge si cat dureaza." },
  titlu_exista: { fix: "Scrie pentru fiecare pagina un titlu propriu, care incepe cu numele serviciului sau al locatiei." },
  titlu_lungime: { problem: "Un titlu prea scurt nu spune ce oferi; unul prea lung e taiat de Google.", fix: "Tine titlurile intre 15 si 65 de caractere, cu numele serviciului la inceput." },
  titlu_nume: { title: "Titlul contine numele serviciului sau al locatiei", problem: "Titlul din Google nu contine numele scris pe pagina, asa ca clientul nu recunoaste serviciul in rezultate.", fix: "Incepe titlul din Google cu numele serviciului sau al locatiei, la fel ca pe pagina." },
  un_titlu_mare: { fix: "Pune pe fiecare pagina un singur titlu mare, cu numele serviciului sau al locatiei." },
  text_propriu: { problem: "Textul copiat de pe alta pagina a site-ului nu ajuta nicio pagina sa urce in Google.", fix: "Scrie text propriu pentru fiecare pagina, incepand cu serviciile cerute cel mai des." },
  text_servicii: { title: "Serviciile au text de prezentare", unit: UNIT.pagini_servicii, problem: "Unele pagini de servicii au prea putin text propriu ca Google sa inteleaga ce oferi acolo.", fix: "Scrie 2-3 paragrafe pe fiecare serviciu: ce este, cui ii foloseste, cum decurge." },
  locatii_diferite: { title: "Paginile de locatii au text propriu", unit: UNIT.pagini_locatii, problem: "Unele pagini de locatii repeta textul altei locatii si schimba doar numele zonei, iar Google le poate trata ca pagini fara valoare.", fix: "Scrie pentru fiecare locatie ce e specific acolo: adresa, cum ajungi, program, echipa, ce servicii sunt disponibile." },
  schema_firma: { title: "Google stie ce firma e in spatele site-ului" },
  schema_afacere_locala: { title: "Google stie ca e o afacere locala, cu adresa si telefon", unit: UNIT.none, problem: "Site-ul nu se declara pentru Google ca afacere locala (clinica, cabinet, firma de servicii) cu adresa si telefon.", fix: "Declara in datele pentru Google tipul exact al afacerii (de exemplu clinica sau cabinet), adresa si telefonul, din modulul SEO." },
  schema_program: { title: "Programul declarat pentru Google", unit: UNIT.none, problem: "Programul nu e declarat pentru Google, asa ca nu apare langa numele afacerii in rezultate.", fix: "Adauga programul in datele afacerii locale, zi cu zi, din modulul SEO." },
  contact_consecvent: { title: "Acelasi telefon pe toate paginile", unit: UNIT.pagini, problem: "Telefonul principal nu apare pe toate paginile, asa ca unii vizitatori nu au pe ce sa apese ca sa sune.", fix: "Pune acelasi telefon, ca legatura pe care se poate apasa, in antetul sau subsolul tuturor paginilor." },
  schema_rating: { unit: UNIT.none, problem: "Fara nota clientilor declarata, langa site nu apar stele in Google.", fix: "Cere recenzii dupa fiecare serviciu si afiseaza-le pe site, cu nota inclusa in datele pentru Google; stelele apar doar din recenzii reale." },
  schema_traseu: { problem: "Traseul (Acasa > Servicii > Serviciu) nu e declarat pentru Google." },
  ai_roboti: { problem: "robots.txt opreste robotii de cautare AI (ChatGPT, Perplexity sau Claude), asa ca firma nu apare in raspunsurile lor." },
  ai_profiluri: { title: "Site-ul e legat de profilurile firmei", problem: "Paginile nu leaga site-ul de profilurile oficiale ale firmei (Facebook, Instagram), asa ca asistentii AI il recunosc mai greu." },
};

// ── Part 1 of reports saved before the ten components (2026-09-24): n = pages with the problem, t = checked ──
export const PAGE_COPY: Record<string, { title: string; problem: string; fix: string }> = {
  title_tag: { title: "Titlul din Google lipseste sau are lungimea gresita", problem: "{n} pagini au titlul care apare in Google lipsa, prea scurt sau atat de lung incat Google il taie.", fix: "Scrie pentru fiecare pagina un titlu propriu de 50-60 de caractere, care incepe cu ce cauta clientul." },
  meta_description: { title: "Pagini fara descriere in Google", problem: "{n} pagini nu au textul scurt care apare sub titlu in Google, asa ca Google alege singur o bucata din pagina, de multe ori nepotrivita.", fix: "Scrie pentru fiecare pagina una-doua propozitii (150-160 de caractere) care spun ce gaseste clientul acolo." },
  h1: { title: "Pagini fara un titlu principal clar", problem: "{n} pagini nu au un singur titlu mare pe pagina (lipseste sau sunt mai multe), asa ca Google nu stie sigur despre ce e pagina.", fix: "Pune pe fiecare pagina un singur titlu mare, care spune ce vinde pagina." },
  canonical_tags: { title: "Pagini fara adresa principala declarata", problem: "{n} pagini nu ii spun lui Google care e adresa lor principala, asa ca aceeasi pagina poate aparea in Google sub mai multe adrese.", fix: "Activeaza in platforma magazinului adresa principala declarata pe fiecare pagina; majoritatea platformelor o pun automat." },
  url_structure: { title: "Adrese de pagina greu de citit", problem: "{n} pagini au adrese cu semne si coduri (de exemplu ?id=123) in loc de cuvinte.", fix: "Foloseste adrese scurte, din cuvinte: magazin.ro/gantere-reglabile in loc de magazin.ro/p?id=123." },
  indexare: { title: "Pagini ascunse de Google", problem: "{n} pagini de categorie sau de produs sunt marcate sa nu apara in Google.", fix: ROWS.fara_noindex.fix },
  continut_mixt: { title: "Pagini cu elemente nesecurizate", problem: "{n} pagini incarca imagini sau fisiere printr-o legatura nesecurizata (http), pe care browserul o poate bloca sau o poate semnala ca nesigura.", fix: "Schimba legaturile http:// in https:// in tema, in texte si in setarile imaginilor." },
  lungime_continut: { title: "Pagini cu prea putin text", problem: "{n} pagini au sub 400 de cuvinte, prea putin ca Google sa inteleaga ce vinzi acolo.", fix: "Adauga text util: cum alegi, detalii tehnice, intrebari frecvente; tinta e 600 de cuvinte pe categorii si 800 pe produse." },
  cuvinte_cheie: { title: "Text fara cuvantul pe care il cauta clientii", problem: "{n} pagini au text, dar textul nu foloseste cuvintele cu care incepe titlul paginii, adica ce cauta clientul.", fix: "Foloseste in primele randuri ale textului cuvintele din titlul paginii, formulate natural." },
  structura_headings: { title: "Pagini fara subtitluri", problem: "{n} pagini sunt un singur bloc de text, fara subtitluri, greu de citit pentru clienti si pentru Google.", fix: "Imparte textul in sectiuni cu subtitluri, de exemplu: Caracteristici, Cum alegi, Intrebari frecvente." },
  faq_autoritate: { title: "Pagini fara intrebari frecvente", problem: "{n} pagini nu au o sectiune de intrebari frecvente, pe care Google si asistentii AI o preiau des in raspunsuri.", fix: "Adauga 3-5 intrebari reale ale clientilor, cu raspunsuri scurte." },
  continut_unic: { title: "Text repetat intre pagini", problem: "{n} pagini au cel putin jumatate din text copiat identic de pe alta pagina a magazinului.", fix: "Scrie text propriu pentru fiecare pagina, incepand cu categoriile si produsele cele mai vandute." },
  kw_in_title: { title: "Pagini fara titlu in Google", problem: "{n} pagini nu au un titlu pe care sa-l afiseze Google.", fix: "Scrie pentru fiecare pagina un titlu care incepe cu ce cauta clientul." },
  kw_in_h1: { title: "Cuvantul cautat lipseste din titlul paginii", problem: "{n} pagini au un titlu mare care nu contine cuvintele cu care incepe titlul din Google.", fix: "Pune in titlul mare de pe pagina aceleasi cuvinte cu care incepe titlul din Google." },
  kw_in_url: { title: "Cuvantul cautat lipseste din adresa paginii", problem: "{n} pagini au o adresa care nu contine cuvintele cu care incepe titlul paginii.", fix: "La paginile noi, fa adresa din cuvintele titlului. La cele vechi, schimba adresa doar impreuna cu o trimitere automata de la adresa veche, altfel pierzi pozitiile din Google." },
  kw_fara_canibalizare: { title: "Pagini care concureaza pe aceeasi cautare", problem: "{n} pagini au exact acelasi titlu ca alta pagina a magazinului, asa ca Google nu stie pe care sa o arate.", fix: "Pastreaza o singura pagina pentru fiecare titlu; la celelalte schimba titlul si textul sau trimite-le automat catre pagina pastrata." },
  robots_llm: { title: "Roboti AI opriti sa citeasca site-ul", problem: "{n} din {t} roboti AI (ChatGPT, Claude, Perplexity) nu au voie sa citeasca site-ul, asa ca nu il pot recomanda.", fix: "Permite in fisierul robots.txt al site-ului robotii GPTBot, ClaudeBot si PerplexityBot." },
  llms_txt: { title: "Lipseste rezumatul pentru asistentii AI", problem: "Magazinul nu are fisierul llms.txt: un rezumat scris pentru ChatGPT, Claude si Perplexity, cu ce vinzi si ce pagini sa citeasca.", fix: "Publica la adresa /llms.txt un rezumat al magazinului: ce vinzi, categoriile principale cu link si paginile de livrare, retur si contact." },
  entitate_ai: { title: "Firma nu e legata de profilurile ei oficiale", problem: "Paginile nu leaga magazinul de profilurile oficiale ale firmei (Facebook, Instagram), asa ca asistentii AI il recunosc mai greu ca firma reala.", fix: "Adauga in datele magazinului pentru Google legaturile catre profilurile oficiale ale firmei." },
  sitemap_xml: { title: "Lista de pagini pentru Google e incompleta", problem: "Lista de pagini pe care site-ul o da lui Google indeplineste {ok} din {t} conditii, asa ca Google poate afla mai tarziu de paginile noi.", fix: "Pune in lista data ultimei modificari a fiecarei pagini, anunt-o in fisierul robots.txt si trimite-o in Google Search Console." },
  breadcrumbs: { title: "Pagini fara traseu", problem: "{n} pagini de categorie sau de produs nu arata drumul pana la ele (de exemplu Acasa > Gantere > Gantere reglabile), asa ca vizitatorul si Google inteleg mai greu unde se afla.", fix: "Afiseaza traseul pe toate paginile; temele si modulele SEO obisnuite (Rank Math, Yoast, temele Shopify) il pot activa." },
  broken_links: { title: "Pagini care nu mai exista", problem: "{n} pagini citite raspund cu eroare: pagina nu exista.", fix: "Repara legaturile catre ele sau trimite-le automat catre cea mai apropiata pagina care exista." },
  internal_linking: { title: "Pagini cu prea putine legaturi mai departe", problem: "{n} pagini au mai putin de 3 legaturi catre alte pagini ale magazinului, asa ca vizitatorul si Google ajung greu mai departe.", fix: "Adauga pe fiecare pagina importanta 3-5 legaturi catre categorii sau produse inrudite." },
};

// The six zones of Part 1 in reports saved before the ten components.
export const LEGACY_ZONES = {
  seo: { name: "SEO tehnic", what: "Titlurile si descrierile din Google, adresele, paginile ascunse" },
  continut: { name: "Continut", what: "Cat text au paginile, daca e unic, daca are subtitluri" },
  keywords: { name: "Cuvinte cheie", what: "Ce cauta clientul, in titluri si in adrese" },
  structura: { name: "Structura site", what: "Lista de pagini pentru Google, traseul, legaturile intre pagini" },
  schema: { name: COMPONENTS.date_structurate.name, what: "Pret, stoc, stele si datele firmei, declarate pentru Google" },
  ai: { name: "Vizibilitate in AI", what: "ChatGPT, Claude, Perplexity: acces, rezumat, identitatea firmei" },
};

// ── Site-wide checks: a title, the fix, and how the result reads (yes/no, a count out of the pages checked, or the
// measured value itself) ──
export type SiteCopy = { title: string; fix: string; kind?: "yesno" | "measured"; unit?: string; okText?: string; countText?: string };
export const SEO_SITE: Record<string, SiteCopy> = {
  schema_tipuri: { title: ROWS.schema_firma.title, kind: "yesno", fix: ROWS.schema_firma.fix },
  schema_produs: { title: ROWS.schema_produs.title, unit: UNIT.pagini_produs, fix: ROWS.schema_produs.fix },
  schema_breadcrumbs: { title: ROWS.schema_traseu.title, unit: UNIT.pagini, fix: ROWS.schema_traseu.fix },
  schema_rating: { title: ROWS.schema_rating.title, unit: UNIT.pagini_produs, fix: ROWS.schema_rating.fix },
  og_tags: { title: "Titlu si descriere cand linkul e distribuit pe Facebook", kind: "yesno", fix: "Completeaza titlul si descrierea pentru distribuire in setarile SEO ale paginii principale." },
  og_image: { title: "Imagine cand linkul e distribuit pe Facebook", kind: "yesno", fix: "Alege o imagine pentru distribuire (1200 x 630 pixeli) in setarile SEO ale paginii principale." },
  https: { title: "Conexiune securizata (lacatul din browser)", kind: "yesno", fix: "Instaleaza un certificat de securitate (gratuit la majoritatea firmelor de gazduire) si trimite tot site-ul pe https." },
  hsts: { title: "Browserul foloseste mereu conexiunea securizata", kind: "yesno", fix: "Cere firmei de gazduire sa oblige browserele sa foloseasca mereu conexiunea securizata." },
  security_headers: { title: "Protectiile de securitate ale paginilor", kind: "yesno", fix: "Cere firmei de gazduire sa activeze protectiile de securitate standard ale paginilor." },
  imagini_alt: { title: "Descrieri la imagini, pentru Google si pentru nevazatori", okText: "toate au descriere", countText: "imagini fara descriere", fix: "Scrie la fiecare imagine, in campul de descriere din platforma, o propozitie scurta despre ce arata." },
};

export const UX_SITE: Record<string, SiteCopy> = {
  pagespeed_mobile: { title: "Scor de viteza pe mobil", kind: "measured", fix: "Micsoreaza imaginile, amana scripturile care nu sunt necesare la inceput si verifica viteza gazduirii." },
  lcp: { title: "Continutul principal apare repede pe telefon", kind: "measured", fix: "Incarca prima imaginea mare de sus, la dimensiunea potrivita pentru telefon, si amana restul." },
  cls: { title: "Pagina nu sare in timpul incarcarii", kind: "measured", fix: "Rezerva spatiu pentru imagini si bannere, ca pagina sa nu se miste in timp ce se incarca." },
  inp: { title: "Raspuns rapid la click", kind: "measured", fix: "Redu scripturile care ruleaza la fiecare atingere a ecranului: chat, ferestre care apar, module de urmarire." },
  ttfb: { title: "Serverul raspunde repede", kind: "measured", fix: "Verifica gazduirea si pastreaza pe server paginile gata generate, ca sa nu fie construite la fiecare vizita." },
  imagini_optimizate: { title: "Imagini intr-un format usor", okText: WORD.yes, countText: "imagini prea grele", fix: "Transforma imaginile intr-un format modern, mai usor; majoritatea platformelor au un modul care o face automat." },
  favicon: { title: "Iconita magazinului in tabul browserului", kind: "yesno", fix: "Incarca iconita magazinului (logo mic, patrat) din setarile temei." },
  apple_icon: { title: "Iconita cand magazinul e salvat pe ecranul telefonului", kind: "yesno", fix: "Incarca din setarile temei o iconita patrata de 180 x 180 pixeli pentru telefoane." },
};

// ── Part 2: page types, UX signals and their fixes ──
export const UX_PAGES: Record<string, string> = { home: "Homepage", categorie: "Pagina de categorie", produs: "Pagina de produs", filtre: "Filtre si sortare" };
// The UX signals the engine stores with each report: what a page type has (found) or lacks (missing), and the fix.
export const UX_SIGNALS = {
  home_message: { found: "mesaj clar la inceputul paginii", missing: "fara un mesaj clar la inceputul paginii", fix: "Pune sus pe prima pagina un titlu mare care spune ce vinzi si pentru cine." },
  home_menu: { found: "meniu de navigare", missing: "meniu greu de gasit", fix: "Afiseaza meniul cu categoriile principale sus, vizibil si pe telefon." },
  home_paths: { found: "categorii si cai spre produse", missing: "putine cai spre categorii/produse", fix: "Pune pe prima pagina legaturi catre categoriile principale si catre cateva produse vandute des." },
  home_mobile: { found: "adaptat pentru mobil", missing: "nu e adaptat pentru mobil", fix: "Foloseste o tema care se aseaza corect pe telefon si verifica paginile principale de pe un telefon." },
  cat_grid: { found: "grila de produse cu poza si pret", missing: "grila de produse neclara (poza/pret)", fix: "Afiseaza in lista de produse poza si pretul fiecarui produs." },
  cat_trail: { found: "traseul paginii (stii unde esti)", missing: "fara traseul paginii (stii unde esti)", fix: "Afiseaza traseul (Acasa > Categorie > Produs) deasupra titlului, pe categorii si produse." },
  cat_pagination: { found: "paginare", missing: "fara paginare vizibila", fix: "Adauga sub lista de produse numerotarea paginilor sau un buton 'Vezi mai multe'." },
  cat_intro: { found: "text de intro pe categorie", missing: "fara text de intro (pierzi si SEO)", fix: "Scrie 2-3 fraze sub titlul categoriei: ce gaseste clientul acolo si cum alege." },
  prod_images: { found: "imagini multiple", missing: "prea putine imagini de produs", fix: "Pune cel putin 3-4 poze pe produs: din mai multe unghiuri, in folosire, cu detalii." },
  prod_price: { found: "pret + stoc", missing: "pret sau stoc neclar", fix: "Afiseaza langa butonul de comanda pretul si daca produsul e in stoc." },
  prod_cart: { found: "buton 'Adauga in cos' clar", missing: "buton de comanda greu de gasit", fix: "Fa butonul 'Adauga in cos' mare si vizibil fara derulare, si pe telefon." },
  prod_description: { found: "descriere de produs", missing: "descriere subtire", fix: "Scrie descrieri care raspund la ce intreaba clientii: la ce foloseste, dimensiuni, material, cum il alegi." },
  prod_reviews: { found: "recenzii / rating", missing: "fara recenzii pe produs", fix: "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului." },
  prod_related: { found: "produse similare", missing: "fara produse similare", fix: "Afiseaza sub produs 4-8 produse similare sau complementare." },
  filters: { found: "filtre (marime/culoare/pret/brand)", missing: "fara filtre pe categorii", fix: "Adauga filtre dupa pret, marca si caracteristicile principale ale produselor." },
  sort: { found: "optiuni de sortare", missing: "fara sortare (pret, popularitate)", fix: "Adauga in lista de produse sortare dupa pret si dupa popularitate." },
};
// UX signals are stored with each report; reports saved before 2026-09-24 carry these older technical wordings.
export const UX_SIGNAL_BEFORE_2026_09_24: Record<string, string> = {
  "mesaj / hero clar (H1)": UX_SIGNALS.home_message.found,
  "fara titlu-hero clar (H1)": UX_SIGNALS.home_message.missing,
  "breadcrumbs (stii unde esti)": UX_SIGNALS.cat_trail.found,
  "fara breadcrumbs": UX_SIGNALS.cat_trail.missing,
};
// ── Part 2 as a ✓/✗ checklist (spec 2026-09-25 §4), both kinds of site. A shop's rows are its UX signals (title from
// UX_SIGNALS.found, fix from UX_SIGNALS.fix); the speed rows and a lead site's rows are worded here. ──
export const UX_GROUPS: Record<string, string> = {
  viteza: "Viteza pe mobil", home: UX_PAGES.home, categorie: UX_PAGES.categorie, produs: UX_PAGES.produs, filtre: UX_PAGES.filtre,
  serviciu: "Pagina de serviciu", contact: "Contact si programare", incredere: "Incredere",
};
export const UX_ROWS: Record<string, { title: string; fix: string }> = {
  viteza_scor: { title: "Scor de viteza pe mobil de cel putin 70", fix: UX_SITE.pagespeed_mobile.fix },
  viteza_lcp: { title: "Continutul principal apare in sub 2,5 s pe telefon", fix: UX_SITE.lcp.fix },
  lead_home_offer: { title: "Titlul mare spune ce oferi", fix: "Pune sus pe prima pagina un titlu mare care spune ce servicii oferi si unde." },
  lead_home_phone: { title: "Telefonul se vede sus, fara derulare", fix: "Pune telefonul, ca legatura pe care se poate apasa, in antetul paginii, vizibil si pe telefon." },
  lead_home_cta: { title: "Buton de programare sau de contact pe prima pagina", fix: "Pune pe prima pagina un buton vizibil de programare sau de cerere de oferta." },
  srv_explains: { title: "Serviciul e explicat pe pagina", fix: "Explica pe fiecare pagina de serviciu ce este, cui ii foloseste, cum decurge si cat dureaza." },
  srv_price: { title: "Pretul sau pretul de pornire e afisat", fix: "Afiseaza pe fiecare pagina de serviciu pretul sau pretul de la care porneste." },
  srv_cta: { title: "Buton de programare sau de contact pe pagina serviciului", fix: "Pune pe fiecare pagina de serviciu un buton de programare sau de cerere de oferta, sus si la final." },
  srv_related: { title: "Legaturi catre servicii inrudite", fix: "Adauga pe fiecare pagina de serviciu legaturi catre 2-3 servicii inrudite." },
  ct_form_short: { title: "Formular scurt de contact, cu cel mult cinci campuri", fix: "Pastreaza in formular doar ce iti trebuie ca sa suni inapoi: nume, telefon, serviciul dorit." },
  ct_call: { title: "Telefon pe care se poate apasa ca sa suni", fix: "Fa telefonul o legatura pe care se poate apasa, ca vizitatorul de pe telefon sa sune dintr-o atingere." },
  ct_chat: { title: "WhatsApp sau chat pe site", fix: "Adauga un buton de WhatsApp sau un chat, pentru cei care nu vor sa sune." },
  ct_map: { title: "Harta si adresa", fix: "Pune pe pagina de contact si pe fiecare locatie harta si adresa scrisa." },
  ct_hours: { title: "Programul afisat", fix: "Afiseaza programul zi cu zi pe pagina de contact si pe fiecare locatie." },
  tr_reviews: { title: "Recenzii sau pareri ale clientilor", fix: "Afiseaza pe site recenzii reale ale clientilor, cu numele si nota lor." },
  tr_team: { title: "Echipa prezentata", fix: "Prezinta echipa: medicii sau specialistii, cu poza si experienta." },
  tr_certs: { title: "Certificari sau parteneri", fix: "Arata certificarile, acreditarile si partenerii, cu sigla lor." },
  tr_photos: { title: "Poze reale ale locului si ale echipei", fix: "Foloseste poze facute la tine, nu poze cumparate: locul, echipa, aparatura." },
};

// How to fix each thing a page type is missing, keyed by the signal as the report shows it.
export const UX_FIX: Record<string, string> = Object.fromEntries(Object.values(UX_SIGNALS).map((x) => [x.missing, x.fix]));

// ── The AI slide of reports saved before the ten components ──
export const AI_CARDS = {
  robots_llm: { label: "Acces pentru robotii AI", text: "robotii AI care au voie sa citeasca site-ul", why: "Un robot oprit nu poate recomanda magazinul cand cineva intreaba un asistent AI." },
  llms_txt: { label: "Rezumat pentru asistentii AI", text: "fisierul llms.txt: rezumatul magazinului scris pentru asistentii AI", why: "Le spune ce vinzi si ce pagini sa citeasca, ca sa te citeze corect." },
  entitate_ai: { label: "Identitatea firmei pentru AI", text: "legaturi catre profilurile oficiale ale firmei (Facebook, Instagram)", why: "Asa isi dau seama asistentii AI ca magazinul e o firma reala, aceeasi de pe retele." },
};

// ── Who answers questions about the report (contact slide) ──
export const CONTACT = [
  { label: "Razvan", text: "0742 374 325", href: "tel:+40742374325" },
  { label: "Vlad", text: "0756 281 176", href: "tel:+40756281176" },
  { label: "Email", text: "hello@devrika.ro", href: "mailto:hello@devrika.ro" },
];

// ── Every other sentence on the slides ──
export const UI = {
  date: "{day} {month} {year}",
  sourceMeasured: "Masurat",
  sourceSite: "audit.devrika.ro",
  readOn: "citit pe {pages} de pagini",
  doneLabel: "Deja in regula",
  numbered: "{i}. {name}",
  checklistPage: " ({i}/{n})",
  coverEyebrow: "Audit site · Devrika",
  coverSource: "{pages} de pagini citite: categorii si produse",
  coverSourceDated: "{date} · {pages} de pagini citite: categorii si produse",
  coverGood: "Ce mai poate castiga {domain}",
  coverLosing: "Unde pierde clienti {domain}",
  outOf100: "din 100",
  coverPart1: "Partea 1 · SEO · {score}/100",
  coverPart1Lead: "cum te gasesc clientii in Google si in asistentii AI",
  coverPart2: "Partea 2 · UX / UI · {score}/100",
  coverPart2Lead: "cat de usor cumpara un vizitator, pe telefon si pe desktop",
  summaryEyebrow: "Pe scurt",
  summaryTitle: "Totul pe o pagina",
  summaryOverall: "Scor general",
  summaryOverallValue: "{score}/100 — {verdict}",
  summaryOverallText: "Calculat pe {pages} de pagini care vand: categorii si produse, nu articole de blog.",
  part1Label: "Partea 1 · SEO",
  scoreOf100: "{score}/100",
  summarySeoText: "{best} sta cel mai bine; la {worst} e cel mai mult de castigat.",
  summarySeoUnmeasured: "Nu am putut masura partea SEO din afara site-ului.",
  part2Label: "Partea 2 · UX / UI",
  summaryUxText: "Viteza pe mobil {speed}; paginile de produs si de categorie sunt verificate pe pagini reale.",
  summaryFirst: "Primul lucru de reparat",
  summaryFirstNone: "Nimic urgent",
  firstSlowTitle: "Pagina se incarca greu pe telefon",
  firstSlowText: "Continutul principal apare dupa {lcp}; tinta e sub 2,5 s.",
  part1Eyebrow: "Partea 1",
  part1Title: "SEO: cum te gasesc clientii",
  part1Lead: "Ce vede Google cand iti citeste paginile de categorie si de produs, si ce vad ChatGPT, Claude sau Perplexity cand cineva le intreaba unde sa cumpere.",
  seoTitle: "SEO: {score}/100",
  thComponent: "Componenta",
  thZone: "Zona",
  thWhat: "Ce verificam",
  thScore: "Scor",
  thVerdict: "Verdict",
  problemsTitle: "Ce e de reparat pe pagini",
  problemsFix: "Cum se repara: {fix}",
  problemsNone: "Nicio problema gasita pe paginile citite.",
  productTitle: "Paginile de produs, asa cum le vede Google",
  productChecked: "pagini de produs verificate",
  productWeakTitles: "cu titlu scurt sau generic",
  productMissingMeta: "fara descriere pentru Google",
  aiSource: "setarile de acces ale site-ului si datele pentru Google de pe {pages} de pagini",
  aiTitle: "Vizibilitate in ChatGPT, Claude si Perplexity",
  seoChecklistEyebrow: "Partea 1 · SEO · Checklist",
  seoChecklistTitle: "Checklist SEO",
  part2Eyebrow: "Partea 2",
  part2Title: "UX / UI: cat de usor se cumpara",
  part2Lead: "Ce traieste un vizitator de la prima pagina pana la cos: cat asteapta, cum gaseste produsul si ce il ajuta sa decida.",
  speedLabel: UX_GROUPS.viteza,
  uxTitle: "UX / UI: {score}/100",
  speedUnmeasured: "De verificat: viteza nu a putut fi masurata din afara site-ului in momentul auditului.",
  speedLcpBefore: "Continutul principal apare in ",
  speedLcpAfter: " (tinta: sub 2,5 s). Pe desktop: {desktop}.",
  pagesTitle: "Ce am gasit pe fiecare tip de pagina",
  pageUnread: "De verificat: nu am citit o astfel de pagina.",
  pageUnreadRow: "{page}: nu am citit o astfel de pagina",
  pageUnreadNote: "Nu a fost printre paginile citite, asa ca nu am putut-o verifica.",
  pageFixNote: "{page}: {fix}",
  uxChecklistEyebrow: "Partea 2 · UX / UI · Checklist",
  uxChecklistTitle: "Checklist UX / UI",
  contactEyebrow: "Intrebari",
  contactSource: "raport generat automat de Devrika",
  contactTitle: "Intrebari despre raport?",
  contactLead: "Iti explicam oricare punct din checklist si cum il repari, fie ca il faci singur, fie cu echipa ta.",
};

// A lead site's report (spec 2026-09-25 §5): the sentences of UI that speak of products, categories or the cart, in
// the words of a site that brings contacts. Only the entries that differ.
export const UI_LEADS: Partial<Record<keyof typeof UI, string>> = {
  coverSource: "{pages} de pagini citite: servicii si locatii",
  coverSourceDated: "{date} · {pages} de pagini citite: servicii si locatii",
  coverPart2Lead: "cat de usor te contacteaza sau face o programare un vizitator, pe telefon si pe desktop",
  summaryOverallText: "Calculat pe {pages} de pagini care aduc clienti: servicii, locatii si contact, nu articole de blog.",
  summaryUxText: "Viteza pe mobil {speed}; paginile de servicii si de contact sunt verificate pe pagini reale.",
  part1Lead: "Ce vede Google cand iti citeste paginile de servicii si de locatii, si ce vad ChatGPT, Claude sau Perplexity cand cineva le intreaba pe cine sa aleaga.",
  part2Title: "UX / UI: cat de usor te contacteaza",
  part2Lead: "Ce traieste un vizitator de la prima pagina pana la programare sau contact: cat asteapta, cum gaseste serviciul si ce il ajuta sa decida.",
};
