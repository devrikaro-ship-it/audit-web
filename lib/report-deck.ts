// The report as a 16:9 deck in two parts (operator, 2026-09-24): Part 1 SEO, Part 2 UX/UI, each closing with a
// checklist. Pure: AuditData in, the content of every slide out; components/report-deck.tsx only lays it out.
import { CHECKS } from "./problems-db";
import { statusScore, verdict, type Verdict } from "./scoring";
import type { AuditData, CheckResult, PageCheck, UxField } from "./types";

export type Tone = "good" | "warn" | "bad";
export type Zone = { name: string; what: string; score: number };
export type Problem = { title: string; count: string; tone: Tone; problem: string; fix: string };
export type CheckRow = { done: boolean; title: string; note: string; result: string };
export type AiCard = { label: string; big: string; text: string; why: string; tone: Tone };
export type UxPage = { id: string; name: string; score: number | null; verdict: string; tone: Tone; found: string[]; missing: string[] };

export type Deck = {
  domain: string;
  cover: string;
  pages: number;
  score: number;
  seo: { score: number; zones: Zone[]; problems: Problem[]; product: ProductSlide | null; ai: AiCard[] | null; checklist: CheckRow[] };
  ux: { score: number | null; speed: { mobile: string; desktop: string; lcp: string }; pages: UxPage[]; checklist: CheckRow[] };
  first: { title: string; text: string } | null;
};
export type ProductSlide = { checked: number; weakTitles: number; missingMeta: number; pairs: { label: string; value: string }[] };

export const VERDICT_LABEL: Record<Verdict, string> = { bun: "Bun", "de-reglat": "De reglat", slab: "Slab" };
export const toneOf = (score: number): Tone => ({ bun: "good", "de-reglat": "warn", slab: "bad" } as const)[verdict(score)];

