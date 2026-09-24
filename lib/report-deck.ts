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
  pages: number;
  score: number;
  seo: { score: number; zones: Zone[]; problems: Problem[]; product: ProductSlide | null; ai: AiCard[] | null; checklist: CheckRow[] };
  ux: { score: number | null; speed: { mobile: string; desktop: string; lcp: string }; pages: UxPage[]; checklist: CheckRow[] };
  first: { title: string; text: string } | null;
};
export type ProductSlide = { checked: number; weakTitles: number; missingMeta: number; pairs: { label: string; value: string }[] };

export const VERDICT_LABEL: Record<Verdict, string> = { bun: "Bun", "de-reglat": "De reglat", slab: "Slab" };
export const toneOf = (score: number): Tone => ({ bun: "good", "de-reglat": "warn", slab: "bad" } as const)[verdict(score)];

// Client language for the page checks whose engine label is technical.
const FRIENDLY: Record<string, string> = {
  kw_in_url: "Cuvantul cautat lipseste din adresa paginii",
  kw_in_h1: "Cuvantul cautat lipseste din titlul paginii",
  kw_in_title: "Cuvantul cautat lipseste din titlul din Google",
  kw_fara_canibalizare: "Pagini care concureaza pe aceeasi cautare",
  kw_categorii: "Cautari fara o categorie dedicata",
  cuvinte_cheie: "Text fara cuvantul pe care il cauta clientii",
  structura_headings: "Pagini fara subtitluri",
  continut_unic: "Text repetat intre pagini",
  lungime_continut: "Pagini cu prea putin text",
  breadcrumbs: "Pagini fara traseu (breadcrumb)",
  internal_linking: "Pagini cu prea putine linkuri interne",
};

// Site-wide checks, in client language, split by the part of the report they belong to.
const SEO_SITE: Record<string, string> = {
  schema_tipuri: "Firma recunoscuta de Google (Organization)",
  schema_produs: "Pret si stoc in Google (schema Product)",
  schema_breadcrumbs: "Traseul paginii in Google (breadcrumb)",
  schema_rating: "Stele (rating) in Google",
  og_tags: "Titlu si descriere la distribuire pe Facebook",
  og_image: "Imagine la distribuire pe Facebook",
  https: "Conexiune securizata (HTTPS)",
  hsts: "HTTPS fortat (HSTS)",
  security_headers: "Headere de securitate",
  imagini_alt: "Text alternativ la imagini",
};
const UX_SITE: Record<string, string> = {
  pagespeed_mobile: "Scor de viteza pe mobil",
  lcp: "Continutul principal apare repede pe telefon",
  cls: "Pagina nu sare in timpul incarcarii",
  inp: "Raspuns rapid la click",
  ttfb: "Server rapid",
  imagini_optimizate: "Imagini in format usor (WebP)",
  favicon: "Iconita in tab (favicon)",
  apple_icon: "Iconita pe ecranul telefonului",
};
const UX_PAGES: Record<string, string> = { home: "Homepage", categorie: "Pagina de categorie", produs: "Pagina de produs", filtre: "Filtre si sortare" };

const UNIT: Record<string, string> = { crawlere: "crawlere", criterii: "criterii", fisier: "fisier", legaturi: "legaturi" };
const unitOf = (c: PageCheck) => UNIT[c.unit ?? ""] ?? "pagini";
const ratio = (c: PageCheck) => c.correctCount / Math.max(c.total, 1);
const pageScore = (cs: PageCheck[]) => Math.round(cs.reduce((s, c) => s + ratio(c) * 100, 0) / Math.max(cs.length, 1));

// A measurement the audit could not take is "de verificat", never a finding (AUDIT-SPEC §5.1).
const UNMEASURED = /indisponibil|nu s-a putut|necunoscut/i;
const siteRow = (title: string, r: CheckResult): CheckRow =>
  UNMEASURED.test(r.value)
    ? { done: false, title, note: "Nu am putut masura din afara site-ului.", result: "de verificat" }
    : { done: r.status === "ok", title, note: "", result: r.value };

function schemaScore(data: AuditData): number {
  const v = Object.entries(data.checksRezultate).filter(([k]) => CHECKS[k]?.sectiune === "schema").map(([, r]) => statusScore(r.status));
  return Math.round(v.reduce((s, x) => s + x, 0) / Math.max(v.length, 1));
}

