import type { PageData } from "@/modules/site-audit/model/data/net";
import type { PageCheck } from "@/modules/site-audit/model/types";
import { countH1, parseCanonical, parseMeta, parseTitle } from "@/modules/site-audit/model/parse-page";
import { isCleanUrl } from "./urls";

// ── Section computers ────────────────────────────────────────────────────────

export type SeoPageResult = {
  hasTitle: boolean;
  titleLen: number;
  hasMeta: boolean;
  h1Count: number;
  hasCanonical: boolean;
  urlClean: boolean;
};

export function computeSeoChecks(pages: PageData[]): PageCheck[] {
  const indexableOk = pages.filter((p) => !isNoindex(p)).length;
  const mixedOk = pages.filter((p) => !hasMixedContent(p)).length;
  const results: SeoPageResult[] = pages.map(p => ({
    hasTitle: !!parseTitle(p.html),
    titleLen: parseTitle(p.html).length,
    hasMeta: !!parseMeta(p.html, "description"),
    h1Count: countH1(p.html),
    hasCanonical: !!parseCanonical(p.html),
    urlClean: isCleanUrl(p.url),
  }));

  const total = results.length || 1;
  const titleOk = results.filter(r => r.hasTitle && r.titleLen >= 10 && r.titleLen <= 70).length;
  const metaOk = results.filter(r => r.hasMeta).length;
  const h1Ok = results.filter(r => r.h1Count === 1).length;
  const canonicalOk = results.filter(r => r.hasCanonical).length;
  const urlOk = results.filter(r => r.urlClean).length;

  return [
    {
      id: "title_tag", label: "Title Tag",
      correctCount: titleOk, total,
      problema: `${total - titleOk} pagini au title tag lipsa sau in afara limitei 10-70 caractere. Google truncheaza title-ul in SERP.`,
      fix: "Adauga un title tag unic pe fiecare pagina, intre 50-60 caractere, cu keyword-ul principal la inceput.",
    },
    {
      id: "meta_description", label: "Meta Description",
      correctCount: metaOk, total,
      problema: `${total - metaOk} de pagini nu au meta description. Google genereaza automat un snippet, de obicei irelevant.`,
      fix: "Scrie o meta description unica pentru fiecare pagina, 150-160 caractere, cu un call-to-action clar.",
    },
    {
      id: "h1", label: "Heading H1",
      correctCount: h1Ok, total,
      problema: `${total - h1Ok} pagini au H1 lipsa sau mai mult de un H1. Fara H1 clar, Google nu poate determina topicul principal.`,
      fix: "Asigura-te ca fiecare pagina are exact un H1 care include keyword-ul principal, diferit de title tag.",
    },
    {
      id: "canonical_tags", label: "Tag Canonical",
      correctCount: canonicalOk, total,
      problema: `${total - canonicalOk} pagini nu au tag canonical definit. Google poate indexa versiuni duplicate.`,
      fix: "Adauga <link rel='canonical'> pe fiecare pagina, indicand URL-ul preferat pentru indexare.",
    },
    {
      id: "url_structure", label: "Structura URL",
      correctCount: urlOk, total,
      problema: `${total - urlOk} pagini au URL-uri cu parametri sau caractere speciale.`,
      fix: "Foloseste URL-uri curate cu slug-uri descriptive. Ex: /servicii/implant-dentar in loc de /p?id=123.",
    },
    {
      id: "indexare", label: "Pagini lasate la indexare",
      correctCount: indexableOk, total,
      problema: `${total - indexableOk} pagini care vand (categorii si produse) sunt blocate cu noindex: Google nu le arata deloc in cautari.`,
      fix: "Scoate noindex de pe paginile de categorie si produs; pastreaza-l doar pe cos, cont si cautarea interna.",
    },
    {
      id: "continut_mixt", label: "Resurse sigure (https)",
      correctCount: mixedOk, total,
      problema: `${total - mixedOk} pagini incarca imagini sau scripturi pe http, nu pe https. Browserul le blocheaza sau afiseaza avertismente de securitate.`,
      fix: "Inlocuieste adresele http:// cu https:// in tema, in continut si in setarile de imagini.",
    },
  ];
}

// A money page blocked from Google: meta robots or X-Robots-Tag noindex.
export function isNoindex(p: PageData): boolean {
  const meta = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(p.html) || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(p.html);
  return meta || /noindex/i.test(p.headers["x-robots-tag"] ?? "");
}

// Mixed content: an https page loading src/href resources over plain http (links to other sites are not resources).
export function hasMixedContent(p: PageData): boolean {
  if (!p.url.startsWith("https://")) return false;
  return /<(?:img|script|iframe|source|video|audio)[^>]+src=["']http:\/\//i.test(p.html) || /<link[^>]+rel=["']stylesheet["'][^>]+href=["']http:\/\//i.test(p.html);
}