// Everything the report says about a check is written here, in the words of a shop owner (AUDIT-SPEC §5.3). The
// engine's own label, problem and fix texts are technical notes and never reach the report. n = pages (or items) with
// the problem, t = pages (or items) checked, ok = those without it.
type Copy = { title: string; problem: (n: number, t: number, ok: number) => string; fix: string };
export const PAGE_COPY: Record<string, Copy> = {
  title_tag: { title: "Titlul din Google lipseste sau are lungimea gresita", problem: (n) => `${n} pagini au titlul care apare in Google lipsa, prea scurt sau atat de lung incat Google il taie.`, fix: "Scrie pentru fiecare pagina un titlu propriu de 50-60 de caractere, care incepe cu ce cauta clientul." },
  meta_description: { title: "Pagini fara descriere in Google", problem: (n) => `${n} pagini nu au textul scurt care apare sub titlu in Google, asa ca Google alege singur o bucata din pagina, de multe ori nepotrivita.`, fix: "Scrie pentru fiecare pagina una-doua propozitii (150-160 de caractere) care spun ce gaseste clientul acolo." },
  h1: { title: "Pagini fara un titlu principal clar", problem: (n) => `${n} pagini nu au un singur titlu mare pe pagina (lipseste sau sunt mai multe), asa ca Google nu stie sigur despre ce e pagina.`, fix: "Pune pe fiecare pagina un singur titlu mare, care spune ce vinde pagina." },
  canonical_tags: { title: "Pagini fara adresa principala declarata", problem: (n) => `${n} pagini nu ii spun lui Google care e adresa lor principala, asa ca aceeasi pagina poate aparea in Google sub mai multe adrese.`, fix: "Activeaza in platforma magazinului adresa principala declarata pe fiecare pagina; majoritatea platformelor o pun automat." },
  url_structure: { title: "Adrese de pagina greu de citit", problem: (n) => `${n} pagini au adrese cu semne si coduri (de exemplu ?id=123) in loc de cuvinte.`, fix: "Foloseste adrese scurte, din cuvinte: magazin.ro/gantere-reglabile in loc de magazin.ro/p?id=123." },
  indexare: { title: "Pagini ascunse de Google", problem: (n) => `${n} pagini de categorie sau de produs sunt marcate sa nu apara in Google.`, fix: "Scoate marcajul care ascunde paginile de categorie si de produs; lasa-l doar pe cos, cont si cautarea din site." },
  continut_mixt: { title: "Pagini cu elemente nesecurizate", problem: (n) => `${n} pagini incarca imagini sau fisiere printr-o legatura nesecurizata (http), pe care browserul o poate bloca sau o poate semnala ca nesigura.`, fix: "Schimba legaturile http:// in https:// in tema, in texte si in setarile imaginilor." },
  lungime_continut: { title: "Pagini cu prea putin text", problem: (n) => `${n} pagini au sub 400 de cuvinte, prea putin ca Google sa inteleaga ce vinzi acolo.`, fix: "Adauga text util: cum alegi, detalii tehnice, intrebari frecvente; tinta e 600 de cuvinte pe categorii si 800 pe produse." },
  cuvinte_cheie: { title: "Text fara cuvantul pe care il cauta clientii", problem: (n) => `${n} pagini au text, dar textul nu foloseste cuvintele cu care incepe titlul paginii, adica ce cauta clientul.`, fix: "Foloseste in primele randuri ale textului cuvintele din titlul paginii, formulate natural." },
  structura_headings: { title: "Pagini fara subtitluri", problem: (n) => `${n} pagini sunt un singur bloc de text, fara subtitluri, greu de citit pentru clienti si pentru Google.`, fix: "Imparte textul in sectiuni cu subtitluri, de exemplu: Caracteristici, Cum alegi, Intrebari frecvente." },
  faq_autoritate: { title: "Pagini fara intrebari frecvente", problem: (n) => `${n} pagini nu au o sectiune de intrebari frecvente, pe care Google si asistentii AI o preiau des in raspunsuri.`, fix: "Adauga 3-5 intrebari reale ale clientilor, cu raspunsuri scurte." },
  continut_unic: { title: "Text repetat intre pagini", problem: (n) => `${n} pagini au cel putin jumatate din text copiat identic de pe alta pagina a magazinului.`, fix: "Scrie text propriu pentru fiecare pagina, incepand cu categoriile si produsele cele mai vandute." },
  kw_in_title: { title: "Pagini fara titlu in Google", problem: (n) => `${n} pagini nu au un titlu pe care sa-l afiseze Google.`, fix: "Scrie pentru fiecare pagina un titlu care incepe cu ce cauta clientul." },
  kw_in_h1: { title: "Cuvantul cautat lipseste din titlul paginii", problem: (n) => `${n} pagini au un titlu mare care nu contine cuvintele cu care incepe titlul din Google.`, fix: "Pune in titlul mare de pe pagina aceleasi cuvinte cu care incepe titlul din Google." },
  kw_in_url: { title: "Cuvantul cautat lipseste din adresa paginii", problem: (n) => `${n} pagini au o adresa care nu contine cuvintele cu care incepe titlul paginii.`, fix: "La paginile noi, fa adresa din cuvintele titlului. La cele vechi, schimba adresa doar impreuna cu o trimitere automata de la adresa veche, altfel pierzi pozitiile din Google." },
  kw_categorii: { title: "Cautari fara o categorie dedicata", problem: (n) => `${n} pagini nu sunt pagini de categorie cu adresa scurta, direct sub numele magazinului.`, fix: "Creeaza categorii pentru grupele de produse cautate des, cu cel putin 500 de cuvinte de text." },
  kw_fara_canibalizare: { title: "Pagini care concureaza pe aceeasi cautare", problem: (n) => `${n} pagini au exact acelasi titlu ca alta pagina a magazinului, asa ca Google nu stie pe care sa o arate.`, fix: "Pastreaza o singura pagina pentru fiecare titlu; la celelalte schimba titlul si textul sau trimite-le automat catre pagina pastrata." },
  robots_llm: { title: "Roboti AI opriti sa citeasca site-ul", problem: (n, t) => `${n} din ${t} roboti AI (ChatGPT, Claude, Perplexity) nu au voie sa citeasca site-ul, asa ca nu il pot recomanda.`, fix: "Permite in fisierul robots.txt al site-ului robotii GPTBot, ClaudeBot si PerplexityBot." },
  llms_txt: { title: "Lipseste rezumatul pentru asistentii AI", problem: () => "Magazinul nu are fisierul llms.txt: un rezumat scris pentru ChatGPT, Claude si Perplexity, cu ce vinzi si ce pagini sa citeasca.", fix: "Publica la adresa /llms.txt un rezumat al magazinului: ce vinzi, categoriile principale cu link si paginile de livrare, retur si contact." },
  entitate_ai: { title: "Firma nu e legata de profilurile ei oficiale", problem: () => "Paginile nu leaga magazinul de profilurile oficiale ale firmei (Facebook, Instagram), asa ca asistentii AI il recunosc mai greu ca firma reala.", fix: "Adauga in datele magazinului pentru Google legaturile catre profilurile oficiale ale firmei." },
  sitemap_xml: { title: "Lista de pagini pentru Google e incompleta", problem: (_, t, ok) => `Lista de pagini pe care site-ul o da lui Google indeplineste ${ok} din ${t} conditii, asa ca Google poate afla mai tarziu de paginile noi.`, fix: "Pune in lista data ultimei modificari a fiecarei pagini, anunt-o in fisierul robots.txt si trimite-o in Google Search Console." },
  breadcrumbs: { title: "Pagini fara traseu", problem: (n) => `${n} pagini de categorie sau de produs nu arata drumul pana la ele (de exemplu Acasa > Gantere > Gantere reglabile), asa ca vizitatorul si Google inteleg mai greu unde se afla.`, fix: "Afiseaza traseul pe toate paginile; temele si modulele SEO obisnuite (Rank Math, Yoast, temele Shopify) il pot activa." },
  broken_links: { title: "Pagini care nu mai exista", problem: (n) => `${n} pagini citite raspund cu eroare: pagina nu exista.`, fix: "Repara legaturile catre ele sau trimite-le automat catre cea mai apropiata pagina care exista." },
  internal_linking: { title: "Pagini cu prea putine legaturi mai departe", problem: (n) => `${n} pagini au mai putin de 3 legaturi catre alte pagini ale magazinului, asa ca vizitatorul si Google ajung greu mai departe.`, fix: "Adauga pe fiecare pagina importanta 3-5 legaturi catre categorii sau produse inrudite." },
};

