// THE REGISTRY of every sentence the site audit report shows (operator, 2026-09-25: a finite register of clear
// expressions, never a new wording for the same thing). The report only picks from here and fills the {placeholders}
// with measured numbers or names; lib/report-copy.test.ts fails on any visible text that does not come from this
// file and on a sentence written twice. To change a wording, change it here: one thing, one sentence.

import { SEO_LIMITS, UX_LIMITS } from "./seo-limits";

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

export const VERDICT = { bun: "Bun", "de-reglat": "De reglat", slab: "Rau" } as const;

export const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

// ── Part 1 from the ten SEO components (reports from 2026-09-24) ──
export type ComponentCopy = { name: string; what: string; stage: "A" | "B" | "C" };
export type RowCopy = { title: string; bad: string; unit: string; problem: string; fix: string; good: string };

export const STAGES: Record<ComponentCopy["stage"], string> = {
  A: "Poate fi citit site-ul?",
  B: "Intelege Google pagina?",
  C: "Il pot folosi asistentii AI?",
};

export const COMPONENTS: Record<string, ComponentCopy> = {
  raspuns: { stage: "A", name: "Paginile se deschid corect", what: "Paginile se deschid fara erori, pe conexiune securizata (https), si nu blocheaza vizitele lui Google" },
  robots: { stage: "A", name: "Ce ii permite site-ul lui Google (robots.txt)", what: "Fisierul robots.txt nu ii interzice lui Google sa citeasca paginile site-ului si ii spune unde e lista lor" },
  sitemap: { stage: "A", name: "Lista de pagini pentru Google (sitemap)", what: "Site-ul ii da lui Google lista categoriilor si produselor, fara pagini sterse, cu data ultimei schimbari" },
  indexare: { stage: "A", name: "Paginile pot aparea in Google", what: "Nicio categorie sau produs nu e ascuns de Google si fiecare apare o singura data, nu dublat prin www sau sortari" },
  html: { stage: "A", name: "Informatia e scrisa direct in pagina", what: "Numele, pretul si descrierea produsului sunt scrise in pagina, asa ca Google si ChatGPT le vad imediat" },
  titlu: { stage: "B", name: "Titlul din Google", what: fill("Titlul albastru afisat de Google: fiecare pagina are unul propriu, de {titleMin}-{titleMax} de caractere, cu numele produsului", SEO_LIMITS) },
  descriere: { stage: "B", name: "Descrierea din Google", what: fill("Textul gri de sub titlu in Google: fiecare pagina are unul propriu, de {descMin}-{descMax} de caractere", SEO_LIMITS) },
  continut: { stage: "B", name: "Textul paginii", what: fill("Fiecare pagina are un singur titlu mare si text scris pentru ea, categoriile au cel putin {ownText} de caractere de prezentare", SEO_LIMITS) },
  date_structurate: { stage: "B", name: "Informatii trimise separat lui Google", what: "Google primeste separat datele firmei, pretul, stocul, stelele si livrarea, ca sa le arate in rezultate" },
  ai: { stage: "C", name: "Acces pentru asistentii AI", what: "ChatGPT, Perplexity si Claude pot citi site-ul si il recunosc dupa profilurile oficiale ale firmei" },
};

// What a count counts. A check of the whole site counts nothing (none).
// A counted noun as Romanian writes it: "1 pagina", "5 pagini", "51 de pagini", "101 pagini" ("de" after 20-99 and
// after round hundreds).
export const NOUN = {
  page: ["pagina", "pagini"], category: ["categorie", "categorii"], product: ["produs", "produse"],
  service: ["serviciu", "servicii"], location: ["locatie", "locatii"],
  productPage: ["pagina de produs", "pagini de produs"], servicePage: ["pagina de serviciu", "pagini de servicii"],
  locationPage: ["pagina de locatie", "pagini de locatii"], address: ["adresa", "adrese"],
  checkedAddress: ["adresa verificata", "adrese verificate"], engine: ["motor de cautare", "motoare de cautare"],
  aiBot: ["robot de cautare AI", "roboti de cautare AI"], pageKind: ["tip de pagini", "tipuri de pagini"], link: ["legatura", "legaturi"], check: ["verificare", "verificari"], rule: ["regula", "reguli"],
} as const;
export const countOf = (n: number, [one, many]: readonly [string, string]): string =>
  n === 1 ? `1 ${one}` : `${n}${n >= 20 && (n % 100 === 0 || n % 100 >= 20) ? " de " : " "}${many}`;

// The singular of each counted unit ("1 din 1 categorie"), from the nouns above.
export const UNIT_ONE: Record<string, string> = Object.fromEntries(Object.values(NOUN).map(([one, many]) => [many, one]));
export const UNIT = { none: "", pagini: NOUN.page[1], pagini_produs: NOUN.productPage[1], pagini_servicii: NOUN.servicePage[1], pagini_locatii: NOUN.locationPage[1], crawlere: "roboti AI", criterii: "conditii", fisier: "fisier", legaturi: NOUN.link[1] } as Record<string, string>;

