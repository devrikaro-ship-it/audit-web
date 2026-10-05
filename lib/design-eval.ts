// The AI evaluation of Part 2 (spec 2026-09-26 §2–§4): per page type, which of the sections that lead to a sale are
// on the page, and whether its design and its content lead to a sale or are filler. One call per page type, on the
// screenshots from page-render.ts and the page text; every verdict must rest on something seen on the page.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { PageShots } from "./page-render";
import type { AiJudgement, SeoRow } from "./types";

export type Kind = "ecom" | "leads";
export type PageKind = "home" | "categorie" | "produs" | "serviciu" | "contact";

export const EVAL_MODEL = "claude-opus-5";

// What each section is, told to the model. The ids match the register rows st_<kind>_<page>_<id> (UX_SECTIONS).
export const SECTIONS: Record<Kind, Partial<Record<PageKind, { id: string; what: string }[]>>> = {
  ecom: {
    home: [
      { id: "hero", what: "the first screen: a heading stating the main benefit and a button leading to the products" },
      { id: "incredere", what: "a trust bar near the top: delivery, returns, payment methods, guarantee" },
      { id: "categorii", what: "the main categories shown with pictures" },
      { id: "populare", what: "popular or best-selling products" },
      { id: "de_ce_noi", what: "reasons to buy from this shop rather than another" },
      { id: "recenzii", what: "customer reviews or other proof (rating, number of customers)" },
      { id: "subsol", what: "a footer with contact, delivery, returns and payment information" },
    ],
    categorie: [
      { id: "titlu_intro", what: "a heading and a short introduction under it" },
      { id: "filtre", what: "filters and sorting" },
      { id: "grila", what: "a product grid where each product shows price, discount, rating and stock" },
      { id: "ghid", what: "a buying guide or frequently asked questions at the end" },
      { id: "inrudite", what: "links to related categories or products" },
    ],
    produs: [
      { id: "galerie", what: "a gallery of several product photos" },
      { id: "nume_pret", what: "the name, the price and the rating together at the top" },
      { id: "variante_buton", what: "the variants (size, colour) and a clear buy button" },
      { id: "livrare_retur", what: "delivery cost and time, returns and guarantee next to the buy button" },
      { id: "beneficii", what: "the product's benefits as bullets" },
      { id: "descriere", what: "a description and specifications" },
      { id: "recenzii", what: "customer reviews on the page" },
      { id: "similare", what: "similar products or products bought together" },
    ],
  },
  leads: {
    home: [
      { id: "hero", what: "the first screen: the result for the client, where the business is, and a booking button or phone" },
      { id: "incredere", what: "a trust bar near the top: years of experience, number of clients, Google rating" },
      { id: "servicii", what: "the main services" },
      { id: "de_ce_noi", what: "reasons to choose this business rather than another" },
      { id: "rezultate", what: "results: before and after, cases" },
      { id: "echipa", what: "the team" },
      { id: "recenzii", what: "client reviews" },
      { id: "proces", what: "how working together goes, step by step" },
      { id: "intrebari", what: "frequently asked questions" },
      { id: "final", what: "a closing call to book, with contact details" },
    ],
    serviciu: [
      { id: "hero", what: "the first screen: the service, the result for the client and a button" },
      { id: "pentru_cine", what: "who the service is for and what problem it solves" },
      { id: "beneficii", what: "the service's benefits" },
      { id: "pasi", what: "how the service goes, step by step" },
      { id: "pret", what: "the price or a starting price" },
      { id: "rezultate", what: "results of the service (before and after)" },
      { id: "recenzii", what: "reviews about this service" },
      { id: "intrebari", what: "answers to questions and objections: price, pain, duration" },
      { id: "final", what: "a closing booking button" },
      { id: "inrudite", what: "links to related services" },
    ],
    contact: [
      { id: "promisiune", what: "what happens after sending the request (for example: we call you within 24 hours)" },
      { id: "formular", what: "a short contact form" },
      { id: "canale", what: "phone, WhatsApp and e-mail" },
      { id: "harta_program", what: "a map, the address and the opening hours" },
      { id: "recenzii", what: "reviews next to the form" },
    ],
  },
};