// Site-wide checks: a client title, and the result in client words (numbers are kept, technical values are not).
const nums = (v: string) => v.match(/(\d+) din (\d+)/);
const yesNo = (r: CheckResult) => (r.status === "ok" ? "da" : "lipseste");
const outOf = (what: string) => (r: CheckResult) => { const m = nums(r.value); return m ? `${m[1]} din ${m[2]} ${what}` : yesNo(r); };
const countOr = (ok: string, what: string) => (r: CheckResult) => (r.status === "ok" ? ok : `${r.value.match(/\d+/)?.[0] ?? "unele"} ${what}`);
const asMeasured = (r: CheckResult) => r.value;
type SiteCopy = { title: string; result: (r: CheckResult) => string; fix: string };
const SEO_SITE: Record<string, SiteCopy> = {
  schema_tipuri: { title: "Google stie ca site-ul e un magazin", result: yesNo, fix: "Adauga in datele magazinului pentru Google numele firmei, logo-ul si datele de contact; modulele SEO obisnuite o fac din setari." },
  schema_produs: { title: "Pret si stoc afisate in Google", result: outOf("pagini de produs"), fix: "Activeaza datele de produs pentru Google (pret si stoc) pe toate paginile de produs, din tema sau dintr-un modul SEO." },
  schema_breadcrumbs: { title: "Traseul paginii afisat in Google", result: outOf("pagini"), fix: "Activeaza traseul in datele pentru Google pe categorii si produse; modulele SEO obisnuite il pun automat." },
  schema_rating: { title: "Stele (nota clientilor) afisate in Google", result: outOf("pagini de produs"), fix: "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului, cu nota inclusa in datele pentru Google; stelele apar doar din recenzii reale." },
  og_tags: { title: "Titlu si descriere cand linkul e distribuit pe Facebook", result: yesNo, fix: "Completeaza titlul si descrierea pentru distribuire in setarile SEO ale paginii principale." },
  og_image: { title: "Imagine cand linkul e distribuit pe Facebook", result: yesNo, fix: "Alege o imagine pentru distribuire (1200 x 630 pixeli) in setarile SEO ale paginii principale." },
  https: { title: "Conexiune securizata (lacatul din browser)", result: yesNo, fix: "Instaleaza un certificat de securitate (gratuit la majoritatea firmelor de gazduire) si trimite tot site-ul pe https." },
  hsts: { title: "Browserul foloseste mereu conexiunea securizata", result: yesNo, fix: "Cere firmei de gazduire sa oblige browserele sa foloseasca mereu conexiunea securizata." },
  security_headers: { title: "Protectiile de securitate ale paginilor", result: yesNo, fix: "Cere firmei de gazduire sa activeze protectiile de securitate standard ale paginilor." },
  imagini_alt: { title: "Descrieri la imagini, pentru Google si pentru nevazatori", result: countOr("toate au descriere", "imagini fara descriere"), fix: "Scrie la fiecare imagine, in campul de descriere din platforma, o propozitie scurta despre ce arata." },
};
const UX_SITE: Record<string, SiteCopy> = {
  pagespeed_mobile: { title: "Scor de viteza pe mobil", result: asMeasured, fix: "Micsoreaza imaginile, amana scripturile care nu sunt necesare la inceput si verifica viteza gazduirii." },
  lcp: { title: "Continutul principal apare repede pe telefon", result: asMeasured, fix: "Incarca prima imaginea mare de sus, la dimensiunea potrivita pentru telefon, si amana restul." },
  cls: { title: "Pagina nu sare in timpul incarcarii", result: asMeasured, fix: "Rezerva spatiu pentru imagini si bannere, ca pagina sa nu se miste in timp ce se incarca." },
  inp: { title: "Raspuns rapid la click", result: asMeasured, fix: "Redu scripturile care ruleaza la fiecare atingere a ecranului: chat, ferestre care apar, module de urmarire." },
  ttfb: { title: "Serverul raspunde repede", result: asMeasured, fix: "Verifica gazduirea si pastreaza pe server paginile gata generate, ca sa nu fie construite la fiecare vizita." },
  imagini_optimizate: { title: "Imagini intr-un format usor", result: countOr("da", "imagini prea grele"), fix: "Transforma imaginile intr-un format modern, mai usor; majoritatea platformelor au un modul care o face automat." },
  favicon: { title: "Iconita magazinului in tabul browserului", result: yesNo, fix: "Incarca iconita magazinului (logo mic, patrat) din setarile temei." },
  apple_icon: { title: "Iconita cand magazinul e salvat pe ecranul telefonului", result: yesNo, fix: "Incarca din setarile temei o iconita patrata de 180 x 180 pixeli pentru telefoane." },
};
// UX signals are stored with each report; reports saved before 2026-09-24 carry these older technical wordings.
const UX_SIGNAL_BEFORE_2026_09_24: Record<string, string> = {
  "mesaj / hero clar (H1)": "mesaj clar la inceputul paginii",
  "fara titlu-hero clar (H1)": "fara un mesaj clar la inceputul paginii",
  "breadcrumbs (stii unde esti)": "traseul paginii (stii unde esti)",
  "fara breadcrumbs": "fara traseul paginii (stii unde esti)",
};
const uxSignal = (s: string) => UX_SIGNAL_BEFORE_2026_09_24[s] ?? s;
// How to fix each thing a page type is missing, keyed by the signal as the report shows it.
const UX_FIX: Record<string, string> = {
  "fara un mesaj clar la inceputul paginii": "Pune sus pe prima pagina un titlu mare care spune ce vinzi si pentru cine.",
  "meniu greu de gasit": "Afiseaza meniul cu categoriile principale sus, vizibil si pe telefon.",
  "putine cai spre categorii/produse": "Pune pe prima pagina legaturi catre categoriile principale si catre cateva produse vandute des.",
  "nu e adaptat pentru mobil": "Foloseste o tema care se aseaza corect pe telefon si verifica paginile principale de pe un telefon.",
  "grila de produse neclara (poza/pret)": "Afiseaza in lista de produse poza si pretul fiecarui produs.",
  "fara traseul paginii (stii unde esti)": "Afiseaza traseul (Acasa > Categorie > Produs) deasupra titlului, pe categorii si produse.",
  "fara paginare vizibila": "Adauga sub lista de produse numerotarea paginilor sau un buton 'Vezi mai multe'.",
  "fara text de intro (pierzi si SEO)": "Scrie 2-3 fraze sub titlul categoriei: ce gaseste clientul acolo si cum alege.",
  "prea putine imagini de produs": "Pune cel putin 3-4 poze pe produs: din mai multe unghiuri, in folosire, cu detalii.",
  "pret sau stoc neclar": "Afiseaza langa butonul de comanda pretul si daca produsul e in stoc.",
  "buton de comanda greu de gasit": "Fa butonul 'Adauga in cos' mare si vizibil fara derulare, si pe telefon.",
  "descriere subtire": "Scrie descrieri care raspund la ce intreaba clientii: la ce foloseste, dimensiuni, material, cum il alegi.",
  "fara recenzii pe produs": "Cere recenzii dupa livrare si afiseaza-le pe pagina produsului.",
  "fara produse similare": "Afiseaza sub produs 4-8 produse similare sau complementare.",
  "fara filtre pe categorii": "Adauga filtre dupa pret, marca si caracteristicile principale ale produselor.",
  "fara sortare (pret, popularitate)": "Adauga in lista de produse sortare dupa pret si dupa popularitate.",
};
const UX_PAGES: Record<string, string> = { home: "Homepage", categorie: "Pagina de categorie", produs: "Pagina de produs", filtre: "Filtre si sortare" };