export const ROWS: Record<string, RowCopy> = {
  pagini_200: { title: "Paginile citite se deschid fara eroare", bad: "{n} nu se deschid: dau eroare sau nu mai exista", unit: UNIT.pagini, fix: "Repara paginile cu eroare sau trimite-le automat catre cea mai apropiata pagina care exista.", problem: "Un client sau Google care ajunge pe o pagina cu eroare pleaca, iar Google o scoate din rezultate.", good: "Niciun client nu ajunge pe o pagina cu eroare, iar Google pastreaza paginile in rezultate." },
  https: { title: "Tot site-ul se deschide pe conexiune securizata (https)", bad: "Site-ul se deschide si pe http, fara conexiune securizata", unit: UNIT.none, fix: "Trimite automat orice adresa http:// catre varianta https://.", problem: "Browserul arata 'Nesigur' langa adresa, clientii se sperie, iar Google pune mai jos site-urile nesigure.", good: "Browserul arata site-ul ca sigur, iar Google il trateaza la fel." },
  redirect_scurt: { title: "Adresa scrisa cu http sau cu www ajunge la site in cel mult doi pasi", bad: "Adresa scrisa cu http sau cu www trece prin trei sau mai multe redirectionari pana la site", unit: UNIT.none, fix: "Fa ca fiecare varianta a adresei sa trimita direct la adresa finala a site-ului.", problem: "Fiecare ocol incetineste deschiderea paginii, iar Google poate renunta sa il urmeze.", good: "Site-ul se deschide repede, oricum ar scrie clientul adresa." },
  acces_server: { title: "Site-ul nu blocheaza vizitele automate, cum sunt ale lui Google", bad: "Site-ul a refuzat vizitele noastre automate", unit: UNIT.none, fix: "Verifica in setarile de protectie (Cloudflare, firewall) ca Googlebot, Bingbot si robotii de cautare AI au acces.", problem: "Aceeasi protectie poate refuza si robotii Google sau ai asistentilor AI, care atunci nu mai citesc site-ul.", good: "Site-ul poate aparea in Google si in raspunsurile asistentilor AI." },
  robots_exista: { title: "Site-ul are fisierul robots.txt, cu regulile pentru Google", bad: "Site-ul nu are fisierul robots.txt", unit: UNIT.none, fix: "Publica la /robots.txt regulile pentru roboti si adresa listei de pagini.", problem: "Google citeste site-ul fara reguli si afla mai tarziu de paginile noi, deci ele apar mai tarziu in cautari.", good: "Google citeste site-ul dupa regulile tale si afla mai repede de paginile noi." },
  robots_motoare: { title: "robots.txt ii lasa pe Google si Bing sa citeasca site-ul", bad: "robots.txt opreste {n}: Google sau Bing", unit: NOUN.engine[1], fix: "Scoate din robots.txt regula care opreste Googlebot sau Bingbot.", problem: "Un motor de cautare oprit nu arata deloc site-ul in rezultatele lui.", good: "Site-ul poate aparea in rezultatele Google si Bing." },
  robots_pagini: { title: "robots.txt nu blocheaza categoriile, produsele sau fisierele care dau aspectul paginii", bad: "robots.txt blocheaza {n}: categorii, produse sau fisierele care dau aspectul paginii", unit: NOUN.address[1], fix: "Scoate din robots.txt regulile care blocheaza categoriile, produsele sau fisierele care dau aspectul paginii.", problem: "Google nu poate citi paginile blocate, asa ca nu le arata in rezultate; fara fisierele de aspect, vede pagina stricata.", good: "Categoriile si produsele pot aparea in Google, cu pagina aratata corect." },
  robots_sitemap: { title: "robots.txt spune unde e lista de pagini", bad: "robots.txt nu spune unde e lista de pagini", unit: UNIT.none, fix: "Adauga in robots.txt linia Sitemap: cu adresa listei de pagini.", problem: "Google gaseste mai greu lista si afla mai tarziu de paginile noi.", good: "Paginile noi apar mai repede in Google." },
  sitemap_exista: { title: "Site-ul are lista de pagini pentru Google", bad: "Site-ul nu are lista de pagini pentru Google", unit: UNIT.none, fix: "Activeaza lista de pagini din platforma sau din modulul SEO si trimite-o in Google Search Console.", problem: "Google afla de pagini doar urmand legaturile, asa ca unele raman negasite mult timp.", good: "Google afla repede de toate paginile, deci cele noi apar mai devreme in cautari." },
  sitemap_tipuri: { title: "Lista contine categoriile si produsele", bad: "Lista de pagini nu contine categoriile sau produsele", unit: NOUN.pageKind[1], fix: "Include in lista de pagini toate categoriile si produsele.", problem: "Tocmai de paginile care vand afla Google mai greu.", good: "Toate categoriile si produsele au sansa sa apara in Google." },
  sitemap_valide: { title: "Lista nu contine pagini sterse sau mutate", bad: "Lista de pagini contine adrese sterse sau mutate: {n}", unit: NOUN.checkedAddress[1], fix: "Scoate din lista paginile sterse si pune in locul celor redirectionate adresa lor finala.", problem: "Google pierde timp cu adrese moarte si ajunge mai rar la paginile bune.", good: "Google isi foloseste timpul pe paginile bune ale site-ului." },
  sitemap_lastmod: { title: "Lista arata cand s-a schimbat fiecare pagina", bad: "Lista de pagini nu arata cand s-a schimbat fiecare pagina", unit: UNIT.none, fix: "Activeaza data ultimei modificari in setarile listei de pagini.", problem: "Google nu stie ce pagini s-au schimbat si revine mai rar la ele.", good: "Schimbarile de pe site ajung mai repede in Google." },
  fara_noindex: { title: "Nicio categorie sau produs nu e ascuns de Google", bad: "{n} sunt ascunse de Google", unit: UNIT.pagini, fix: "Scoate marcajul care ascunde paginile de categorie si de produs; lasa-l doar pe cos, cont si cautarea din site.", problem: "O pagina ascunsa nu apare in Google, oricat de buna ar fi.", good: "Toate categoriile si produsele pot aparea in Google." },
  canonical_propriu: { title: "Fiecare pagina ii arata lui Google propria adresa, nu pe a alteia", bad: "{n} nu isi arata lui Google propria adresa", unit: UNIT.pagini, fix: "Fa ca fiecare categorie si fiecare produs sa-si declare propria adresa ca adresa principala.", problem: "Google poate afisa alta adresa sau poate scoate pagina din rezultate.", good: "Fiecare pagina apare in Google la adresa ei corecta." },
  www_unic: { title: "Site-ul se deschide la o singura adresa, cu www sau fara, nu la amandoua", bad: "Site-ul se deschide si cu www, si fara www, ca doua site-uri", unit: UNIT.none, fix: "Alege o varianta, cu sau fara www, si trimite-o automat pe cealalta la ea.", problem: "Google vede de doua ori acelasi continut si imparte valoarea site-ului intre cele doua adrese.", good: "Toata valoarea site-ului se aduna pe o singura adresa, deci urca mai usor in Google." },
  parametri: { title: "O categorie sortata (de exemplu dupa pret) nu apare in Google ca pagina separata", bad: "O categorie sortata (de exemplu dupa pret) apare in Google ca pagina separata", unit: UNIT.none, fix: "Fa ca paginile sortate sau filtrate sa declare categoria de baza ca adresa principala.", problem: "Google vede aceeasi lista de produse de mai multe ori si nu stie pe care sa o arate.", good: "Google le arata clientilor pagina de categorie potrivita." },
  html_nume: { title: "Numele produsului e scris direct in pagina", bad: "La {n}, numele produsului nu e scris direct in pagina", unit: UNIT.pagini_produs, fix: "Afiseaza numele produsului direct in pagina, nu incarcat dupa deschidere prin JavaScript.", problem: "Numele apare abia dupa ce ruleaza scripturile, asa ca ChatGPT, Claude si uneori Google nu il vad.", good: "Google si asistentii AI pot recomanda produsul dupa nume." },
  html_pret: { title: "Pretul e scris direct in pagina", bad: "La {n}, pretul nu e scris direct in pagina", unit: UNIT.pagini_produs, fix: "Afiseaza pretul direct in pagina, nu incarcat dupa deschidere prin JavaScript.", problem: "Pretul apare abia dupa ce ruleaza scripturile, asa ca asistentii AI nu il vad si nu il pot spune clientilor.", good: "Asistentii AI le pot spune clientilor pretul si pot recomanda produsul." },
  html_descriere: { title: fill("Produsul are descriere scrisa in pagina, de cel putin {ownText} de caractere", SEO_LIMITS), bad: fill("{n} au sub {ownText} de caractere de descriere proprie", SEO_LIMITS), unit: UNIT.pagini_produs, fix: "Scrie pentru fiecare produs o descriere proprie: la ce foloseste, dimensiuni, material, cum il alegi.", problem: "O pagina fara descriere nu le spune clientilor, lui Google si asistentilor AI ce vinzi, asa ca apare mai rar in cautari.", good: "Clientii inteleg ce cumpara, iar Google arata produsul la mai multe cautari." },
  titlu_exista: { title: "Fiecare pagina are titlu in Google", bad: "{n} nu au titlu in Google", unit: UNIT.pagini, fix: "Scrie pentru fiecare pagina un titlu propriu, care incepe cu numele produsului sau al categoriei.", problem: "Google inventeaza singur un titlu, de multe ori nepotrivit.", good: "Clientii vad in Google titlul ales de tine, care ii face sa dea clic." },
  titlu_lungime: { title: fill("Titlurile au {titleMin}-{titleMax} de caractere", SEO_LIMITS), bad: fill("{n} au titlul prea scurt sau prea lung (sub {titleMin} sau peste {titleMax} de caractere)", SEO_LIMITS), unit: UNIT.pagini, fix: fill("Tine titlurile intre {titleMin} si {titleMax} de caractere, cu numele produsului la inceput.", SEO_LIMITS), problem: "Un titlu prea scurt nu spune ce vinzi; unul prea lung e taiat de Google.", good: "Titlurile se vad intregi in Google si spun ce vinzi." },
  titlu_unic: { title: "Nicio pagina nu are acelasi titlu ca alta", bad: "{n} au acelasi titlu ca alta pagina", unit: UNIT.pagini, fix: "Da fiecarei pagini un titlu propriu.", problem: "Google nu stie pe care dintre paginile cu acelasi titlu sa o arate.", good: "Google arata pagina potrivita pentru fiecare cautare." },
  titlu_nume: { title: "Titlul contine numele produsului sau al categoriei", bad: "La {n}, titlul din Google nu contine numele produsului sau al categoriei", unit: UNIT.pagini, fix: "Incepe titlul din Google cu numele produsului sau al categoriei, la fel ca pe pagina.", problem: "Clientul nu recunoaste produsul in rezultate si alege alt site.", good: "Clientul recunoaste produsul in rezultate dupa nume si da clic." },
  descriere_exista: { title: "Fiecare pagina are descriere in Google", bad: "{n} nu au descriere in Google", unit: UNIT.pagini, fix: "Scrie pentru fiecare pagina una-doua propozitii despre ce gaseste clientul acolo.", problem: "Google alege singur o bucata din pagina, de multe ori nepotrivita.", good: "Clientii citesc sub titlu textul tau, care ii convinge sa dea clic." },
  descriere_unica: { title: "Nicio pagina nu are aceeasi descriere ca alta", bad: "{n} au aceeasi descriere ca alta pagina", unit: UNIT.pagini, fix: "Scrie o descriere proprie pentru fiecare pagina.", problem: "Paginile arata la fel in rezultate si clientul nu vede diferenta.", good: "Clientii vad diferenta dintre pagini direct in Google." },
  descriere_lungime: { title: fill("Descrierile au {descMin}-{descMax} de caractere", SEO_LIMITS), bad: fill("{n} au descrierea prea scurta sau prea lunga (sub {descMin} sau peste {descMax} de caractere)", SEO_LIMITS), unit: UNIT.pagini, fix: fill("Tine descrierile intre {descMin} si {descMax} de caractere.", SEO_LIMITS), problem: "O descriere prea scurta spune prea putin; una prea lunga e taiata de Google.", good: "Clientii citesc descrierea intreaga in Google." },
  un_titlu_mare: { title: "Fiecare pagina are un singur titlu mare", bad: "{n} nu au exact un titlu mare: lipseste sau sunt mai multe", unit: UNIT.pagini, fix: "Pune pe fiecare pagina un singur titlu mare, cu numele produsului sau al categoriei.", problem: "Google intelege mai greu despre ce e pagina.", good: "Google intelege despre ce e pagina si o arata la cautarile potrivite." },
  text_propriu: { title: "Textul fiecarei pagini nu e copiat de pe alta pagina", bad: "{n} au text copiat de pe alta pagina a site-ului", unit: UNIT.pagini, fix: "Scrie text propriu pentru fiecare pagina, incepand cu produsele cele mai vandute.", problem: "Textul copiat nu ajuta nicio pagina sa urce in Google.", good: "Fiecare pagina poate urca singura in Google." },
  text_categorii: { title: fill("Categoriile au text de prezentare de cel putin {ownText} de caractere", SEO_LIMITS), bad: fill("{n} au sub {ownText} de caractere de text de prezentare", SEO_LIMITS), unit: NOUN.category[1], fix: "Scrie 2-3 paragrafe pe fiecare categorie: ce gaseste clientul acolo si cum alege.", problem: "Categoriile prind cautarile mari; fara text, Google le intelege mai greu si le arata mai jos.", good: "Categoriile pot urca in Google la cautarile mari." },
  alt_imagini: { title: "Pozele produselor au un text care spune ce arata", bad: "La {n}, pozele produsului nu au un text care sa spuna ce arata", unit: UNIT.pagini_produs, fix: "Completeaza descrierea (textul alternativ) fiecarei poze de produs cu numele produsului.", problem: "Google Imagini si asistentii AI nu stiu ce arata poza, asa ca produsul nu apare la cautarile de imagini.", good: "Produsele pot aparea si in Google Imagini." },
  schema_firma: { title: "Google primeste numele, logo-ul si contactul magazinului", bad: "Google nu primeste numele, logo-ul si contactul magazinului", unit: UNIT.none, fix: "Activeaza datele firmei din modulul SEO sau din tema.", problem: "Google recunoaste mai greu magazinul si nu ii arata logo-ul si datele in rezultate.", good: "Google recunoaste magazinul si ii poate arata logo-ul si contactul." },
  schema_produs: { title: "Google primeste pretul si stocul fiecarui produs", bad: "La {n}, Google nu primeste pretul si stocul", unit: UNIT.pagini_produs, fix: "Activeaza datele de produs (pret, moneda, stoc) pe toate paginile de produs.", problem: "Produsele nu apar in Google cu pret si stoc langa titlu.", good: "Produsele pot aparea in Google cu pret si stoc." },
  schema_rating: { title: "Google primeste nota clientilor, ca sa arate stele", bad: "La {n}, Google nu primeste nota clientilor", unit: UNIT.pagini_produs, fix: "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului, cu nota inclusa in datele pentru Google; stelele apar doar din recenzii reale.", problem: "Langa produse nu apar stele in rezultate, iar stelele atrag clicuri.", good: "Produsele pot aparea in Google cu stele." },
  schema_traseu: { title: "Google primeste traseul paginii (Acasa > Categorie > Produs)", bad: "La {n}, Google nu primeste traseul paginii (Acasa > Categorie > Produs)", unit: UNIT.pagini, fix: "Activeaza traseul in datele pentru Google, din modulul SEO sau din tema.", problem: "In rezultate apare adresa lunga in loc de traseul clar al paginii.", good: "In rezultate apare traseul clar al paginii." },
  schema_livrare: { title: "Google primeste costul livrarii si politica de retur", bad: "La {n}, Google nu primeste costul livrarii si politica de retur", unit: UNIT.pagini_produs, fix: "Adauga in datele de produs costul livrarii si politica de retur.", problem: "Google nu poate arata livrarea si returul langa pret, desi clientii le cauta.", good: "Google poate arata livrarea si returul langa pret." },
  schema_pret_vizibil: { title: "Pretul trimis lui Google e acelasi cu cel afisat", bad: "La {n}, pretul trimis lui Google difera de cel afisat", unit: UNIT.pagini_produs, fix: "Fa ca pretul din datele pentru Google sa fie exact pretul afisat pe pagina.", problem: "Google poate respinge datele produsului si il poate scoate din rezultatele cu pret.", good: "Google are incredere in preturi, pentru ca sunt aceleasi cu cele afisate." },
  ai_roboti: { title: "ChatGPT, Perplexity si Claude au voie sa citeasca site-ul", bad: "robots.txt opreste {n}: ChatGPT, Perplexity sau Claude", unit: NOUN.aiBot[1], fix: "Permite in robots.txt robotii OAI-SearchBot, PerplexityBot si Claude-SearchBot.", problem: "Un asistent AI oprit nu poate recomanda site-ul cand cineva il intreaba.", good: "ChatGPT, Perplexity si Claude pot citi site-ul si il pot recomanda." },
  ai_profiluri: { title: "Site-ul are legaturi catre profilurile oficiale ale firmei", bad: "Lipsesc {n} catre profilurile oficiale ale firmei", unit: UNIT.legaturi, fix: "Adauga in datele firmei pentru Google legaturile catre profilurile oficiale.", problem: "Asistentii AI recunosc mai greu firma si o pot confunda cu alta.", good: "Asistentii AI recunosc firma si o recomanda corect." },
};

