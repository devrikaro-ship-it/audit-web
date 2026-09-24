// Client wording for the ten SEO components (docs/superpowers/specs/2026-09-24-seo-ten-components-design.md). The
// engine only measures (lib/seo-components.ts); every word the report shows about a component or row is here.
// Problem sentences carry no number (the count sits next to the title), so they read right for one page or fifty.
export type ComponentCopy = { name: string; what: string; stage: "A" | "B" | "C" };
export type RowCopy = { title: string; unit: string; problem: () => string; fix: string };

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

export const ROWS: Record<string, RowCopy> = {
  pagini_200: { title: "Pagini care raspund corect", unit: "pagini", problem: () => "Unele pagini citite raspund cu eroare: nu exista sau serverul da gres.", fix: "Repara paginile cu eroare sau trimite-le automat catre cea mai apropiata pagina care exista." },
  https: { title: "Tot site-ul pe conexiune securizata", unit: "", problem: () => "Site-ul se deschide si pe http, fara conexiune securizata, fara sa trimita automat pe https.", fix: "Trimite automat orice adresa http:// catre varianta https://." },
  redirect_scurt: { title: "Variantele adresei duc repede la site", unit: "", problem: () => "O varianta a adresei (cu http sau cu www) trece prin trei sau mai multe redirectionari pana ajunge la site.", fix: "Fa ca fiecare varianta a adresei sa trimita direct la adresa finala a site-ului." },
  acces_server: { title: "Site-ul raspunde cererilor automate", unit: "", problem: () => "Site-ul a refuzat cererile serverului nostru; unele protectii refuza si robotii Google sau ai asistentilor AI.", fix: "Verifica in setarile de protectie (Cloudflare, firewall) ca Googlebot, Bingbot si robotii de cautare AI au acces." },
  robots_exista: { title: "Fisierul robots.txt exista", unit: "", problem: () => "Site-ul nu are fisierul robots.txt, care le spune robotilor ce pot citi.", fix: "Publica la /robots.txt regulile pentru roboti si adresa listei de pagini." },
  robots_motoare: { title: "Google si Bing au voie sa citeasca site-ul", unit: "motoare de cautare", problem: () => "robots.txt opreste Google sau Bing sa citeasca site-ul.", fix: "Scoate din robots.txt regula care opreste Googlebot sau Bingbot." },
  robots_pagini: { title: "Categoriile, produsele si stilurile nu sunt blocate", unit: "adrese", problem: () => "robots.txt blocheaza categorii, produse sau fisiere de stil, asa ca Google nu le poate citi.", fix: "Scoate din robots.txt regulile care blocheaza categoriile, produsele sau fisierele de stil." },
  robots_sitemap: { title: "robots.txt arata unde e lista de pagini", unit: "", problem: () => "robots.txt nu spune robotilor unde e lista de pagini (sitemap).", fix: "Adauga in robots.txt linia Sitemap: cu adresa listei de pagini." },
  sitemap_exista: { title: "Lista de pagini pentru Google exista", unit: "", problem: () => "Site-ul nu are o lista de pagini pentru Google (sitemap), asa ca Google afla mai greu de pagini.", fix: "Activeaza lista de pagini din platforma sau din modulul SEO si trimite-o in Google Search Console." },
  sitemap_tipuri: { title: "Lista contine categoriile si produsele", unit: "tipuri de pagini", problem: () => "Lista de pagini nu contine categoriile sau produsele, paginile care vand.", fix: "Include in lista de pagini toate categoriile si produsele." },
  sitemap_valide: { title: "Lista contine doar pagini care functioneaza", unit: "adrese verificate", problem: () => "Lista contine adrese care nu duc direct la o pagina: sunt sterse sau redirectionate.", fix: "Scoate din lista paginile sterse si pune in locul celor redirectionate adresa lor finala." },
  sitemap_lastmod: { title: "Lista arata cand s-a schimbat fiecare pagina", unit: "", problem: () => "Lista de pagini nu spune cand s-a schimbat fiecare pagina, asa ca Google revine mai rar.", fix: "Activeaza data ultimei modificari in setarile listei de pagini." },
  fara_noindex: { title: "Categoriile si produsele pot aparea in Google", unit: "pagini", problem: () => "Unele pagini de categorie sau de produs sunt marcate sa nu apara in Google.", fix: "Scoate marcajul care ascunde paginile de categorie si de produs; lasa-l doar pe cos, cont si cautarea din site." },
  canonical_propriu: { title: "Fiecare pagina isi declara propria adresa", unit: "pagini", problem: () => "Unele pagini nu isi declara propria adresa ca adresa principala sau trimit Google la alta pagina, asa ca pot lipsi din rezultate.", fix: "Fa ca fiecare categorie si fiecare produs sa-si declare propria adresa ca adresa principala." },
  www_unic: { title: "Site-ul are o singura adresa, cu sau fara www", unit: "", problem: () => "Site-ul se deschide separat si cu www si fara www, asa ca Google il poate vedea de doua ori.", fix: "Alege o varianta, cu sau fara www, si trimite-o automat pe cealalta la ea." },
  parametri: { title: "Sortarile nu creeaza pagini noi in Google", unit: "", problem: () => "O categorie sortata (de exemplu dupa pret) apare ca pagina separata, asa ca Google vede aceeasi lista de mai multe ori.", fix: "Fa ca paginile sortate sau filtrate sa declare categoria de baza ca adresa principala." },
  html_nume: { title: "Numele produsului e in pagina, nu incarcat ulterior", unit: "pagini de produs", problem: () => "Numele produsului nu e in codul trimis de server, asa ca ChatGPT si Claude nu il vad.", fix: "Afiseaza numele produsului direct in pagina, nu incarcat dupa deschidere prin JavaScript." },
  html_pret: { title: "Pretul e in pagina, nu incarcat ulterior", unit: "pagini de produs", problem: () => "Pretul nu e in codul trimis de server, asa ca asistentii AI nu il vad.", fix: "Afiseaza pretul direct in pagina, nu incarcat dupa deschidere prin JavaScript." },
  html_descriere: { title: "Descrierea produsului e scrisa in pagina", unit: "pagini de produs", problem: () => "Paginile de produs fara descriere proprie nu le spun clientilor, lui Google si asistentilor AI ce vinzi.", fix: "Scrie pentru fiecare produs o descriere proprie: la ce foloseste, dimensiuni, material, cum il alegi." },
  titlu_exista: { title: "Fiecare pagina are titlu in Google", unit: "pagini", problem: () => "Paginile fara titlu nu au ce afisa Google in rezultate.", fix: "Scrie pentru fiecare pagina un titlu propriu, care incepe cu numele produsului sau al categoriei." },
  titlu_lungime: { title: "Titlurile au lungimea potrivita", unit: "pagini", problem: () => "Un titlu prea scurt nu spune ce vinzi; unul prea lung e taiat de Google.", fix: "Tine titlurile intre 15 si 65 de caractere, cu numele produsului la inceput." },
  titlu_unic: { title: "Titlurile nu se repeta", unit: "pagini", problem: () => "Paginile cu acelasi titlu se incurca in Google: nu stie pe care sa o arate.", fix: "Da fiecarei pagini un titlu propriu." },
  titlu_nume: { title: "Titlul contine numele produsului sau al categoriei", unit: "pagini", problem: () => "Titlul din Google nu contine numele scris pe pagina, asa ca clientul nu recunoaste produsul in rezultate.", fix: "Incepe titlul din Google cu numele produsului sau al categoriei, la fel ca pe pagina." },
  descriere_exista: { title: "Fiecare pagina are descriere in Google", unit: "pagini", problem: () => "Fara textul scurt de sub titlu, Google alege singur o bucata din pagina, de multe ori nepotrivita.", fix: "Scrie pentru fiecare pagina una-doua propozitii despre ce gaseste clientul acolo." },
  descriere_unica: { title: "Descrierile nu se repeta", unit: "pagini", problem: () => "Paginile cu aceeasi descriere arata la fel in rezultatele Google.", fix: "Scrie o descriere proprie pentru fiecare pagina." },
  descriere_lungime: { title: "Descrierile au lungimea potrivita", unit: "pagini", problem: () => "O descriere prea scurta spune prea putin; una prea lunga e taiata de Google. Tinta e 70-160 de caractere.", fix: "Tine descrierile intre 70 si 160 de caractere." },
  un_titlu_mare: { title: "Fiecare pagina are un singur titlu mare", unit: "pagini", problem: () => "Fara un singur titlu mare, Google intelege mai greu despre ce e pagina.", fix: "Pune pe fiecare pagina un singur titlu mare, cu numele produsului sau al categoriei." },
  text_propriu: { title: "Textul fiecarei pagini e propriu", unit: "pagini", problem: () => "Textul copiat de pe alta pagina a magazinului nu ajuta nicio pagina sa urce in Google.", fix: "Scrie text propriu pentru fiecare pagina, incepand cu produsele cele mai vandute." },
  text_categorii: { title: "Categoriile au text de prezentare", unit: "categorii", problem: () => "Categoriile au doar lista de produse, fara text propriu, desi ele prind cautarile mari.", fix: "Scrie 2-3 paragrafe pe fiecare categorie: ce gaseste clientul acolo si cum alege." },
  alt_imagini: { title: "Pozele produselor au descriere", unit: "pagini de produs", problem: () => "Poza produsului nu are descriere, asa ca Google Imagini si asistentii AI nu stiu ce arata.", fix: "Completeaza descrierea (textul alternativ) fiecarei poze de produs cu numele produsului." },
  schema_firma: { title: "Google stie ca site-ul e un magazin", unit: "", problem: () => "Site-ul nu declara pentru Google datele firmei: nume, logo, contact.", fix: "Activeaza datele firmei din modulul SEO sau din tema." },
  schema_produs: { title: "Pret si stoc declarate pentru Google", unit: "pagini de produs", problem: () => "Fara pret si stoc declarate, produsele nu apar in rezultatele Google cu pret.", fix: "Activeaza datele de produs (pret, moneda, stoc) pe toate paginile de produs." },
  schema_rating: { title: "Stele (nota clientilor) declarate pentru Google", unit: "pagini de produs", problem: () => "Fara nota clientilor declarata, langa produse nu apar stele in Google.", fix: "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului, cu nota inclusa in datele pentru Google; stelele apar doar din recenzii reale." },
  schema_traseu: { title: "Traseul paginii declarat pentru Google", unit: "pagini", problem: () => "Traseul (Acasa > Categorie > Produs) nu e declarat pentru Google.", fix: "Activeaza traseul in datele pentru Google, din modulul SEO sau din tema." },
  schema_livrare: { title: "Livrarea si returul declarate pentru Google", unit: "pagini de produs", problem: () => "Livrarea si returul nu sunt declarate, desi Google le arata langa pret.", fix: "Adauga in datele de produs costul livrarii si politica de retur." },
  schema_pret_vizibil: { title: "Pretul declarat e cel afisat", unit: "pagini de produs", problem: () => "Pretul declarat pentru Google difera de cel afisat, iar Google poate respinge datele.", fix: "Fa ca pretul din datele pentru Google sa fie exact pretul afisat pe pagina." },
  ai_roboti: { title: "ChatGPT, Perplexity si Claude au voie sa citeasca site-ul", unit: "roboti de cautare AI", problem: () => "robots.txt opreste robotii de cautare AI (ChatGPT, Perplexity sau Claude), asa ca magazinul nu apare in raspunsurile lor.", fix: "Permite in robots.txt robotii OAI-SearchBot, PerplexityBot si Claude-SearchBot." },
  ai_profiluri: { title: "Magazinul e legat de profilurile firmei", unit: "legaturi", problem: () => "Paginile nu leaga magazinul de profilurile oficiale ale firmei (Facebook, Instagram), asa ca asistentii AI il recunosc mai greu.", fix: "Adauga in datele firmei pentru Google legaturile catre profilurile oficiale." },
};