const UNIT: Record<string, string> = { crawlere: "roboti AI", criterii: "conditii", fisier: "fisier", legaturi: "legaturi" };
const unitOf = (c: PageCheck) => UNIT[c.unit ?? ""] ?? "pagini";
const ratio = (c: PageCheck) => c.correctCount / Math.max(c.total, 1);
// A check that judged no page (total 0) is not measured: it counts neither in a score nor as a problem.
const measuredChecks = (cs: PageCheck[]) => cs.filter((c) => c.total > 0);
const pageScore = (cs: PageCheck[]) => Math.round(measuredChecks(cs).reduce((s, c) => s + ratio(c) * 100, 0) / Math.max(measuredChecks(cs).length, 1));

// A measurement the audit could not take is "de verificat", never a finding (AUDIT-SPEC §5.1).
const UNMEASURED = /indisponibil|nu s-a putut|necunoscut/i;

// Reports saved before 2026-09-24 stored a speed test PageSpeed could not run as "0 / 100", with "—" for the timings
// and a meaningless "0" for layout shift. A real mobile measurement always has a load time, so "—" there marks the
// whole mobile run as not measured, and "0 / 100" is never a real score.
function withLegacySpeed(cr: Record<string, CheckResult>): Record<string, CheckResult> {
  const na: CheckResult = { status: "atentie", value: "Date indisponibile" };
  const out = { ...cr };
  if (cr.lcp?.value === "—") for (const k of ["pagespeed_mobile", "lcp", "cls", "inp"]) if (out[k]) out[k] = na;
  for (const k of ["pagespeed_mobile", "pagespeed_desktop"]) if (out[k]?.value === "0 / 100") out[k] = na;
  return out;
}
const siteRow = ({ title, result, fix }: SiteCopy, r: CheckResult): CheckRow =>
  UNMEASURED.test(r.value)
    ? { done: false, title, note: "Nu am putut masura din afara site-ului.", result: "de verificat" }
    : { done: r.status === "ok", title, note: r.status === "ok" ? "" : fix, result: result(r) };