function aiCards(checks: PageCheck[]): AiCard[] {
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  const tone = (c: PageCheck): Tone => (ratio(c) >= 1 ? "good" : c.correctCount > 0 ? "warn" : "bad");
  const card = (c: PageCheck | undefined, big: (c: PageCheck) => string, text: string, why: string) =>
    c ? [{ label: c.label, big: big(c), text, why, tone: tone(c) }] : [];
  return [
    ...card(by.robots_llm, (c) => `${c.correctCount}/${c.total}`, "robotii AI pe care robots.txt ii lasa sa citeasca site-ul", "Un robot blocat nu poate recomanda magazinul cand cineva intreaba un asistent AI."),
    ...card(by.llms_txt, (c) => (c.correctCount ? "Da" : "Nu"), "fisier llms.txt: rezumatul magazinului scris pentru asistentii AI", "Le spune ce vinzi si ce pagini sa citeasca, ca sa te citeze corect."),
    ...card(by.entitate_ai, (c) => `${c.correctCount}/${c.total}`, "legaturi catre profilurile oficiale ale firmei (Facebook, Instagram)", "Asa isi dau seama asistentii AI ca magazinul e o firma reala, aceeasi de pe retele."),
  ];
}

export function buildDeck(data: AuditData): Deck {
  const cr = data.checksRezultate;
  const ai = data.aiChecks ?? [];
  const zones: Zone[] = [
    { name: "SEO tehnic", what: "Titluri, descrieri, H1, canonical, indexare, adrese", score: pageScore(data.seoChecks) },
    { name: "Continut", what: "Lungime, text unic, subtitluri H2/H3", score: pageScore(data.continutChecks) },
    { name: "Cuvinte cheie", what: "In titlu, H1, adresa, categorii", score: pageScore(data.keywordsChecks) },
    { name: "Structura site", what: "Sitemap, breadcrumbs, linkuri interne", score: pageScore(data.structuraChecks) },
    { name: "Date structurate", what: "Schema: organizatie, produs cu pret, rating", score: schemaScore(data) },
    ...(ai.length ? [{ name: "Vizibilitate in AI", what: "ChatGPT, Claude, Perplexity: acces, llms.txt, identitate", score: pageScore(ai) }] : []),
  ];
  const seoScore = Math.round(zones.reduce((s, z) => s + z.score, 0) / zones.length);

  const pageChecks = [...data.seoChecks, ...data.continutChecks, ...data.keywordsChecks, ...data.structuraChecks, ...ai];
  const failing = pageChecks.filter((c) => ratio(c) < 1).sort((a, b) => ratio(a) - ratio(b));
  const problems: Problem[] = failing.map((c) => ({
    title: FRIENDLY[c.id] ?? c.label,
    count: `${c.total - c.correctCount} din ${c.total} ${unitOf(c)}`,
    tone: ratio(c) < 0.5 ? "bad" : "warn",
    problem: c.problema,
    fix: c.fix,
  }));
  const seoChecklist: CheckRow[] = [
    ...problems.map((p) => ({ done: false, title: p.title, note: p.fix.split("\n")[0], result: p.count })),
    ...Object.entries(SEO_SITE).filter(([k]) => cr[k]).map(([k, t]) => siteRow(t, cr[k])),
  ];

  const ps = data.productSignal;
  const product: ProductSlide | null = ps && ps.checked > 0 ? {
    checked: ps.checked, weakTitles: ps.weakTitles, missingMeta: ps.missingMeta,
    pairs: [
      ["Pret si stoc in Google", "schema_produs"], ["Stele (rating) in Google", "schema_rating"], ["Traseu (breadcrumb) in Google", "schema_breadcrumbs"],
    ].filter(([, k]) => cr[k]).map(([label, k]) => ({ label, value: cr[k].value })),
  } : null;

  const fields: Record<string, UxField> = Object.fromEntries((data.ux?.fields ?? []).map((f) => [f.id, f]));
  const uxPages: UxPage[] = Object.entries(UX_PAGES).filter(([id]) => fields[id]).map(([id, name]) => {
    const f = fields[id];
    const known = f.status !== "necunoscut";
    return {
      id, name, score: known ? f.scor : null,
      verdict: known ? VERDICT_LABEL[verdict(f.scor)] : "De verificat",
      tone: known ? toneOf(f.scor) : "warn",
      found: f.gasit, missing: f.lipsa,
    };
  });
  const uxChecklist: CheckRow[] = [
    ...uxPages.flatMap((p) => p.missing.map((m) => ({ done: false, title: m.charAt(0).toUpperCase() + m.slice(1), note: p.name, result: "de adaugat" }))),
    ...Object.entries(UX_SITE).filter(([k]) => cr[k]).map(([k, t]) => siteRow(t, cr[k])),
  ];
  const measured = (k: string) => (cr[k] && !UNMEASURED.test(cr[k].value) ? cr[k].value : "—");

  const lcpSlow = cr.lcp && cr.lcp.status !== "ok" && !UNMEASURED.test(cr.lcp.value);
  const first = lcpSlow
    ? { title: "Pagina se incarca greu pe telefon", text: `Continutul principal apare dupa ${cr.lcp.value}; tinta e sub 2,5 s.` }
    : problems[0] ? { title: problems[0].title, text: problems[0].problem } : null;

  return {
    domain: data.domain.replace(/^www\./, ""),
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