const SIGNS: Record<Kind, { design: string; content: string }> = {
  ecom: {
    design: "modern and cared for: airy spacing, two or three fonts at most, consistent colours, sharp product photos, no dated patterns (auto-rotating slider, tiny text, crowded side columns, windows covering the page); the first screen says what is sold and to whom; the way to the products and to the cart is obvious",
    content: "short texts readable at a glance; why buy here (price, delivery, guarantee, choice) is clear; descriptions sell benefits, not only specifications; proof (reviews, delivery, returns) near the buy button",
  },
  leads: {
    design: "modern and cared for, with real photos of the place and the team rather than stock pictures, no dated patterns or windows covering the page; the first screen says what is offered, where, and how to book; booking is one tap away",
    content: "short texts readable at a glance; the heading states the client's result; proof (reviews, years, team, results); objections answered (price, pain, duration); a promise of what happens next",
  },
};

const PAGE_LABEL: Record<PageKind, string> = { home: "home page", categorie: "category page", produs: "product page", serviciu: "service page", contact: "contact page" };

const Judge = z.object({
  grade: z.enum(["bun", "de-reglat", "rau"]),
  seen: z.string(),
  problem: z.string(),
  fix: z.string(),
});
const Verdict = z.object({
  sections: z.array(z.object({ id: z.string(), present: z.boolean(), seen: z.string() })),
  hero_first: z.boolean(),
  design: Judge,
  content: Judge,
});
export type VerdictOutput = z.infer<typeof Verdict>;

const SYSTEM = `You judge web pages for a sales audit of Romanian businesses. For each page you get screenshots (the phone first screen, then the desktop page from top to bottom) and the page text.

For every section listed, say whether the page has it. For design and content give a grade: "bun" when it clearly leads the visitor toward buying or contacting, "de-reglat" when it does so only partly, "rau" when it is decoration or filler that does not lead toward a sale.

Rules:
- For a section that is present, "seen" must quote its heading or a short piece of its text, or name it as visible on the screenshots; if you cannot point to it, leave "seen" empty. For a missing section, "seen" may be empty.
- For design and content, "seen" must quote text or name an element; if you cannot point to something, leave it empty.
- A section counts as present only when it shows real content. An empty section — a heading with nothing under it, a widget that did not load — counts as missing; say what you saw in "seen".
- A window that covers the page after it opens makes design at most "de-reglat".
- "problem" is one sentence on what the problem costs the business (a lost visitor, a postponed order); empty when the grade is "bun".
- "fix" is one concrete sentence the owner can act on; empty when the grade is "bun".
- Write in plain Romanian WITHOUT diacritics, for a shop or clinic owner. Use no technical terms: not SEO, H1, meta, schema, CTA, hero, above the fold, UX, UI, landing, bounce, conversion rate.
- Judge only what is on this page.`;

function prompt(kind: Kind, page: PageKind, shots: PageShots): string {
  const sections = (SECTIONS[kind][page] ?? []).map((s) => `- ${s.id}: ${s.what}`).join("\n");
  return [
    `Page type: ${PAGE_LABEL[page]} of ${kind === "ecom" ? "an online shop" : "a service business that wants bookings or contacts"}.`,
    `Sections to check (id: what counts):\n${sections}`,
    `Also say whether the first section on the page is the first screen described above (hero_first).`,
    `Design, signs of a page that sells: ${SIGNS[kind].design}.`,
    `Content, signs of a page that sells: ${SIGNS[kind].content}.`,
    `A window covered the page after it opened: ${shots.popup ? "yes" : "no"}.`,
    shots.shownHeight < shots.pageHeight
      ? `The desktop screenshots show the top ${shots.shownHeight} px of a ${shots.pageHeight} px page: judge the sections below from the page text, which covers the whole page.`
      : "The desktop screenshots show the whole page.",
    `Page text:\n${shots.text}`,
  ].join("\n\n");
}