function schemaScore(data: AuditData): number {
  const v = Object.entries(data.checksRezultate).filter(([k]) => CHECKS[k]?.sectiune === "schema").map(([, r]) => statusScore(r.status));
  return Math.round(v.reduce((s, x) => s + x, 0) / Math.max(v.length, 1));
}

function aiCards(checks: PageCheck[]): AiCard[] {
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  const tone = (c: PageCheck): Tone => (ratio(c) >= 1 ? "good" : c.correctCount > 0 ? "warn" : "bad");
  const card = (c: PageCheck | undefined, label: string, big: (c: PageCheck) => string, text: string, why: string) =>
    c ? [{ label, big: big(c), text, why, tone: tone(c) }] : [];
  return [
    ...card(by.robots_llm, "Acces pentru robotii AI", (c) => `${c.correctCount}/${c.total}`, "robotii AI care au voie sa citeasca site-ul", "Un robot oprit nu poate recomanda magazinul cand cineva intreaba un asistent AI."),
    ...card(by.llms_txt, "Rezumat pentru asistentii AI", (c) => (c.correctCount ? "Da" : "Nu"), "fisierul llms.txt: rezumatul magazinului scris pentru asistentii AI", "Le spune ce vinzi si ce pagini sa citeasca, ca sa te citeze corect."),
    ...card(by.entitate_ai, "Identitatea firmei pentru AI", (c) => `${c.correctCount}/${c.total}`, "legaturi catre profilurile oficiale ale firmei (Facebook, Instagram)", "Asa isi dau seama asistentii AI ca magazinul e o firma reala, aceeasi de pe retele."),
  ];
}

