// The report as a 16:9 deck in two parts (operator, 2026-09-24): Part 1 SEO, Part 2 UX/UI, each closing with a
// checklist. Pure: AuditData in, the content of every slide out; components/report-deck.tsx only lays it out.
import { CHECKS } from "./problems-db";
import { statusScore, verdict, type Verdict } from "./scoring";
import type { AuditData, CheckResult, PageCheck, SeoComponent, UxField } from "./types";
import { componentScore, rowPass, seoScore as tenScore } from "./seo-score";
import { AI_CARDS, cap, COMPONENTS, COMPONENTS_LEADS, fill, LEGACY_ZONES, PAGE_COPY, ROWS, ROWS_LEADS, SEO_SITE, STAGES, UI, UNIT, UX_FIX, UX_PAGES, UX_SIGNAL_BEFORE_2026_09_24, UX_SITE, VERDICT, WORD, type RowCopy, type SiteCopy } from "./copy-registry";
export { PAGE_COPY } from "./copy-registry";

export type Tone = "good" | "warn" | "bad";
export type Zone = { name: string; what: string; score: number | null };
export type Problem = { title: string; count: string; tone: Tone; problem: string; fix: string };
export type CheckRow = { done: boolean; title: string; note: string; result: string };
export type AiCard = { label: string; big: string; text: string; why: string; tone: Tone };
export type UxPage = { id: string; name: string; score: number | null; verdict: string; tone: Tone; found: string[]; missing: string[] };

// The standard SEO checklist: the same rows in the same order for every shop, grouped by component, each ✓, ✗ or
// "de verificat" (operator, 2026-09-24).
export type StdRow = { state: "ok" | "fail" | "verify"; title: string; result: string; note: string };
export type StdGroup = { name: string; score: number | null; rows: StdRow[] };

export type Deck = {
  domain: string;
  cover: string;
  pages: number;
  score: number;
  seo: { score: number; zones: Zone[]; pills: string[]; problems: Problem[]; product: ProductSlide | null; ai: AiCard[] | null; checklist: CheckRow[]; standard: StdGroup[] | null };
  ux: { score: number | null; speed: { mobile: string; desktop: string; lcp: string }; pages: UxPage[]; checklist: CheckRow[] };
  first: { title: string; text: string } | null;
};
export type ProductSlide = { checked: number; weakTitles: number; missingMeta: number; pairs: { label: string; value: string }[] };

export const VERDICT_LABEL: Record<Verdict, string> = VERDICT;
export const toneOf = (score: number): Tone => ({ bun: "good", "de-reglat": "warn", slab: "bad" } as const)[verdict(score)];

// Every word comes from lib/copy-registry.ts (the finite register); this file only picks and fills.
const nums = (v: string) => v.match(/(\d+) din (\d+)/);
const yesNo = (r: CheckResult) => (r.status === "ok" ? WORD.yes : WORD.missing);
const siteResult = (c: SiteCopy, r: CheckResult): string => {
  if (c.unit) { const m = nums(r.value); return m ? fill(WORD.outOf, { ok: m[1], t: m[2], unit: c.unit }) : yesNo(r); }
  if (c.okText) return r.status === "ok" ? c.okText : fill(WORD.countOf, { n: r.value.match(/\d+/)?.[0] ?? WORD.some, what: c.countText ?? "" });
  return c.kind === "measured" ? r.value : yesNo(r);
};
const uxSignal = (s: string) => UX_SIGNAL_BEFORE_2026_09_24[s] ?? s;
const unitOf = (c: PageCheck) => UNIT[c.unit ?? ""] ?? "pagini";
const ratio = (c: PageCheck) => c.correctCount / Math.max(c.total, 1);
// A check that judged no page (total 0) is not measured, and a check the report has no wording for (retired, such as
// kw_categorii in reports saved before 2026-09-24) is not part of the audit: neither counts in a score or as a problem.
const measuredChecks = (cs: PageCheck[]) => cs.filter((c) => c.total > 0 && PAGE_COPY[c.id]);
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
const siteRow = (c: SiteCopy, r: CheckResult): CheckRow =>
  UNMEASURED.test(r.value)
    ? { done: false, title: c.title, note: WORD.notMeasured, result: WORD.verify }
    : { done: r.status === "ok", title: c.title, note: r.status === "ok" ? "" : c.fix, result: siteResult(c, r) };

function schemaScore(data: AuditData): number {
  const v = Object.entries(data.checksRezultate).filter(([k]) => CHECKS[k]?.sectiune === "schema").map(([, r]) => statusScore(r.status));
  return Math.round(v.reduce((s, x) => s + x, 0) / Math.max(v.length, 1));
}