// A lead site (spec 2026-09-25 §3): what a component checks, and the rows only a lead site has. Rows shared with a
// shop but worded for products and categories there take their lead wording from ROWS_LEADS.
export const COMPONENTS_LEADS: Record<string, Pick<ComponentCopy, "what">> = {
  sitemap: { what: "Site-ul ii da lui Google lista paginilor de servicii si de locatii, fara pagini sterse, cu data ultimei schimbari" },
  indexare: { what: "Nicio pagina de serviciu sau de locatie nu e ascunsa de Google si fiecare apare o singura data, nu dublata prin www" },
  html: { what: "Numele serviciului, telefonul, adresa si descrierea sunt scrise in pagina, asa ca Google si ChatGPT le vad imediat" },
  titlu: { what: fill("Titlul albastru afisat de Google: fiecare pagina are unul propriu, de {titleMin}-{titleMax} de caractere, cu numele serviciului sau al locatiei", SEO_LIMITS) },
  continut: { what: fill("Fiecare pagina are un singur titlu mare si text scris pentru ea, serviciile au cel putin {ownText} de caractere, locatiile nu copiaza acelasi text", SEO_LIMITS) },
  date_structurate: { what: "Google primeste separat adresa, telefonul, programul si stelele afacerii, ca sa le arate in rezultate si pe harta" },
};
export const ROWS_LEADS: Record<string, Partial<RowCopy>> = {
  sitemap_servicii: { title: "Lista contine paginile de servicii si de locatii", bad: "{n} lipsesc din lista de pagini pentru Google", unit: UNIT.pagini, fix: "Include in lista de pagini toate paginile de servicii si de locatii.", problem: "Google afla mai greu de paginile de servicii si de locatii care lipsesc din lista.", good: "Toate serviciile si locatiile au sansa sa apara in Google." },
  robots_pagini: { title: "robots.txt nu blocheaza paginile de servicii, de locatii sau fisierele care dau aspectul paginii", bad: "robots.txt blocheaza {n}: pagini de servicii, de locatii sau fisierele care dau aspectul paginii", fix: "Scoate din robots.txt regulile care blocheaza paginile de servicii, de locatii sau fisierele care dau aspectul paginii.", good: "Paginile de servicii si de locatii pot aparea in Google, cu pagina aratata corect." },
  fara_noindex: { title: "Nicio pagina de serviciu sau de locatie nu e ascunsa de Google", fix: "Scoate marcajul care ascunde paginile de servicii si de locatii; lasa-l doar pe paginile de confirmare si pe cele interne.", good: "Toate paginile de servicii si de locatii pot aparea in Google." },
  canonical_propriu: { fix: "Fa ca fiecare pagina de serviciu si de locatie sa-si declare propria adresa ca adresa principala." },
  html_serviciu: { title: "Numele serviciului e scris direct in pagina", bad: "La {n}, numele serviciului nu e scris direct in pagina", unit: UNIT.pagini_servicii, fix: "Afiseaza numele serviciului ca titlu mare direct in pagina, nu incarcat dupa deschidere prin JavaScript.", good: "Google si asistentii AI pot recomanda serviciul dupa nume.", problem: "Numele serviciului apare abia dupa ce ruleaza scripturile, asa ca ChatGPT, Claude si uneori Google nu il vad." },
  html_contact: { title: "Telefonul si adresa sunt scrise direct in pagina", bad: "La {n}, telefonul si adresa nu sunt scrise direct in pagina", unit: UNIT.pagini, fix: "Pune pe fiecare pagina de serviciu si de locatie telefonul ca legatura pe care se poate apasa si adresa scrisa, nu intr-o imagine.", problem: "Clientul de pe telefon nu poate suna dintr-o atingere, iar Google si asistentii AI nu gasesc datele de contact.", good: "Telefonul si adresa se vad si se pot folosi pe fiecare pagina." },
  html_descriere_serviciu: { title: fill("Serviciul are descriere scrisa in pagina, de cel putin {ownText} de caractere", SEO_LIMITS), unit: UNIT.pagini_servicii, fix: "Scrie pentru fiecare serviciu ce este, cui ii foloseste, cum decurge si cat dureaza.", problem: "O pagina fara descriere nu le spune clientilor, lui Google si asistentilor AI ce oferi, asa ca apare mai rar in cautari.", good: "Clientii inteleg ce ofera serviciul, iar Google il arata la mai multe cautari.", bad: fill("{n} nu au o descriere proprie de cel putin {ownText} de caractere", SEO_LIMITS) },
  titlu_exista: { fix: "Scrie pentru fiecare pagina un titlu propriu, care incepe cu numele serviciului sau al locatiei." },
  titlu_lungime: { fix: fill("Tine titlurile intre {titleMin} si {titleMax} de caractere, cu numele serviciului la inceput.", SEO_LIMITS), problem: "Un titlu prea scurt nu spune ce oferi; unul prea lung e taiat de Google.", good: "Titlurile se vad intregi in Google si spun ce oferi." },
  titlu_nume: { title: "Titlul contine numele serviciului sau al locatiei", bad: "La {n}, titlul din Google nu contine numele serviciului sau al locatiei", fix: "Incepe titlul din Google cu numele serviciului sau al locatiei, la fel ca pe pagina.", problem: "Clientul nu recunoaste serviciul in rezultate si alege alt site.", good: "Clientul recunoaste serviciul in rezultate dupa nume si da clic." },
  un_titlu_mare: { fix: "Pune pe fiecare pagina un singur titlu mare, cu numele serviciului sau al locatiei." },
  text_propriu: { fix: "Scrie text propriu pentru fiecare pagina, incepand cu serviciile cerute cel mai des." },
  text_servicii: { title: "Serviciile au text de prezentare", bad: fill("{n} nu au un text de prezentare de cel putin {ownText} de caractere", SEO_LIMITS), unit: UNIT.pagini_servicii, fix: "Scrie 2-3 paragrafe pe fiecare serviciu: ce este, cui ii foloseste, cum decurge.", problem: "Paginile de servicii prind cautarile clientilor; fara text, Google le intelege mai greu si le arata mai jos.", good: "Serviciile pot urca in Google la cautarile clientilor." },
  locatii_diferite: { title: "Paginile de locatii nu copiaza acelasi text", bad: "{n} copiaza textul altei pagini de locatie", unit: UNIT.pagini_locatii, fix: "Scrie pentru fiecare locatie ce e specific acolo: adresa, cum ajungi, program, echipa, ce servicii sunt disponibile.", problem: "Google vede aceeasi pagina de mai multe ori si o arata doar pe una dintre ele.", good: "Fiecare locatie are text propriu si poate aparea la cautarile din zona ei." },
  schema_firma: { title: "Google primeste numele, logo-ul si contactul firmei", bad: "Google nu primeste numele, logo-ul si contactul firmei", problem: "Google recunoaste mai greu firma si nu ii arata logo-ul si datele in rezultate.", good: "Google recunoaste firma si ii poate arata logo-ul si contactul." },
  schema_afacere_locala: { title: "Google primeste adresa si telefonul afacerii", bad: "Google nu primeste adresa si telefonul afacerii", unit: UNIT.none, fix: "Declara in datele pentru Google tipul exact al afacerii (de exemplu clinica sau cabinet), adresa si telefonul, din modulul SEO.", problem: "Afacerea apare mai greu in cautarile locale si pe harta.", good: "Afacerea poate aparea in cautarile locale si pe harta." },
  schema_program: { title: "Google primeste programul afacerii", bad: "Google nu primeste programul afacerii", unit: UNIT.none, fix: "Adauga programul in datele afacerii locale, zi cu zi, din modulul SEO.", problem: "Google nu poate arata daca esti deschis acum, iar clientii suna in alta parte.", good: "Google poate arata programul si daca esti deschis acum." },
  contact_consecvent: { title: "Acelasi telefon pe toate paginile", bad: "{n} nu arata numarul principal de telefon", unit: UNIT.pagini, fix: "Pune acelasi telefon, ca legatura pe care se poate apasa, in antetul sau subsolul tuturor paginilor.", problem: "Google si clientii vad numere diferite si nu stiu la care sa sune.", good: "Clientii si Google au un singur numar la care sa sune." },
  schema_rating: { bad: "Google nu primeste nota clientilor", unit: UNIT.none, fix: "Cere recenzii dupa fiecare serviciu si afiseaza-le pe site, cu nota inclusa in datele pentru Google; stelele apar doar din recenzii reale.", problem: "Langa numele firmei nu apar stele in rezultate, iar stelele atrag clicuri.", good: "Firma poate aparea in Google cu stele." },
  schema_traseu: { title: "Google primeste traseul paginii (Acasa > Servicii > Serviciu)", bad: "La {n}, Google nu primeste traseul paginii (Acasa > Servicii > Serviciu)" },
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
export const UX_PAGES: Record<string, string> = { home: "Homepage", categorie: "Pagina de categorie", produs: cap(NOUN.productPage[0]), filtre: "Filtre si sortare" };
// The UX signals the engine stores with each report: what a page type has (found) or lacks (missing), and the fix.
export const UX_SIGNALS = {
  home_message: { found: "un titlu mare sus spune ce vinzi", missing: "fara un mesaj clar la inceputul paginii", fix: "Pune sus pe prima pagina un titlu mare care spune ce vinzi si pentru cine." },
  home_menu: { found: "meniul cu categoriile se vede sus", missing: "meniu greu de gasit", fix: "Afiseaza meniul cu categoriile principale sus, vizibil si pe telefon." },
  home_paths: { found: fill("prima pagina duce spre categorii si produse (cel putin {homeLinks} legaturi)", UX_LIMITS), missing: "putine cai spre categorii/produse", fix: "Pune pe prima pagina legaturi catre categoriile principale si catre cateva produse vandute des." },
  home_mobile: { found: "pagina se aseaza corect pe telefon", missing: "nu e adaptat pentru mobil", fix: "Foloseste o tema care se aseaza corect pe telefon si verifica paginile principale de pe un telefon." },
  cat_grid: { found: "lista de produse arata poza si pretul fiecarui produs", missing: "grila de produse neclara (poza/pret)", fix: "Afiseaza in lista de produse poza si pretul fiecarui produs." },
  cat_trail: { found: "traseul paginii (Acasa > Categorie) se vede deasupra titlului", missing: "fara traseul paginii (stii unde esti)", fix: "Afiseaza traseul (Acasa > Categorie > Produs) deasupra titlului, pe categorii si produse." },
  cat_pagination: { found: "lista are numerotarea paginilor sau buton de mai multe produse", missing: "fara paginare vizibila", fix: "Adauga sub lista de produse numerotarea paginilor sau un buton 'Vezi mai multe'." },
  cat_intro: { found: "categoria are un text de prezentare", missing: "fara text de intro (pierzi si SEO)", fix: "Scrie 2-3 fraze sub titlul categoriei: ce gaseste clientul acolo si cum alege." },
  prod_images: { found: fill("cel putin {productImages} poze pe produs", UX_LIMITS), missing: "prea putine imagini de produs", fix: "Pune cel putin 3-4 poze pe produs: din mai multe unghiuri, in folosire, cu detalii." },
  prod_price: { found: "pretul si stocul se vad pe pagina produsului", missing: "pret sau stoc neclar", fix: "Afiseaza langa butonul de comanda pretul si daca produsul e in stoc." },
  prod_cart: { found: "butonul 'Adauga in cos' se vede clar", missing: "buton de comanda greu de gasit", fix: "Fa butonul 'Adauga in cos' mare si vizibil fara derulare, si pe telefon." },
  prod_description: { found: "produsul are o descriere scrisa", missing: "descriere subtire", fix: "Scrie descrieri care raspund la ce intreaba clientii: la ce foloseste, dimensiuni, material, cum il alegi." },
  prod_reviews: { found: "recenziile si nota clientilor apar pe produs", missing: "fara recenzii pe produs", fix: "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului." },
  prod_related: { found: "sub produs apar produse similare", missing: "fara produse similare", fix: "Afiseaza sub produs 4-8 produse similare sau complementare." },
  filters: { found: "lista se poate filtra dupa pret, marca sau marime", missing: "fara filtre pe categorii", fix: "Adauga filtre dupa pret, marca si caracteristicile principale ale produselor." },
  sort: { found: "lista se poate sorta dupa pret sau popularitate", missing: "fara sortare (pret, popularitate)", fix: "Adauga in lista de produse sortare dupa pret si dupa popularitate." },
};
// UX signals are stored with each report; reports saved before 2026-09-24 carry these older technical wordings.
export const UX_SIGNAL_BEFORE_2026_09_24: Record<string, string> = {
  "mesaj / hero clar (H1)": UX_SIGNALS.home_message.found,
  "fara titlu-hero clar (H1)": UX_SIGNALS.home_message.missing,
  "breadcrumbs (stii unde esti)": UX_SIGNALS.cat_trail.found,
  "fara breadcrumbs": UX_SIGNALS.cat_trail.missing,
  // Labels of reports saved on 2026-09-24 and 2026-09-25, before they said what each signal measures.
  "mesaj clar la inceputul paginii": UX_SIGNALS.home_message.found,
  "meniu de navigare": UX_SIGNALS.home_menu.found,
  "categorii si cai spre produse": UX_SIGNALS.home_paths.found,
  "adaptat pentru mobil": UX_SIGNALS.home_mobile.found,
  "grila de produse cu poza si pret": UX_SIGNALS.cat_grid.found,
  "traseul paginii (stii unde esti)": UX_SIGNALS.cat_trail.found,
  "paginare": UX_SIGNALS.cat_pagination.found,
  "text de intro pe categorie": UX_SIGNALS.cat_intro.found,
  "imagini multiple": UX_SIGNALS.prod_images.found,
  "pret + stoc": UX_SIGNALS.prod_price.found,
  "buton 'Adauga in cos' clar": UX_SIGNALS.prod_cart.found,
  "descriere de produs": UX_SIGNALS.prod_description.found,
  "recenzii / rating": UX_SIGNALS.prod_reviews.found,
  "produse similare": UX_SIGNALS.prod_related.found,
  "filtre (marime/culoare/pret/brand)": UX_SIGNALS.filters.found,
  "optiuni de sortare": UX_SIGNALS.sort.found,
};
// ── Part 2 as a ✓/✗ checklist (spec 2026-09-25 §4), both kinds of site. A shop's rows are its UX signals (title from
// UX_SIGNALS.found, fix from UX_SIGNALS.fix); the speed rows and a lead site's rows are worded here. ──
export const UX_GROUPS: Record<string, string> = {
  viteza: "Viteza pe mobil", home: UX_PAGES.home, categorie: UX_PAGES.categorie, produs: UX_PAGES.produs, filtre: UX_PAGES.filtre,
  serviciu: cap(NOUN.servicePage[0]), contact: "Contact si programare", incredere: "Incredere",
};
export const UX_ROWS: Record<string, { title: string; fix: string }> = {
  viteza_scor: { title: "Google da vitezei pe telefon cel putin 70 din 100", fix: UX_SITE.pagespeed_mobile.fix },
  viteza_lcp: { title: "Continutul principal apare pe telefon in mai putin de 2,5 s", fix: UX_SITE.lcp.fix },
  lead_home_offer: { title: "Titlul mare spune ce oferi", fix: "Pune sus pe prima pagina un titlu mare care spune ce servicii oferi si unde." },
  lead_home_phone: { title: "Telefonul se vede sus, fara derulare", fix: "Pune telefonul, ca legatura pe care se poate apasa, in antetul paginii, vizibil si pe telefon." },
  lead_home_cta: { title: "Buton de programare sau de contact pe prima pagina", fix: "Pune pe prima pagina un buton vizibil de programare sau de cerere de oferta." },
  srv_explains: { title: "Serviciul e explicat pe pagina", fix: "Explica pe fiecare pagina de serviciu ce este, cui ii foloseste, cum decurge si cat dureaza." },
  srv_price: { title: "Pretul sau pretul de pornire e afisat", fix: "Afiseaza pe fiecare pagina de serviciu pretul sau pretul de la care porneste." },
  srv_cta: { title: "Pagina serviciului are buton de programare sau de contact", fix: "Pune pe fiecare pagina de serviciu un buton de programare sau de cerere de oferta, sus si la final." },
  srv_related: { title: "Pagina serviciului duce spre servicii inrudite", fix: "Adauga pe fiecare pagina de serviciu legaturi catre 2-3 servicii inrudite." },
  ct_form_short: { title: "Formularul de contact are cel mult cinci campuri", fix: "Pastreaza in formular doar ce iti trebuie ca sa suni inapoi: nume, telefon, serviciul dorit." },
  ct_call: { title: "Numarul de telefon suna la o atingere", fix: "Fa telefonul o legatura pe care se poate apasa, ca vizitatorul de pe telefon sa sune dintr-o atingere." },
  ct_chat: { title: "Site-ul are WhatsApp sau chat", fix: "Adauga un buton de WhatsApp sau un chat, pentru cei care nu vor sa sune." },
  ct_map: { title: "Harta si adresa apar pe site", fix: "Pune pe pagina de contact si pe fiecare locatie harta si adresa scrisa." },
  ct_hours: { title: "Programul apare pe site", fix: "Afiseaza programul zi cu zi pe pagina de contact si pe fiecare locatie." },
  tr_reviews: { title: "Recenziile clientilor apar pe site", fix: "Afiseaza pe site recenzii reale ale clientilor, cu numele si nota lor." },
  tr_team: { title: "Echipa e prezentata pe site", fix: "Prezinta echipa: medicii sau specialistii, cu poza si experienta." },
  tr_certs: { title: "Certificarile sau partenerii apar pe site", fix: "Arata certificarile, acreditarile si partenerii, cu sigla lor." },
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
  readOn: "citit pe {pages}",
  doneLabel: "Deja in regula",
  numbered: "{i}. {name}",
  checklistPage: " ({i}/{n})",
  coverEyebrow: "Audit site · Devrika",
  coverSource: "{pages} citite: categorii si produse",
  coverSourceDated: "{date} · {pages} citite: categorii si produse",
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
  summaryOverallText: "Calculat pe {pages} care vand: categorii si produse, nu articole de blog.",
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
  thWhy: "De ce acest scor",
  // A component's score is the share of its checks that pass; the line says which pass and which do not.
  whyGood: "De ce e bun: trec toate cele {n} verificari. {what}",
  whyGoodOne: "De ce e bun: verificarea trece. {what}",
  whyGoodBut: "De ce e bun: trec {ok} din {n} verificari. Ramane de reparat: {faults}.",
  whyMid: "De ce e de reglat: trec doar {ok} din {n} verificari. De reparat: {faults}.",
  whyBad: "De ce e rau: trec doar {ok} din {n} verificari. De reparat: {faults}.",
  whyBadNone: "De ce e rau: nu trece nicio verificare din {n}. De reparat: {faults}.",
  whyFault: "{title}: {fault}",
  whyMoreFaults: "{faults}; plus inca {k}, in checklist la componenta {i}",
  // A rule that fails is always said to fail, next to it: never a count that reads like praise.
  faultOn: "nu e indeplinit pe {fail} din {t} {unit}",
  faultNot: "nu e indeplinit",
  // A ✗ row of the checklist says what is wrong, why it matters, then how to fix it.
  // A rule that fails is named by its problem, with its count; under it, why that is bad and how to fix it.
  // A rule that passes says why that is good.
  whyBadLine: "Impact negativ: {why}",
  whyGoodLine: "Impact pozitiv: {why}",
  countOf: "{fail} din {total}",
  checkProblem: "Problema: {fault}. {why}",
  checkProblemBare: "Problema: {fault}.",
  // A row we could not measure says so, what happens if the rule is not met, and how to fix it.
  checkVerify: "De verificat: nu am putut masura asta din afara site-ului. Impact negativ daca nu e indeplinit: {why}",
  checkVerifyBare: "De verificat: nu am putut masura asta din afara site-ului.",
  whyUnmeasured: "{text} Nu am putut masura din afara site-ului: {v}.",
  thScore: "Scor",
  thVerdict: "Verdict",
  problemsTitle: "Ce e de reparat pe pagini",
  problemsFix: "Cum se repara: {fix}",
  problemsNone: "Nicio problema gasita pe paginile citite.",
  productTitle: "Paginile de produs, asa cum le vede Google",
  productChecked: "pagini de produs verificate",
  productWeakTitles: "cu titlu scurt sau generic",
  productMissingMeta: "fara descriere pentru Google",
  aiSource: "setarile de acces ale site-ului si datele pentru Google de pe {pages}",
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
  coverSource: "{pages} citite: servicii si locatii",
  coverSourceDated: "{date} · {pages} citite: servicii si locatii",
  coverPart2Lead: "cat de usor te contacteaza sau face o programare un vizitator, pe telefon si pe desktop",
  summaryOverallText: "Calculat pe {pages} care aduc clienti: servicii, locatii si contact, nu articole de blog.",
  summaryUxText: "Viteza pe mobil {speed}; paginile de servicii si de contact sunt verificate pe pagini reale.",
  part1Lead: "Ce vede Google cand iti citeste paginile de servicii si de locatii, si ce vad ChatGPT, Claude sau Perplexity cand cineva le intreaba pe cine sa aleaga.",
  part2Title: "UX / UI: cat de usor te contacteaza",
  part2Lead: "Ce traieste un vizitator de la prima pagina pana la programare sau contact: cat asteapta, cum gaseste serviciul si ce il ajuta sa decida.",
};

// ── The waiting screen (spec 2026-09-25 §6): the audit's real steps in the order the engine runs them, and what each
// one measured. A step that could not measure says WORD.verify. ──
export const PROGRESS_STEPS = [
  { id: "citire", label: "Citim site-ul" },
  { id: "robots", label: "Verificam robots.txt si sitemap-ul" },
  { id: "alegere", label: "Alegem paginile care conteaza" },
  { id: "pagini", label: "Citim paginile" },
  { id: "viteza", label: "Masuram viteza pe mobil" },
  { id: "verificari", label: "Verificam titlurile, descrierile si datele pentru Google" },
  { id: "ai", label: "Verificam accesul asistentilor AI" },
  { id: "scor", label: "Calculam scorul" },
] as const;
export type ProgressStepId = (typeof PROGRESS_STEPS)[number]["id"];
export const PROGRESS = {
  title: "Analizam site-ul tau",
  stepOf: "Pasul {i} din {n}",
  elapsed: "{s} s",
  note: "Auditul dureaza de obicei un minut sau doua. Nu inchide aceasta fereastra.",
  platformKind: "{platform} · {kind}",
  anySite: "Site",
  robotsFound: "robots.txt gasit",
  robotsMissing: "fara robots.txt",
  sitemapFound: "sitemap gasit",
  sitemapMissing: "fara sitemap",
  pagesChosen: "Pagini alese: {n}",
  pagesRead: "Pagini citite: {n}",
  pagesTyped: "Pagini citite: {n} · {split}",
  pair: "{a}, {b}",
  lcp: "{s} pana apare continutul",
  noDescription: "{n} fara descriere",
  allDescribed: "toate paginile au descriere",
  aiAccess: "{ok} din {t} roboti AI au acces",
  score: "Scor {score}/100",
};