export function buildDeck(data: AuditData): Deck {
  const cr = withLegacySpeed(data.checksRezultate);
  const ai = data.aiChecks ?? [];
  const zones: Zone[] = [
    { name: "SEO tehnic", what: "Titlurile si descrierile din Google, adresele, paginile ascunse", score: pageScore(data.seoChecks) },
    { name: "Continut", what: "Cat text au paginile, daca e unic, daca are subtitluri", score: pageScore(data.continutChecks) },
    { name: "Cuvinte cheie", what: "Ce cauta clientul, in titluri si in adrese", score: pageScore(data.keywordsChecks) },
    { name: "Structura site", what: "Lista de pagini pentru Google, traseul, legaturile intre pagini", score: pageScore(data.structuraChecks) },
    { name: "Date pentru Google", what: "Pret, stoc, stele si datele firmei, afisate in Google", score: schemaScore(data) },
    ...(ai.length ? [{ name: "Vizibilitate in AI", what: "ChatGPT, Claude, Perplexity: acces, rezumat, identitatea firmei", score: pageScore(ai) }] : []),
  ];
  const seoScore = Math.round(zones.reduce((s, z) => s + z.score, 0) / zones.length);

  const pageChecks = [...data.seoChecks, ...data.continutChecks, ...data.keywordsChecks, ...data.structuraChecks, ...ai];
  const failing = measuredChecks(pageChecks).filter((c) => ratio(c) < 1).sort((a, b) => ratio(a) - ratio(b));
  const problems: Problem[] = failing.filter((c) => PAGE_COPY[c.id]).map((c) => {
    const copy = PAGE_COPY[c.id];
    return {
      title: copy.title,
      count: `${c.total - c.correctCount} din ${c.total} ${unitOf(c)}`,
      tone: ratio(c) < 0.5 ? "bad" : "warn",
      problem: copy.problem(c.total - c.correctCount, c.total, c.correctCount),
      fix: copy.fix,
    };
  });
  const seoChecklist: CheckRow[] = [
    ...problems.map((p) => ({ done: false, title: p.title, note: p.fix.split("\n")[0], result: p.count })),
    ...Object.entries(SEO_SITE).filter(([k]) => cr[k]).map(([k, c]) => siteRow(c, cr[k])),
  ];

  const ps = data.productSignal;
  const product: ProductSlide | null = ps && ps.checked > 0 ? {
    checked: ps.checked, weakTitles: ps.weakTitles, missingMeta: ps.missingMeta,
    pairs: ["schema_produs", "schema_rating", "schema_breadcrumbs"]
      .filter((k) => cr[k]).map((k) => ({ label: SEO_SITE[k].title, value: UNMEASURED.test(cr[k].value) ? "de verificat" : SEO_SITE[k].result(cr[k]) })),
  } : null;

  const fields: Record<string, UxField> = Object.fromEntries((data.ux?.fields ?? []).map((f) => [f.id, f]));
  const uxPages: UxPage[] = Object.entries(UX_PAGES).filter(([id]) => fields[id]).map(([id, name]) => {
    const f = fields[id];
    const known = f.status !== "necunoscut";
    return {
      id, name, score: known ? f.scor : null,
      verdict: known ? VERDICT_LABEL[verdict(f.scor)] : "De verificat",
      tone: known ? toneOf(f.scor) : "warn",
      found: f.gasit.map(uxSignal), missing: f.lipsa.map(uxSignal),
    };
  });
  const uxChecklist: CheckRow[] = [
    ...uxPages.flatMap((p) => p.missing.map((m) => ({ done: false, title: m.charAt(0).toUpperCase() + m.slice(1), note: UX_FIX[m] ? `${p.name}: ${UX_FIX[m]}` : p.name, result: "de adaugat" }))),
    ...Object.entries(UX_SITE).filter(([k]) => cr[k]).map(([k, c]) => siteRow(c, cr[k])),
  ];
  const measured = (k: string) => (cr[k] && !UNMEASURED.test(cr[k].value) ? cr[k].value : "—");

  const lcpSlow = cr.lcp && cr.lcp.status !== "ok" && !UNMEASURED.test(cr.lcp.value);
  const first = lcpSlow
    ? { title: "Pagina se incarca greu pe telefon", text: `Continutul principal apare dupa ${cr.lcp.value}; tinta e sub 2,5 s.` }
    : problems[0] ? { title: problems[0].title, text: problems[0].problem } : null;

  const domain = data.domain.replace(/^www\./, "");
  return {
    domain,
    cover: verdict(data.scor) === "bun" ? `Ce mai poate castiga ${domain}` : `Unde pierde clienti ${domain}`,
    pages: data.pagesAnalyzed,
    score: data.scor,
    seo: { score: seoScore, zones, problems: problems.slice(0, 4), product, ai: ai.length ? aiCards(ai) : null, checklist: seoChecklist },
    ux: {
      score: data.ux ? data.ux.scor : null,
      speed: { mobile: measured("pagespeed_mobile"), desktop: measured("pagespeed_desktop"), lcp: measured("lcp") },
      pages: uxPages,
      checklist: uxChecklist,
    },
    first,
  };
}