function aiCards(checks: PageCheck[]): AiCard[] {
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  const tone = (c: PageCheck): Tone => (ratio(c) >= 1 ? "good" : c.correctCount > 0 ? "warn" : "bad");
  const card = (c: PageCheck | undefined, label: string, big: (c: PageCheck) => string, text: string, why: string) =>
    c ? [{ label, big: big(c), text, why, tone: tone(c) }] : [];
  const ratioOf = (c: PageCheck) => fill(WORD.ratio, { ok: c.correctCount, t: c.total });
  return [
    ...card(by.robots_llm, AI_CARDS.robots_llm.label, ratioOf, AI_CARDS.robots_llm.text, AI_CARDS.robots_llm.why),
    ...card(by.llms_txt, AI_CARDS.llms_txt.label, (c) => (c.correctCount ? cap(WORD.yes) : cap(WORD.no)), AI_CARDS.llms_txt.text, AI_CARDS.llms_txt.why),
    ...card(by.entitate_ai, AI_CARDS.entitate_ai.label, ratioOf, AI_CARDS.entitate_ai.text, AI_CARDS.entitate_ai.why),
  ];
}

// Part 1 from the ten SEO components (reports from 2026-09-24): the components as the zone table, the first four
// faults in chain order (an earlier component matters more), and every row in the checklist.
// A lead site reads the same components in its own words (COMPONENTS_LEADS, ROWS_LEADS) and has rows of its own.
function tenComponents(seo: SeoComponent[], leads = false) {
  const component = (id: string) => ({ ...COMPONENTS[id], ...(leads ? COMPONENTS_LEADS[id] : {}) });
  const known = (id: string) => !!ROWS[id] || (leads && !!ROWS_LEADS[id]);
  const copyOf = (id: string) => ({ ...ROWS[id], ...(leads ? ROWS_LEADS[id] : {}) }) as RowCopy;
  const zones: Zone[] = seo.filter((c) => COMPONENTS[c.id]).map((c, i) => ({ name: fill(UI.numbered, { i: i + 1, name: component(c.id).name }), what: component(c.id).what, score: componentScore(c) }));
  const rows = seo.flatMap((c) => c.rows).filter((r) => known(r.id));
  const result = (r: SeoComponent["rows"][number]) => (copyOf(r.id).unit ? fill(WORD.outOf, { ok: r.ok, t: r.total, unit: copyOf(r.id).unit }) : r.ok === r.total ? WORD.yes : WORD.no);
  const faults = rows.filter((r) => rowPass(r) === false);
  const problems: Problem[] = faults.slice(0, 4).map((r) => ({
    title: copyOf(r.id).title,
    count: copyOf(r.id).unit ? fill(WORD.outOf, { ok: r.total - r.ok, t: r.total, unit: copyOf(r.id).unit }) : WORD.repair,
    tone: r.ok / r.total < 0.5 ? "bad" : "warn",
    problem: copyOf(r.id).problem,
    fix: copyOf(r.id).fix,
  }));
  const standard: StdGroup[] = seo.filter((c) => COMPONENTS[c.id]).map((c, i) => ({
    name: fill(UI.numbered, { i: i + 1, name: component(c.id).name }),
    score: componentScore(c),
    rows: c.rows.filter((r) => known(r.id)).map((r): StdRow => {
      const copy = copyOf(r.id);
      const pass = rowPass(r);
      if (pass === null) return { state: "verify", title: copy.title, result: WORD.verify, note: r.total === 0 ? WORD.notMeasured : copy.fix };
      return pass ? { state: "ok", title: copy.title, result: result(r), note: "" } : { state: "fail", title: copy.title, result: result(r), note: copy.fix };
    }),
  }));
  return { score: tenScore(seo), zones, pills: Object.values(STAGES), problems, checklist: [], standard };
}

