import { countWords, decodeEntities, hasFAQ, hasH2, parseTitle } from "@/modules/site-audit/model/parse-page";
import type { PageData } from "@/modules/site-audit/model/data/net";
import type { PageCheck } from "@/modules/site-audit/model/types";
import { extractKeyword } from "./urls";

// Written text of a page: blocks of at least 10 words that end a sentence, outside scripts, styles and the navigation,
// header and footer. Filter lists, menus, labels and product names on cards do not end with a full stop and are left out.
export function textBlocks(html: string): string[] {
  return html
    .replace(/<(script|style|nav|header|footer|noscript)[\s\S]*?<\/\1>/gi, " ")
    .split(/<\/?(?:p|li|div|td|h[1-6]|br|section|article)\b[^>]*>/i)
    .map((b) => decodeEntities(b.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().toLowerCase())
    .filter((b) => b.length >= 60 && b.split(" ").length >= 10 && /[.!?]$/.test(b));
}

// The written text each page has of its own: its blocks minus the site template (blocks found on most pages read),
// with, for every block, the number of pages it appears on.
export function ownWrittenText(pages: PageData[]): { own: string[]; seenOn: Map<string, number> }[] {
  const blocks = pages.map((p) => [...new Set(textBlocks(p.html))]);
  const seenOn = new Map<string, number>();
  for (const bs of blocks) for (const b of bs) seenOn.set(b, (seenOn.get(b) ?? 0) + 1);
  const template = (b: string) => (seenOn.get(b) ?? 0) > Math.max(2, pages.length / 2);
  return blocks.map((bs) => ({ own: bs.filter((b) => !template(b)), seenOn }));
}

// Pages whose own text is at least half copied, block for block, from another page read. Pages with under 200
// characters of own text are left to the thin-text check.
export function duplicateTextPages(pages: PageData[]): number {
  return ownWrittenText(pages).filter(({ own, seenOn }) => {
    const chars = own.reduce((n, b) => n + b.length, 0);
    const copied = own.filter((b) => (seenOn.get(b) ?? 0) > 1).reduce((n, b) => n + b.length, 0);
    return chars >= 200 && copied * 2 >= chars;
  }).length;
}

// Pages whose main heading (the H1, or the title when there is no H1) is identical to another page's.
export function sameHeadingPages(pages: PageData[]): number {
  const heading = (p: PageData) => {
    const h1 = p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
    return (h1.replace(/<[^>]+>/g, " ").trim() || parseTitle(p.html)).replace(/\s+/g, " ").trim().toLowerCase();
  };
  const urls = new Map<string, Set<string>>();
  for (const p of pages) {
    const h = heading(p);
    if (h) urls.set(h, (urls.get(h) ?? new Set()).add(p.url.replace(/\/$/, "")));
  }
  return [...urls.values()].filter((u) => u.size > 1).reduce((n, u) => n + u.size, 0);
}

// Whether a page's own written text uses the words its title starts with (each word, inflections allowed by
// comparing the first 5 letters without diacritics). Null for a page with no own written text or no title.
export function keywordInWrittenText(p: PageData, own: string[]): boolean | null {
  const plain = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = plain(extractKeyword(parseTitle(p.html))).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const text = plain(own.join(" "));
  if (!words.length || !text) return null;
  const textWords = text.split(/[^a-z0-9]+/);
  return words.every((w) => textWords.some((t) => t.startsWith(w.slice(0, 5))));
}

export function computeContinutChecks(pages: PageData[]): PageCheck[] {
  const total = pages.length || 1;
  const wordOk = pages.filter(p => countWords(p.html) >= 400).length;
  const own = ownWrittenText(pages);
  const judged = pages.map((p, i) => keywordInWrittenText(p, own[i].own)).filter((r): r is boolean => r !== null);
  const kwOk = judged.filter(Boolean).length;
  const headingsOk = pages.filter(p => hasH2(p.html)).length;
  const faqOk = pages.filter(p => hasFAQ(p.html)).length;
  const uniqueOk = total - duplicateTextPages(pages);

  return [
    {
      id: "lungime_continut", label: "Lungime continut",
      correctCount: wordOk, total,
      problema: `${total - wordOk} pagini au sub 400 de cuvinte. Continutul subtire semnaleaza lipsa de autoritate.`,
      fix: "Extinde paginile subtiri la minimum 600 cuvinte pentru categorii si 800+ pentru produse/servicii.",
    },
    {
      id: "cuvinte_cheie", label: "Cuvinte cheie relevante",
      correctCount: kwOk, total: judged.length,
      problema: `${judged.length - kwOk} din ${judged.length} pagini cu text nu folosesc in text cuvintele cu care incepe titlul paginii.`,
      fix: "Introduce keyword-ul principal in primele 100 cuvinte si in cel putin un H2.",
    },
    {
      id: "structura_headings", label: "Structura H2/H3",
      correctCount: headingsOk, total,
      problema: `${total - headingsOk} pagini nu au H2 sau H3. Fara ierarhie clara, Google nu poate extrage pasaje pentru featured snippets.`,
      fix: "Structureaza continutul cu H2 pentru sectiuni principale si H3 pentru subsectiuni.",
    },
    {
      id: "faq_autoritate", label: "FAQ si elemente autoritate",
      correctCount: faqOk, total,
      problema: `${total - faqOk} de pagini nu au sectiune FAQ sau date statistice. Aceste elemente cresc probabilitatea de a fi citat in AI Overviews.`,
      fix: "Adauga o sectiune FAQ cu 3-5 intrebari reale. Include date cu sursa si recenzii verificate.",
    },
    {
      id: "continut_unic", label: "Continut unic",
      correctCount: uniqueOk, total,
      problema: `${total - uniqueOk} pagini au cel putin jumatate din textul propriu copiat identic de pe o alta pagina a magazinului.`,
      fix: "Rescrie descrierile duplicate, in special pentru pagini de categorii similare.",
    },
  ];
}

export function computeKeywordsChecks(pages: PageData[]): PageCheck[] {
  const total = pages.length || 1;
  const sameHeading = sameHeadingPages(pages);
  const kwResults = pages.map(p => {
    const title = parseTitle(p.html).toLowerCase();
    const kw = extractKeyword(title);
    if (!kw) return { inTitle: false, inH1: false, inUrl: false };
    const h1 = (p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").toLowerCase();
    const urlPath = new URL(p.url).pathname.toLowerCase();
    return {
      inTitle: title.includes(kw),
      inH1: h1.includes(kw),
      inUrl: urlPath.replace(/-/g, " ").includes(kw),
    };
  });

  return [
    {
      id: "kw_in_title", label: "Keyword in Title Tag", unit: "kw",
      correctCount: kwResults.filter(r => r.inTitle).length, total,
      problema: `${total - kwResults.filter(r => r.inTitle).length} cuvinte cheie nu apar in title tag. Google citeste title tag-ul primul cand decide relevanta.`,
      fix: "Rescrie title tag-ul sa inceapa cu keyword-ul principal. Formula: [Keyword] — [Beneficiu] | [Brand].",
    },
    {
      id: "kw_in_h1", label: "Keyword in H1", unit: "kw",
      correctCount: kwResults.filter(r => r.inH1).length, total,
      problema: `${total - kwResults.filter(r => r.inH1).length} cuvinte cheie lipsesc din H1. H1 e al doilea semnal on-page ca importanta.`,
      fix: "H1-ul fiecarei pagini trebuie sa contina keyword-ul principal formulat natural.",
    },
    {
      id: "kw_in_url", label: "Keyword in URL", unit: "kw",
      correctCount: kwResults.filter(r => r.inUrl).length, total,
      problema: `${total - kwResults.filter(r => r.inUrl).length} pagini au URL-uri care nu reflecta cuvantul cheie targetat.`,
      fix: "Restructureaza URL-urile sa contina keyword-ul. Adauga redirecturi 301 de la URL-urile vechi.",
    },
    {
      id: "kw_fara_canibalizare", label: "Fara canibalizare kw", unit: "kw",
      correctCount: total - sameHeading, total,
      problema: `${sameHeading} pagini au exact acelasi titlu ca o alta pagina a magazinului, deci concureaza in Google pe aceeasi cautare.`,
      fix: "Identifica paginile care concureaza pe acelasi keyword. Alege una principala si diferentiaza continutul celorlalte.",
    },
  ];
}