// Open items become checklist rows; what is already fine closes the last slide in a compact two-column block.
// Heights are in units of an open row with its how-to line (measured 2026-09-24 at 1280x720 and in the 1200x675
// PDF: 8 such rows overflow a slide by 20 px, so a slide holds 7.4 units).
const ROW_WITH_NOTE = 1;
const ROW_WITHOUT_NOTE = 0.62;
const DONE_LABEL = 0.5;
const DONE_LINE = 0.65; // one line of the two-column block; a long value can wrap
export function paginateChecklist(rows: CheckRow[], capacity = 7.4): { todo: CheckRow[]; done: CheckRow[] }[] {
  const todo = rows.filter((r) => !r.done);
  const done = rows.filter((r) => r.done);
  const pages: CheckRow[][] = [[]];
  let used = 0;
  for (const r of todo) {
    const h = r.note ? ROW_WITH_NOTE : ROW_WITHOUT_NOTE;
    if (used + h > capacity && pages[pages.length - 1].length) { pages.push([]); used = 0; }
    pages[pages.length - 1].push(r);
    used += h;
  }
  if (done.length && used + DONE_LABEL + Math.ceil(done.length / 2) * DONE_LINE > capacity && pages[pages.length - 1].length) pages.push([]);
  return pages.map((t, i) => ({ todo: t, done: i === pages.length - 1 ? done : [] }));
}