const judged = (row: string, j: AiJudgement): SeoRow =>
  j.seen.trim() ? { id: row, ok: j.grade === "bun" ? 1 : 0, total: 1, evaluated: true, ai: j } : { id: row, ok: 0, total: 1, verify: true, evaluated: true };

// The rows of one page type, from the model's verdict. A section or a judgement without evidence is "de verificat".
export function rowsFromVerdict(kind: Kind, page: PageKind, v: VerdictOutput): SeoRow[] {
  const said = new Map(v.sections.map((s) => [s.id, s]));
  const sections = (SECTIONS[kind][page] ?? []).map((s): SeoRow => {
    const id = `st_${kind}_${page}_${s.id}`;
    const got = said.get(s.id);
    // A section said to be there must be pointed at; a missing one cannot be quoted, so its absence is the finding.
    if (!got || (got.present && !got.seen.trim())) return { id, ok: 0, total: 1, verify: true, evaluated: true };
    const pass = got.present && (s.id !== "hero" || v.hero_first);
    return { id, ok: pass ? 1 : 0, total: 1, evaluated: true };
  });
  return [...sections, judged(`ai_${page}_design`, v.design), judged(`ai_${page}_content`, v.content)];
}

// Every row of a page type as "de verificat": the page could not be rendered or the call failed.
export function unmeasuredRows(kind: Kind, page: PageKind): SeoRow[] {
  return [...(SECTIONS[kind][page] ?? []).map((s) => `st_${kind}_${page}_${s.id}`), `ai_${page}_design`, `ai_${page}_content`]
    .map((id) => ({ id, ok: 0, total: 1, verify: true, evaluated: true }));
}

type Client = Pick<Anthropic, "beta">;

export async function evaluatePage(client: Client, kind: Kind, page: PageKind, shots: PageShots | null): Promise<SeoRow[]> {
  if (!shots) return unmeasuredRows(kind, page);
  const image = (b: Buffer) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: b.toString("base64") } });
  try {
    const res = await client.beta.messages.parse({
      model: EVAL_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Verdict) },
      system: SYSTEM,
      messages: [{ role: "user", content: [image(shots.phoneTop), ...shots.desktopTiles.map(image), { type: "text", text: prompt(kind, page, shots) }] }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return unmeasuredRows(kind, page);
    return rowsFromVerdict(kind, page, res.parsed_output);
  } catch {
    return unmeasuredRows(kind, page);
  }
}

export function evalClient(apiKey = process.env.ANTHROPIC_API_KEY): Client | null {
  return apiKey ? new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 }) : null;
}

// The whole evaluation of an audit: one page per type photographed and judged, all at once, each page judged as soon
// as it is photographed. Off (null) without an API key or a browser — a local run or a test; a page type without a
// page read is left out.
type Renderer = { render: (url: string) => Promise<PageShots | null>; close: () => Promise<void> };
export async function evaluateDesign(
  kind: Kind,
  targets: Partial<Record<PageKind, string>>,
  deps: { client: Client | null; chrome: string | null; open?: (chrome: string) => Promise<Renderer> },
): Promise<Map<PageKind, SeoRow[]> | null> {
  if (!deps.client || !deps.chrome) return null;
  const pages = (Object.entries(targets) as [PageKind, string | undefined][]).filter((e): e is [PageKind, string] => !!e[1]);
  const open = deps.open ?? (async (chrome: string) => (await import("./page-render")).openRenderer(chrome));
  const renderer = await open(deps.chrome).catch(() => null);
  try {
    const rows = await Promise.all(pages.map(async ([page, url]) => evaluatePage(deps.client!, kind, page, renderer ? await renderer.render(url).catch(() => null) : null)));
    return new Map(pages.map(([page], i) => [page, rows[i]]));
  } finally {
    await renderer?.close().catch(() => {});
  }
}