export function buildDeck(data: AuditData): Deck {
  const cr = withLegacySpeed(data.checksRezultate);
  const ai = data.aiChecks ?? [];
  const zones: Zone[] = [
    { ...LEGACY_ZONES.seo, score: pageScore(data.seoChecks) },
    { ...LEGACY_ZONES.continut, score: pageScore(data.continutChecks) },
    { ...LEGACY_ZONES.keywords, score: pageScore(data.keywordsChecks) },
    { ...LEGACY_ZONES.structura, score: pageScore(data.structuraChecks) },
    { ...LEGACY_ZONES.schema, score: schemaScore(data) },
    ...(ai.length ? [{ ...LEGACY_ZONES.ai, score: pageScore(ai) }] : []),
  ];
  const seoScore = Math.round(zones.reduce((s, z) => s + (z.score ?? 0), 0) / zones.length);

  const pageChecks = [...data.seoChecks, ...data.continutChecks, ...data.keywordsChecks, ...data.structuraChecks, ...ai];
  const failing = measuredChecks(pageChecks).filter((c) => ratio(c) < 1).sort((a, b) => ratio(a) - ratio(b));
  const problems: Problem[] = failing.filter((c) => PAGE_COPY[c.id]).map((c) => {
    const copy = PAGE_COPY[c.id];
    return {
      title: copy.title,
      count: fill(WORD.outOf, { ok: c.total - c.correctCount, t: c.total, unit: unitOf(c) }),
      tone: ratio(c) < 0.5 ? "bad" : "warn",
      problem: fill(copy.problem, { n: c.total - c.correctCount, t: c.total, ok: c.correctCount }),
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
      .filter((k) => cr[k]).map((k) => ({ label: SEO_SITE[k].title, value: UNMEASURED.test(cr[k].value) ? WORD.verify : siteResult(SEO_SITE[k], cr[k]) })),
  } : null;

  const fields: Record<string, UxField> = Object.fromEntries((data.ux?.fields ?? []).map((f) => [f.id, f]));
  const uxPages: UxPage[] = Object.entries(UX_PAGES).filter(([id]) => fields[id]).map(([id, name]) => {
    const f = fields[id];
    const known = f.status !== "necunoscut";
    return {
      id, name, score: known ? f.scor : null,
      verdict: known ? VERDICT_LABEL[verdict(f.scor)] : cap(WORD.verify),
      tone: known ? toneOf(f.scor) : "warn",
      // A page type the audit did not read has nothing found or missing: it is "de verificat" (AUDIT-SPEC §5.1).
      found: known ? f.gasit.map(uxSignal) : [], missing: known ? f.lipsa.map(uxSignal) : [],
    };
  });
  const uxChecklist: CheckRow[] = [
    ...uxPages.flatMap((p) => p.score === null
      ? [{ done: false, title: fill(UI.pageUnreadRow, { page: p.name }), note: UI.pageUnreadNote, result: WORD.verify }]
      : p.missing.map((m) => ({ done: false, title: cap(m), note: UX_FIX[m] ? fill(UI.pageFixNote, { page: p.name, fix: UX_FIX[m] }) : p.name, result: WORD.add }))),
    ...Object.entries(UX_SITE).filter(([k]) => cr[k]).map(([k, c]) => siteRow(c, cr[k])),
  ];
  const measured = (k: string) => (cr[k] && !UNMEASURED.test(cr[k].value) ? cr[k].value : "—");

  const lcpSlow = cr.lcp && cr.lcp.status !== "ok" && !UNMEASURED.test(cr.lcp.value);
  const ten = data.seo?.length ? tenComponents(data.seo, data.siteKind?.type === "leads") : null;
  const topProblem = ten ? ten.problems[0] : problems[0];
  const first = lcpSlow
    ? { title: UI.firstSlowTitle, text: fill(UI.firstSlowText, { lcp: cr.lcp.value }) }
    : topProblem ? { title: topProblem.title, text: topProblem.problem } : null;

  const domain = data.domain.replace(/^www\./, "");
  // With the ten components the overall score is the mean of the two parts, recomputed so a stored report agrees.
  const overall = ten ? (data.ux ? Math.round((ten.score + data.ux.scor) / 2) : ten.score) : data.scor;
  return {
    domain,
    cover: fill(verdict(overall) === "bun" ? UI.coverGood : UI.coverLosing, { domain }),
    pages: data.pagesAnalyzed,
    score: overall,
    seo: ten
      ? { ...ten, product: null, ai: null }
      : { score: seoScore, zones, pills: zones.map((z) => z.name), problems: problems.slice(0, 4), product, ai: ai.length ? aiCards(ai) : null, checklist: seoChecklist, standard: null },
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
  // What is already fine fills the rest of the last slide two per line, then continues on new slides.
  const out = pages.map((t) => ({ todo: t, done: [] as CheckRow[] }));
  let rest = done;
  while (rest.length) {
    const lines = Math.floor((capacity - used - DONE_LABEL) / DONE_LINE);
    if (lines < 1) { out.push({ todo: [], done: [] }); used = 0; continue; }
    out[out.length - 1].done = rest.slice(0, lines * 2);
    rest = rest.slice(lines * 2);
    if (rest.length) { out.push({ todo: [], done: [] }); used = 0; }
  }
  return out;
}

// The standard checklist over slides, groups kept in order: a group heading, then its rows; a ✗ or "de verificat"
// row carries its how-to line and is taller. A group that does not fit continues on the next slide under its name.
const GROUP_HEAD = 0.6;
export function paginateStandard(groups: StdGroup[], capacity = 7.4): StdGroup[][] {
  const pages: StdGroup[][] = [[]];
  let used = 0;
  for (const g of groups) {
    let rows = g.rows;
    while (rows.length) {
      if (used + GROUP_HEAD + ROW_WITHOUT_NOTE > capacity && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      used += GROUP_HEAD;
      const take: StdRow[] = [];
      for (const r of rows) {
        const h = r.note ? ROW_WITH_NOTE : ROW_WITHOUT_NOTE;
        if (take.length && used + h > capacity) break;
        take.push(r);
        used += h;
      }
      pages[pages.length - 1].push({ ...g, rows: take });
      rows = rows.slice(take.length);
      if (rows.length) { pages.push([]); used = 0; }
    }
  }
  return pages;
}

