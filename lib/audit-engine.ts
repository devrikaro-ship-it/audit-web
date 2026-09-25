import type { AuditData, CheckResult, PageCheck, StatusCheck, ProductSignal, UxAudit, UxField, SiteKindInfo, SeoComponent, SeoRow } from "./types";
import { detectEcom, detectPlatform } from "./site-signals";
import { classifySiteKind, SiteKindUnreadable, type SiteKind, type SiteKindVerdict } from "./site-kind";
import { scoreToStatus, scoreToUxStatus, VERDICT_GOOD } from "./scoring";
import { decodeEntities, parseTitle, parseMeta, parseMetaOG, parseCanonical, countH1, hasH2, parseJsonLD, schemaTypes, parseImages, countInternalLinks, countWords, hasBreadcrumbs, hasFAQ } from "./parse-page";
import { classifyFetchedLeadPage, classifyFetchedPage, collectLeadUrls, collectTypedUrls, completeLeadTypes, hasAddToCart, leadPageSignals, leadTemplate, mapWithConcurrency, PAGE_BUDGET, PAGE_FETCH_BUDGET_MS, priceCount, replacementsFor, selectLeadPages, selectPages, type LeadPageType, type LeadTypedUrls, type PageType, type TypedUrls } from "./page-selection";
import { PROFILES, profileFor } from "./platform-knowledge";
import { computeLearning, effectiveProfile, readApprovals } from "./learning";
import { appendObservation, pathPrefixes, readObservations } from "./observations";
import { fetchPagesWithProbe, looksBlocked, openBrowserFetcher, openWithRetry, type PageFetcher } from "./browser-fetch";
import { fetchText, fetchPage, measureTTFB, probeProductFeed, fetchPSI, UNAVAILABLE, type PageData, type PSIResult } from "./net";
import { computeSeoComponents, seoScore } from "./seo-components";
import { fill, PROGRESS, SITE_KIND, UX_SIGNALS, WORD, type ProgressStepId } from "./copy-registry";
import { hasRobotsRules } from "./robots-rules";
import { runSeoProbes } from "./seo-probes";

const MIN_PAGES = 50;        // tinta minima de pagini analizate
const LLM_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot", "CCBot", "Googlebot-Extended"];

// ── HTML parsing utilities: in lib/parse-page (pur + testat) ──────────────────

function isCleanUrl(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    if (search) return false;
    if (/[^a-z0-9\-\/\.\_]/i.test(pathname)) return false;
    return true;
  } catch { return false; }
}

function extractKeyword(title: string): string {
  const clean = title.split(/[|\-–—,:]/)[0].trim().toLowerCase();
  return clean.split(" ").slice(0, 3).join(" ");
}

// ── Fetch utilities: in lib/net (seam de retea, singurul loc cu fetch) ─────────

// Site in spatele unei protectii anti-bot (Cloudflare/challenge) sau pagina goala:
// crawler-ul nu primeste HTML real, deci auditul ar fi fals.
function detectBlocker(homepageHtml: string): string | null {
  const blocked = /Just a moment|cf-mitigated|challenge-platform|Attention Required|_cf_chl|Enable JavaScript and cookies/i.test(homepageHtml);
  const empty = homepageHtml.replace(/\s+/g, "").length < 2000;
  if (blocked) return "Site-ul este in spatele unei protectii anti-bot (Cloudflare/challenge). Crawler-ul nu primeste continutul real, asa ca o parte din verificari pot fi incomplete.";
  if (empty) return "Pagina a raspuns cu foarte putin continut (posibil site JavaScript/SPA sau gol). O parte din verificari pot fi incomplete.";
  return null;
}

// ── Sitemap discovery ────────────────────────────────────────────────────────

function extractSitemapFromRobots(robotsTxt: string, origin: string): string {
  const m = robotsTxt.match(/^Sitemap:\s*(.+)$/im);
  return m?.[1]?.trim() ?? `${origin}/sitemap.xml`;
}

// A lead site's contact page is one of the pages that bring contacts (spec 2026-09-25 §2.4): read there, excluded
// on a shop.
const CONTACT_PAGE = /\/contact(\/|$)/i;
const EXCLUDE_PATTERNS = [
  CONTACT_PAGE, /\/despre(-noi)?(\/|$)/i, /\/about(\/|$)/i,
  /\/termeni(\/|$)/i, /\/terms(\/|$)/i, /\/privac|confidential|gdpr|cookie/i,
  /\/retur|return|livrare|shipping/i, /\/galerie|gallery|echipa|team/i,
  /\/cart|\/checkout|\/my-account|\/contul|\/wishlist/i,
  /\/wp-login|\/wp-admin|\/wp-json|\/feed|\/xmlrpc/i,
  /[?&](utm_|ref=|session|token)/i, /\.(xml|pdf|jpe?g|png|gif|webp|svg|ico|css|js|woff2?|ttf|mp4)(\?|$)/i,
];

// Potrivire pe host ignorand "www." — robots.txt indica des sitemap pe www
// iar auditul ruleaza pe non-www (sau invers). Fara asta, toate URL-urile pica.
function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
  } catch { return false; }
}

export function filterUrls(urls: string[], origin: string, keepContact = false): string[] {
  const seen = new Set<string>();
  return urls.filter(u => {
    if (!sameHost(u, origin)) return false;
    if (EXCLUDE_PATTERNS.some((re) => !(keepContact && re === CONTACT_PAGE) && re.test(u))) return false;
    const key = u.replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Extrage link-uri interne dintr-o pagina (fallback cand sitemap-ul e subtire/absent).
export function extractInternalLinks(html: string, origin: string): string[] {
  const out: string[] = [];
  // Links a visitor follows (<a href>), not the stylesheets and icons of <link href>.
  const re = /<a\b[^>]*?\bhref=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, origin).toString().split("#")[0];
      if (sameHost(abs, origin)) out.push(abs);
    } catch { /* skip */ }
  }
  return out;
}

// ── PageSpeed scoring: fetchPSI in lib/net; aici doar maparea la status ────────

const psiToStatus = scoreToStatus;

function lcpToStatus(lcp: string): StatusCheck {
  const secs = parseFloat(lcp.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (isNaN(secs)) return "atentie";
  if (secs < 2.5) return "ok";
  if (secs < 4) return "atentie";
  return "critic";
}

function clsToStatus(cls: string): StatusCheck {
  const val = parseFloat(cls.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (isNaN(val)) return "atentie";
  if (val < 0.1) return "ok";
  if (val < 0.25) return "atentie";
  return "critic";
}

function inpToStatus(tbt: string): StatusCheck {
  const ms = parseFloat(tbt.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (isNaN(ms)) return "atentie";
  if (ms < 200) return "ok";
  if (ms < 600) return "atentie";
  return "critic";
}

function ttfbToStatus(ms: number): StatusCheck {
  if (ms < 600) return "ok";
  if (ms < 1200) return "atentie";
  return "critic";
}

// ── Robots.txt LLM check ─────────────────────────────────────────────────────

function checkLLMCrawlers(robotsTxt: string): { correctCount: number; total: number } {
  if (!robotsTxt) return { correctCount: 0, total: LLM_CRAWLERS.length };
  const isBlocked = (crawler: string): boolean => {
    const re = new RegExp(`User-agent:\\s*${crawler}[\\s\\S]*?Disallow:\\s*/(?!\\n|$)`, "i");
    return re.test(robotsTxt);
  };
  const allowed = LLM_CRAWLERS.filter(c => !isBlocked(c));
  return { correctCount: allowed.length, total: LLM_CRAWLERS.length };
}

function checkSitemapCriteria(sitemapXml: string, sitemapUrl: string, robotsTxt: string): { correctCount: number; total: number } {
  const criteria = [
    !!sitemapXml && sitemapXml.includes("<loc>"),                // sitemap exists and has URLs
    /<lastmod>/i.test(sitemapXml),                              // has lastmod dates
    robotsTxt.toLowerCase().includes("sitemap:"),                // declared in robots.txt
    !/<url>[\s\S]*?<loc>(?!.*?(noindex|Disallow))/i.test(sitemapXml), // no obviously blocked URLs (simplified)
  ];
  return { correctCount: criteria.filter(Boolean).length, total: criteria.length };
}

// ── Section computers ────────────────────────────────────────────────────────

type SeoPageResult = {
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

// Written text of a page: blocks of at least 10 words that end a sentence, outside scripts, styles and the navigation,
// header and footer. Filter lists, menus, labels and product names on cards do not end with a full stop and are left out.
function textBlocks(html: string): string[] {
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

// GEO / AI search (devrika-seo pillar 9): AI crawler access, llms.txt, and the entity links AI answers rely on.
export function computeAiChecks(robotsTxt: string, llmsTxt: string, pages: PageData[]): PageCheck[] {
  const llmCheck = checkLLMCrawlers(robotsTxt);
  const llmsOk = /^\s*#\s*\S/.test(llmsTxt) && llmsTxt.trim().length >= 100;
  const sameAsCount = sameAsLinks(pages).size;
  return [
    {
      id: "robots_llm", label: "Acces pentru robotii AI", unit: "crawlere",
      correctCount: llmCheck.correctCount, total: llmCheck.total,
      problema: "robots.txt poate bloca crawlerii LLM (GPTBot, ClaudeBot, PerplexityBot). Site-ul nu va fi citat ca sursa in raspunsurile AI.",
      fix: "Adauga in robots.txt:\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /",
    },
    {
      id: "llms_txt", label: "Fisierul llms.txt", unit: "fisier",
      correctCount: llmsOk ? 1 : 0, total: 1,
      problema: "Magazinul nu are un fisier llms.txt: un rezumat al site-ului, scris pentru ChatGPT, Claude si Perplexity, care le spune ce vinzi si ce pagini sa citeasca.",
      fix: "Publica la /llms.txt un rezumat al magazinului: ce vinzi, categoriile principale cu link si paginile importante (livrare, retur, contact).",
    },
    {
      id: "entitate_ai", label: "Identitatea firmei pentru AI", unit: "legaturi",
      correctCount: Math.min(sameAsCount, 2), total: 2,
      problema: "Schema organizatiei nu leaga magazinul de profilurile lui oficiale (Facebook, Instagram, Google). Asistentii AI il recunosc mai greu ca firma reala.",
      fix: "Adauga in schema Organization campul sameAs cu profilurile oficiale ale firmei.",
    },
  ];
}

// Every sameAs URL declared in the JSON-LD of the pages read (organisation profiles: Facebook, Instagram, Wikidata...).
export function sameAsLinks(pages: PageData[]): Set<string> {
  const out = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "sameAs") (Array.isArray(v) ? v : [v]).forEach((u) => typeof u === "string" && /^https?:\/\//.test(u) && out.add(u));
      else walk(v);
    }
  };
  for (const p of pages) parseJsonLD(p.html).forEach(walk);
  return out;
}

export function computeStructuraChecks(
  pages: PageData[],
  robotsTxt: string,
  sitemapXml: string,
  sitemapUrl: string,
  seg: { categories: string[]; products: string[] },
): PageCheck[] {
  const total = pages.length || 1;
  const sitemapCheck = checkSitemapCriteria(sitemapXml, sitemapUrl, robotsTxt);
  // The trail belongs on category and product pages; the home page has none by design.
  const norm = (u: string) => u.replace(/\/$/, "");
  const inner = new Set([...seg.categories, ...seg.products].map(norm));
  const trailPages = pages.filter(p => inner.has(norm(p.url)));
  const breadcrumbsOk = trailPages.filter(p => hasBreadcrumbs(p.html)).length;
  const brokenLinksOk = pages.filter(p => p.status !== 404 && p.status !== 410).length;
  const internalLinkingOk = pages.filter(p => countInternalLinks(p.html, new URL(p.url).hostname) >= 3).length;

  return [
    {
      id: "sitemap_xml", label: "Sitemap XML", unit: "criterii",
      correctCount: sitemapCheck.correctCount, total: sitemapCheck.total,
      problema: "Sitemap-ul nu indeplineste toate criteriile. Fara lastmod si declaratie in robots.txt, Google indexeaza mai rar paginile.",
      fix: "Adauga <lastmod> pentru fiecare URL. Declara sitemap-ul in robots.txt. Trimite-l in Google Search Console.",
    },
    {
      id: "breadcrumbs", label: "Breadcrumbs",
      correctCount: breadcrumbsOk, total: trailPages.length,
      problema: `${trailPages.length - breadcrumbsOk} pagini de categorie si produs nu au breadcrumbs. Breadcrumbs ajuta Google sa inteleaga ierarhia si ofera potential de rich result.`,
      fix: "Adauga breadcrumbs vizibile pe toate paginile. Rank Math si Yoast genereaza automat si schema BreadcrumbList.",
    },
    {
      id: "broken_links", label: "Linkuri broken",
      correctCount: brokenLinksOk, total,
      problema: `${total - brokenLinksOk} pagini returneaza 404 sau 410. Linkurile rupte pierd autoritate SEO.`,
      fix: "Corecteaza sau redirectioneaza (301) toate paginile cu eroare catre URL-urile relevante.",
    },
    {
      id: "internal_linking", label: "Internal linking",
      correctCount: internalLinkingOk, total,
      problema: `${total - internalLinkingOk} pagini nu primesc suficiente linkuri interne. Autoritatea domeniului nu se distribuie corect.`,
      fix: "Adauga 3-5 linkuri interne relevante pe fiecare pagina importanta.",
    },
  ];
}

// Organization subtypes follow schema.org naming (OnlineStore, LocalBusiness, ClothingStore, MedicalBusiness...).
const ORGANIZATION_TYPE = /Organization|Business|Store|Corporation/;

// Each element is looked for where it belongs: the organization on any page, BreadcrumbList on category and product
// pages, rating on product pages. A check whose pages were not read is left out, never reported as missing.
export function computeSchemaChecks(pages: PageData[], seg: { categories: string[]; products: string[] }): Record<string, CheckResult> {
  const norm = (u: string) => u.replace(/\/$/, "");
  const typesOf = new Map(pages.map((p) => [norm(p.url), schemaTypes(p.html)]));
  const union = new Set(pages.flatMap((p) => [...(typesOf.get(norm(p.url)) ?? [])]));
  const inner = [...seg.categories, ...seg.products].map(norm).filter((u) => typesOf.has(u));
  const productPages = seg.products.map(norm).filter((u) => typesOf.has(u));

  const hasOrg = [...union].some((t) => ORGANIZATION_TYPE.test(t));
  const hasProduct = union.has("Product");
  const availabilityOk = !hasProduct || pages.some((p) => /schema\.org\/(InStock|OutOfStock|PreOrder|BackOrder|LimitedAvailability)/.test(p.html));

  const out: Record<string, CheckResult> = {
    schema_markup: {
      status: union.size > 0 ? "ok" : "critic",
      value: union.size > 0 ? [...union].slice(0, 8).join(", ") : "Nicio schema detectata",
    },
    schema_tipuri: {
      status: hasOrg ? "ok" : "atentie",
      value: hasOrg ? "Organization / magazin prezent" : "Lipseste schema Organization",
    },
    schema_validare: {
      status: availabilityOk ? "ok" : "atentie",
      value: availabilityOk ? "Fara erori detectate" : "availability sau itemCondition incorecte",
    },
  };
  // Coverage over the pages of the right type that were read: 80%+ good, some = partial, none = missing.
  const coverage = (id: string, urls: string[], test: (t: string) => boolean, what: string, where: string) => {
    if (urls.length === 0) return;
    const n = urls.filter((u) => [...(typesOf.get(u) ?? [])].some(test)).length;
    const status: StatusCheck = n / urls.length >= 0.8 ? "ok" : n > 0 ? "atentie" : "critic";
    out[id] = { status, value: `${what} pe ${n} din ${urls.length} ${where} verificate` };
  };
  coverage("schema_breadcrumbs", inner, (t) => t === "BreadcrumbList", "BreadcrumbList", "pagini de categorie si produs");
  coverage("schema_rating", productPages, (t) => t === "AggregateRating" || t === "Review", "Rating", "pagini de produs");
  if (productPages.length > 0) {
    const n = productPages.filter((u) => { const t = typesOf.get(u) ?? new Set<string>(); return t.has("Product") && t.has("Offer"); }).length;
    const status: StatusCheck = n / productPages.length >= 0.8 ? "ok" : n > 0 ? "atentie" : "critic";
    out.schema_produs = { status, value: `Product cu pret pe ${n} din ${productPages.length} pagini de produs verificate` };
  }
  return out;
}

function computeSocialChecks(homepage: PageData): Record<string, CheckResult> {
  const html = homepage.html;
  const ogTitle = parseMetaOG(html, "og:title");
  const ogDesc = parseMetaOG(html, "og:description");
  const ogImage = parseMetaOG(html, "og:image");
  const twitterCard = parseMeta(html, "twitter:card");
  const hasFavicon = /rel=["'](?:icon|shortcut icon)["']/i.test(html);
  const hasApple = /rel=["']apple-touch-icon["']/i.test(html);

  return {
    og_tags: {
      status: ogTitle && ogDesc ? "ok" : ogTitle || ogDesc ? "atentie" : "critic",
      value: ogTitle && ogDesc ? "og:title si og:description prezente" : "OG title sau description lipsa",
    },
    og_image: {
      status: ogImage ? "ok" : "critic",
      value: ogImage ? "og:image prezent" : "og:image lipseste",
    },
    twitter_card: {
      status: twitterCard ? "ok" : "critic",
      value: twitterCard ? `twitter:card = ${twitterCard}` : "Twitter Card lipsa",
    },
    favicon: {
      status: hasFavicon ? "ok" : "atentie",
      value: hasFavicon ? "Favicon prezent" : "Favicon lipsa",
    },
    apple_icon: {
      status: hasApple ? "ok" : "atentie",
      value: hasApple ? "Apple Touch Icon prezent" : "apple-touch-icon lipsa",
    },
  };
}

function computeSecurityChecks(homepage: PageData): Record<string, CheckResult> {
  const isHttps = homepage.url.startsWith("https://");
  const hsts = homepage.headers["strict-transport-security"];
  const xframe = homepage.headers["x-frame-options"];
  const xcontent = homepage.headers["x-content-type-options"];

  const images = parseImages(homepage.html);
  const missingAlt = images.filter(i => i.alt === "__MISSING__");
  const largeImages = images.filter(i => !i.src.includes(".webp") && !i.src.includes(".avif"));

  return {
    https: {
      status: isHttps ? "ok" : "critic",
      value: isHttps ? "HTTPS activ" : "Site-ul nu are HTTPS",
    },
    imagini_alt: {
      status: missingAlt.length === 0 ? "ok" : missingAlt.length <= 3 ? "atentie" : "critic",
      value: missingAlt.length === 0 ? "Toate imaginile au alt text" : `${missingAlt.length} imagini fara alt text`,
    },
    imagini_optimizate: {
      status: largeImages.length === 0 ? "ok" : largeImages.length <= 5 ? "atentie" : "critic",
      value: largeImages.length === 0 ? "Imagini in format modern (WebP/AVIF)" : `${largeImages.length} imagini neoptimizate (nu WebP)`,
    },
    hsts: {
      status: hsts ? "ok" : isHttps ? "atentie" : "critic",
      value: hsts ? `HSTS: ${hsts}` : "Header HSTS absent",
    },
    security_headers: {
      status: xframe && xcontent ? "ok" : xframe || xcontent ? "atentie" : "critic",
      value: xframe && xcontent ? "X-Frame-Options si X-Content-Type-Options prezente" : "Headere de securitate lipsa",
    },
  };
}

function ttfbCheck(ttfbMs: number | null): CheckResult {
  if (ttfbMs == null) return { status: "atentie", value: "Nu s-a putut masura" };
  return { status: ttfbToStatus(ttfbMs), value: `${ttfbMs} ms` };
}

export function computeVitezaChecks(mobile: PSIResult | null, desktop: PSIResult | null, ttfbMs: number | null): Record<string, CheckResult> {
  if (!mobile && !desktop) {
    return {
      pagespeed_mobile:  { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" },
      pagespeed_desktop: { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" },
      lcp:  { status: "atentie", value: "Date indisponibile" },
      cls:  { status: "atentie", value: "Date indisponibile" },
      inp:  { status: "atentie", value: "Date indisponibile" },
      ttfb: ttfbCheck(ttfbMs),
    };
  }
  // A side PageSpeed could not measure, and any timing it did not return, stays unavailable ("de verificat").
  const unavailable: CheckResult = { status: "atentie", value: UNAVAILABLE };
  const timing = (v: string | undefined, toStatus: (x: string) => StatusCheck): CheckResult =>
    v && v !== UNAVAILABLE ? { status: toStatus(v), value: v } : unavailable;
  return {
    pagespeed_mobile:  mobile ? { status: psiToStatus(mobile.score), value: `${mobile.score} / 100` } : unavailable,
    pagespeed_desktop: desktop ? { status: psiToStatus(desktop.score), value: `${desktop.score} / 100` } : unavailable,
    lcp:  timing(mobile?.lcp, lcpToStatus),
    cls:  timing(mobile?.cls, clsToStatus),
    inp:  timing(mobile?.tbt, inpToStatus),
    ttfb: ttfbCheck(ttfbMs),
  };
}

// ── UX / UI — analiza pe tipuri de pagina (spec 3.3) ─────────────────────────
// Semnale euristice din HTML-ul fiecarui tip de pagina (home / categorie / produs).
// Cand nu prindem un tip de pagina in crawl -> status "necunoscut" (exclus din medie).

function hasPaginationUi(html: string): boolean {
  return /page\/\d|[?&]paged?=|rel=["']next["']|page-numbers|pagination|nav-links/i.test(html);
}
// Pagination on a category page: present, missing (the page states more products than the prices it shows), or null
// when nothing says the category has more products than it lists, such as a category shown whole on one page.
// A product on sale shows two prices, so the price count can only overstate what is shown, never hide a gap.
export function paginationState(html: string): boolean | null {
  if (hasPaginationUi(html)) return true;
  const totals = [...html.matchAll(/(\d+)\s*(?:produse|rezultate|articole|products|results|items)\b/gi)].map((m) => Number(m[1]));
  const shown = priceCount(html);
  if (!totals.length || shown < 3) return null;
  return Math.max(...totals) > shown ? false : null;
}

function hasSortUi(html: string): boolean {
  return /orderby|sorteaz[aă]|sortare|sort[-_ ]?by|[?&]sort=|["']sort-/i.test(html);
}
function hasFiltersUi(html: string): boolean {
  return /woocommerce-widget-layered-nav|wc-block-attribute-filter|yith-wcan|filtreaz[aă]|facet|filter-options|price_slider|filter-widget|data-filter|["']filters?["']/i.test(html);
}
function hasReviewsUi(html: string): boolean {
  return /aggregaterating|trustpilot|yotpo|judge\.me|stamped|reviews\.io|okendo|recenzii|review-|star-rating|rating-stars|stele/i.test(html);
}
function hasRelatedUi(html: string): boolean {
  return /produse similare|related|s-ar putea sa|recomandate|you may also like|complete the look|cross-sell|upsell/i.test(html);
}
function hasNavUi(html: string): boolean {
  return /<nav[\s>]|role=["']navigation["']|class=["'][^"']*(menu|navbar|main-nav)/i.test(html);
}
function hasIntroText(html: string): boolean {
  const paras = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  return paras.some(p => countWords(p) >= 30);
}
function contentImageCount(html: string): number {
  return parseImages(html).filter(im => !/logo|icon|sprite|badge|payment|placeholder|avatar/i.test(im.src)).length;
}
function hasStockSignal(html: string): boolean {
  return /in stoc|in stock|schema\.org\/instock|stoc epuizat|out of stock|disponibil|availability/i.test(html);
}
function uxField(id: string, label: string, checks: { ok: boolean; g: string; l: string }[], problema: string, fix: string): UxField {
  const gasit = checks.filter(c => c.ok).map(c => c.g);
  const lipsa = checks.filter(c => !c.ok).map(c => c.l);
  const scor = Math.round((gasit.length / checks.length) * 100);
  return { id, label, status: scoreToUxStatus(scor), scor, gasit, lipsa, problema, fix };
}
function uxUnknown(id: string, label: string, problema: string, fix: string, lipsa = "nu am prins acest tip de pagina in crawl"): UxField {
  return { id, label, status: "necunoscut", scor: 0, gasit: [], lipsa: [lipsa], problema, fix };
}

export function computeUxAudit(
  pages: PageData[],
  seg: { homepage: string; categories: string[]; products: string[] },
  mobile: PSIResult | null,
  domain: string,
): UxAudit {
  const norm = (u: string) => u.replace(/\/$/, "");
  const home = pages[0]?.html ?? "";
  const catSet = new Set(seg.categories.map(norm));
  const prodSet = new Set(seg.products.map(norm));
  const catPage = pages.find(p => catSet.has(norm(p.url)))?.html ?? "";
  const prodPage = pages.find(p => prodSet.has(norm(p.url)))?.html ?? "";
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(home);

  const fields: UxField[] = [];

  // 1. Viteza (din PSI mobil)
  if (mobile == null) {
    fields.push(uxUnknown("viteza", "Viteza pe mobil",
      "Fiecare secunda in plus la incarcare inseamna pana la -7% conversii. Pe trafic platit, e buget aruncat direct.",
      "Optimizam imaginile, scripturile si serverul pentru incarcare sub 2.5s pe mobil.", "viteza de masurat"));
  } else {
    const scor = Math.max(0, Math.min(100, Math.round(mobile.score)));
    fields.push({
      id: "viteza", label: "Viteza pe mobil", status: scoreToUxStatus(scor), scor,
      gasit: scor >= VERDICT_GOOD ? [`scor PageSpeed ${scor}/100`] : [],
      lipsa: scor < VERDICT_GOOD ? [`scor PageSpeed ${scor}/100`, mobile.lcp ? `LCP ${mobile.lcp}` : ""].filter(Boolean) : [],
      problema: "Fiecare secunda in plus la incarcare inseamna pana la -7% conversii. Pe trafic platit, e buget aruncat direct.",
      fix: "Optimizam imaginile, scripturile si serverul pentru incarcare sub 2.5s pe mobil.",
    });
  }

  // 2. Homepage (mereu prezent)
  fields.push(uxField("home", "Analiza homepage", [
    { ok: countH1(home) >= 1, g: UX_SIGNALS.home_message.found, l: UX_SIGNALS.home_message.missing },
    { ok: hasNavUi(home), g: UX_SIGNALS.home_menu.found, l: UX_SIGNALS.home_menu.missing },
    { ok: countInternalLinks(home, domain) >= 10, g: UX_SIGNALS.home_paths.found, l: UX_SIGNALS.home_paths.missing },
    { ok: hasViewport, g: UX_SIGNALS.home_mobile.found, l: UX_SIGNALS.home_mobile.missing },
  ], "Homepage-ul e prima impresie. Fara un mesaj clar, meniu vizibil si cale rapida spre produse, vizitatorul pleaca in cateva secunde.",
    "Refacem homepage-ul: hero cu mesaj clar, meniu si categorii vizibile, cale directa spre produse."));

  // 3. Pagina categorie
  if (catPage) {
    fields.push(uxField("categorie", "Analiza pagina categorie", [
      { ok: priceCount(catPage) >= 3 || contentImageCount(catPage) >= 6, g: UX_SIGNALS.cat_grid.found, l: UX_SIGNALS.cat_grid.missing },
      { ok: hasBreadcrumbs(catPage), g: UX_SIGNALS.cat_trail.found, l: UX_SIGNALS.cat_trail.missing },
      ...(paginationState(catPage) === null ? [] : [{ ok: paginationState(catPage) === true, g: UX_SIGNALS.cat_pagination.found, l: UX_SIGNALS.cat_pagination.missing }]),
      { ok: hasIntroText(catPage), g: UX_SIGNALS.cat_intro.found, l: UX_SIGNALS.cat_intro.missing },
    ], "Pagina de categorie e locul unde clientul alege. Fara grila clara, breadcrumbs si text de context, se pierde si pleaca.",
      "Structuram pagina de categorie: grila poza+pret, breadcrumbs, paginare, text de intro optimizat."));
  } else {
    fields.push(uxUnknown("categorie", "Analiza pagina categorie",
      "Pagina de categorie e locul unde clientul alege produsul. Trebuie sa fie clara si usor de rasfoit.",
      "Verificam si structuram paginile de categorie: grila poza+pret, breadcrumbs, paginare, text de intro."));
  }

  // 4. Pagina produs
  if (prodPage) {
    fields.push(uxField("produs", "Analiza pagina produs", [
      { ok: contentImageCount(prodPage) >= 3, g: UX_SIGNALS.prod_images.found, l: UX_SIGNALS.prod_images.missing },
      { ok: priceCount(prodPage) >= 1 && hasStockSignal(prodPage), g: UX_SIGNALS.prod_price.found, l: UX_SIGNALS.prod_price.missing },
      { ok: hasAddToCart(prodPage), g: UX_SIGNALS.prod_cart.found, l: UX_SIGNALS.prod_cart.missing },
      { ok: countWords(prodPage) >= 200, g: UX_SIGNALS.prod_description.found, l: UX_SIGNALS.prod_description.missing },
      { ok: hasReviewsUi(prodPage), g: UX_SIGNALS.prod_reviews.found, l: UX_SIGNALS.prod_reviews.missing },
      { ok: hasRelatedUi(prodPage), g: UX_SIGNALS.prod_related.found, l: UX_SIGNALS.prod_related.missing },
    ], "Pagina de produs e locul deciziei de cumparare. Imagini, pret, stoc, buton clar, descriere, recenzii si recomandari — fiecare care lipseste scade comenzile.",
      "Completam pagina de produs: galerie, pret+stoc vizibil, buton clar, descriere, recenzii, produse similare."));
  } else {
    fields.push(uxUnknown("produs", "Analiza pagina produs",
      "Pagina de produs e locul deciziei de cumparare — imagini, pret, stoc, buton clar, descriere, recenzii.",
      "Verificam si completam paginile de produs: galerie, pret+stoc, buton clar, descriere, recenzii, produse similare."));
  }

  // 5. Filtre & sortare (din categorie daca exista, altfel din tot corpus-ul)
  const filterHtml = catPage || pages.map(p => p.html).join("\n");
  fields.push(uxField("filtre", "Filtre & sortare", [
    { ok: hasFiltersUi(filterHtml), g: UX_SIGNALS.filters.found, l: UX_SIGNALS.filters.missing },
    { ok: hasSortUi(filterHtml), g: UX_SIGNALS.sort.found, l: UX_SIGNALS.sort.missing },
  ], "Catalog fara filtre si sortare = clientul nu-si gaseste rapid produsul si pleaca. Filtrele cresc direct rata de gasire si comenzile.",
    "Implementam filtre (marime, culoare, pret, brand) + sortare pe categorii."));

  const scored = fields.filter(f => f.status !== "necunoscut");
  const scor = scored.length ? Math.round(scored.reduce((a, f) => a + f.scor, 0) / scored.length) : 0;
  return { scor, fields };
}

// ── Part 2 as a ✓/✗ checklist, both kinds of site (spec 2026-09-25 §4) ──────────
// Rows share the SEO rows' shape: ok of total, total 0 = not measured, verify = cannot be told from outside. The score
// is the share of ✓ (lib/seo-score.ts). Lead signals measured 2026-09-25 on dentalview.ro and piontaniservices.ro.
const uxRow = (id: string, ok: number, total: number, verify = false): SeoRow => ({ id, ok, total, ...(verify ? { verify } : {}) });
const yes = (id: string, pass: boolean | null): SeoRow => uxRow(id, pass ? 1 : 0, pass === null ? 0 : 1);
const onPages = (id: string, pages: PageData[], pass: (p: PageData) => boolean): SeoRow => uxRow(id, pages.filter(pass).length, pages.length);
const readableOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
// A phone in the header: a phone link before the page's main heading (both sites: header phone, H1 further down).
const phoneBeforeHeading = (html: string) => {
  const body = html.slice(Math.max(0, html.search(/<body/i)));
  const tel = body.search(/href=["']tel:/i);
  const h1 = body.search(/<h1/i);
  return tel >= 0 && (h1 >= 0 ? tel < h1 : tel < body.length * 0.2);
};
// A button or link that asks to book, for a quote or to get in touch.
const ASK_CONTROL = /<(a|button)\b[^>]*>[^<]*(?:<[^>]+>[^<]*){0,3}(programeaz|programare|solicit[ăa]\s+(o\s+)?ofert|cere(ti)?\s+(o\s+)?ofert|contacteaz|contact|suna|book|get a quote)/i;
// A contact form: a phone or email field, at most five fields a visitor fills (the site search box is not one).
const shortContactForm = (html: string) => (html.match(/<form[\s\S]*?<\/form>/gi) ?? []).some((f) => {
  const fields = f.match(/<(input|select|textarea)\b(?![^>]*type=["']?(hidden|submit|button|checkbox|radio|image|reset)\b)[^>]*>/gi) ?? [];
  return /type=["']?(email|tel)\b|name=["'][^"']*(email|phone|telefon|tel)\b/i.test(f) && fields.length >= 2 && fields.length <= 5;
});
// A WhatsApp link or a chat widget: the word "whatsapp" alone matched an image file name on dentalview.ro.
const CHAT = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|embed\.tawk\.to|tawkTo|code\.tidio|client\.crisp\.chat|smartsuppchat|livechatinc|zopim|widget\.intercom|customerchat|msg-item-whatsapp/i;
const MAP = /google\.[a-z.]+\/maps|maps\.google\.|<iframe[^>]*maps/i;
const HOURS = /luni\s*[-–]\s*(vineri|sambata|sâmbătă)|\bL\s*[-–]\s*V\b|opening hours|openingHours|program(ul)?\s*(de lucru)?\s*:/i;
const REVIEWS = /testimonial|recenzi|pareri|p[ăa]rerea|ce spun|review|aggregaterating|trustpilot|google-reviews|stele/i;
const TEAM = /\bechip[aei]|\bmedicii\b|\bspecialist|\bdr\.\s|\bdoctor|\bteam\b/i;
const CERTS = /certific|acredit|parteneri|\biso\s?\d|autorizat|premi(u|i|ul)|award/i;
const lcpSeconds = (lcp: string) => { const m = lcp.replace(",", ".").match(/([\d.]+)\s*(ms|s)\b/i); return m ? Number(m[1]) / (m[2].toLowerCase() === "ms" ? 1000 : 1) : null; };

export function computeUxStandard(
  kind: "ecom" | "leads",
  pages: PageData[],
  seg: { categories: string[]; products: string[]; services: string[]; locations: string[] },
  mobile: PSIResult | null,
  domain: string,
): SeoComponent[] {
  const norm = (u: string) => u.replace(/\/$/, "");
  const pick = (urls: string[]) => { const set = new Set(urls.map(norm)); return pages.filter((p) => set.has(norm(p.url))); };
  const home = pages[0]?.html ?? "";
  const lcp = mobile ? lcpSeconds(mobile.lcp) : null;
  const viteza: SeoComponent = { id: "viteza", rows: [
    yes("viteza_scor", mobile ? Math.round(mobile.score) >= VERDICT_GOOD : null),
    yes("viteza_lcp", lcp === null ? null : lcp <= 2.5),
  ] };
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(home);
  if (kind === "leads") {
    const services = pick(seg.services);
    const own = new Map(ownWrittenText(pages).map((o, i) => [norm(pages[i].url), o.own.reduce((n, b) => n + b.length, 0)]));
    const serviceUrls = new Set(services.map((p) => norm(p.url).replace(/^https?:\/\/(www\.)?/, "")));
    // Links in the page's own content: header, menu and footer elements removed, then links most pages still carry
    // (a footer built from divs, as on dentalview.ro) left out. A related link to a service the menu also lists counts.
    const withoutChrome = (html: string) => html.replace(/<(header|nav|footer|aside)\b[\s\S]*?<\/\1>/gi, " ");
    const linksOf = (p: PageData) => new Set([...withoutChrome(p.html).matchAll(/href=["']([^"'#]+)["']/gi)]
      .map((m) => { try { return norm(new URL(m[1], p.url).href.replace(/[?#].*$/, "")).replace(/^https?:\/\/(www\.)?/, ""); } catch { return ""; } }));
    const linkCount = new Map<string, number>();
    for (const p of pages) for (const l of linksOf(p)) linkCount.set(l, (linkCount.get(l) ?? 0) + 1);
    const templateLink = (l: string) => (linkCount.get(l) ?? 0) > pages.length / 2;
    const relatedLinks = (p: PageData) => [...linksOf(p)]
      .filter((u) => serviceUrls.has(u) && !templateLink(u) && u !== norm(p.url).replace(/^https?:\/\/(www\.)?/, "")).length;
    const anyPage = (re: RegExp, text = false) => pages.some((p) => re.test(text ? readableOf(p.html) : p.html));
    return [
      viteza,
      { id: "home", rows: [
        yes("lead_home_offer", countH1(home) >= 1),
        yes("lead_home_phone", phoneBeforeHeading(home)),
        yes("lead_home_cta", ASK_CONTROL.test(home)),
        yes("home_mobile", viewport),
      ] },
      { id: "serviciu", rows: [
        onPages("srv_explains", services, (p) => (own.get(norm(p.url)) ?? 0) >= 200),
        onPages("srv_price", services, (p) => priceCount(p.html.replace(/<script[\s\S]*?<\/script>/gi, " ")) > 0 || /\bde la\s+\d/i.test(readableOf(p.html))),
        onPages("srv_cta", services, (p) => ASK_CONTROL.test(p.html) || shortContactForm(p.html)),
        // When the template itself links the services (a div footer), a content link to the same service cannot be told
        // from it: a failing row is then "de verificat", never a finding (AUDIT-SPEC §5.1).
        ((r) => (r.ok < r.total && [...linkCount.keys()].filter((l) => templateLink(l) && serviceUrls.has(l)).length >= 2 ? { ...r, verify: true } : r))(
          onPages("srv_related", services, (p) => relatedLinks(p) >= 2)),
      ] },
      { id: "contact", rows: [
        yes("ct_form_short", pages.some((p) => shortContactForm(p.html))),
        yes("ct_call", anyPage(/href=["']tel:/i)),
        yes("ct_chat", anyPage(CHAT)),
        yes("ct_map", pages.some((p) => MAP.test(p.html) && /\b(str|strada|bd|bdul|bulevardul|calea|sos|soseaua|aleea|piata|intrarea|splaiul)\.?\s+[A-Z0-9]/i.test(readableOf(p.html)))),
        yes("ct_hours", anyPage(HOURS, true) || anyPage(/openingHours/i)),
      ] },
      { id: "incredere", rows: [
        yes("tr_reviews", anyPage(REVIEWS, true) || anyPage(/aggregateRating/i)),
        yes("tr_team", anyPage(TEAM, true)),
        yes("tr_certs", anyPage(CERTS, true)),
        uxRow("tr_photos", 0, 1, true),
      ] },
    ];
  }
  const cat = pick(seg.categories)[0]?.html ?? "";
  const prod = pick(seg.products)[0]?.html ?? "";
  const on = (html: string, id: string, pass: () => boolean) => yes(id, html ? pass() : null);
  const pagination = cat ? paginationState(cat) : null;
  const filterHtml = cat || pages.map((p) => p.html).join("\n");
  return [
    viteza,
    { id: "home", rows: [
      yes("home_message", countH1(home) >= 1),
      yes("home_menu", hasNavUi(home)),
      yes("home_paths", countInternalLinks(home, domain) >= 10),
      yes("home_mobile", viewport),
    ] },
    { id: "categorie", rows: [
      on(cat, "cat_grid", () => priceCount(cat) >= 3 || contentImageCount(cat) >= 6),
      on(cat, "cat_trail", () => hasBreadcrumbs(cat)),
      ...(pagination === null ? [] : [yes("cat_pagination", pagination)]),
      on(cat, "cat_intro", () => hasIntroText(cat)),
    ] },
    { id: "produs", rows: [
      on(prod, "prod_images", () => contentImageCount(prod) >= 3),
      on(prod, "prod_price", () => priceCount(prod) >= 1 && hasStockSignal(prod)),
      on(prod, "prod_cart", () => hasAddToCart(prod)),
      on(prod, "prod_description", () => countWords(prod) >= 200),
      on(prod, "prod_reviews", () => hasReviewsUi(prod)),
      on(prod, "prod_related", () => hasRelatedUi(prod)),
    ] },
    { id: "filtre", rows: [
      yes("filters", hasFiltersUi(filterHtml)),
      yes("sort", hasSortUi(filterHtml)),
    ] },
  ];
}

// ── Semnal produse neoptimizate (carlig Catamo) ──────────────────────────────
// Constatare standard, mereu-prezenta pe ecom. Cand prindem pagini de produs,
// o ancoram in numere reale (titluri scurte/generice, meta lipsa); altfel generica.

function computeProductSignal(pages: PageData[], productUrls: string[], hasProductFeed: boolean): ProductSignal {
  const productSet = new Set(productUrls.map(u => u.replace(/\/$/, "")));
  const prods = pages.filter(p => productSet.has(p.url.replace(/\/$/, "")));
  let weakTitles = 0, missingMeta = 0;
  for (const p of prods) {
    const title = parseTitle(p.html);
    const words = title.split(/\s+/).filter(Boolean).length;
    if (title.length < 45 || words < 4) weakTitles++;
    if (!parseMeta(p.html, "description")) missingMeta++;
  }
  const checked = prods.length;
  // Only what was measured on the product pages read; never a generic claim (the report is public).
  let headline: string;
  let message: string;
  if (checked > 0 && (weakTitles > 0 || missingMeta > 0)) {
    const parti: string[] = [];
    if (weakTitles > 0) parti.push(`${weakTitles} au titluri scurte sau generice`);
    if (missingMeta > 0) parti.push(`${missingMeta} nu au descriere pentru Google`);
    headline = "Paginile de produs pot fi gasite mai usor in Google";
    message = `Am verificat ${checked} pagini de produs si ${parti.join(" iar ")}. Titlul si descrierea sunt textele pe care Google le citeste ca sa decida pe ce cautari iti arata produsul. Scrise complet, cu numele produsului, marca si detaliile cautate, acelasi catalog apare pe mai multe cautari, fara buget suplimentar.`;
  } else if (checked > 0) {
    headline = "Paginile de produs au titluri si descrieri completate";
    message = `Am verificat ${checked} pagini de produs: titlurile sunt suficient de descriptive si fiecare are descriere pentru Google.`;
  } else {
    headline = "Paginile de produs — de verificat";
    message = "Nu am putut citi pagini de produs in aceasta analiza, asa ca titlurile si descrierile lor raman de verificat.";
  }

  return { checked, weakTitles, missingMeta, hasFeed: hasProductFeed, headline, message };
}

// The kind of site from the home page (lib/site-kind.ts); a visitor's choice wins. A home page too thin to read gives
// no scan verdict: then only a visitor's choice decides, else the old page-wide shop test does (null here).
export function decideSiteKind(homeHtml: string, url: string, visitor?: SiteKind): SiteKindInfo | null {
  let scan: SiteKindVerdict | null = null;
  try { scan = classifySiteKind(homeHtml, url); } catch (e) { if (!(e instanceof SiteKindUnreadable)) throw e; }
  if (visitor) return { type: visitor, by: "visitor", confidence: scan?.confidence ?? null, evidence: scan?.evidence ?? null };
  return scan ? { type: scan.type, by: "scan", confidence: scan.confidence, evidence: scan.evidence } : null;
}

// ── Conversie / bani pierduti (PPC) ──────────────────────────────────────────

// kind: the visitor's correction of the kind of site; it wins over the scan, whose verdict is kept as evidence.
// onStep: the waiting screen's steps (spec 2026-09-25 §6), reported as the engine runs them, each with what it measured.
export type StepReport = (id: ProgressStepId, state: "running" | "done" | "unmeasured", result?: string) => void;
export async function runAudit(rawUrl: string, opts: { kind?: SiteKind; onStep?: StepReport } = {}): Promise<AuditData> {
  const step: StepReport = (id, state, result) => { try { opts.onStep?.(id, state, result); } catch { /* the audit never depends on the screen */ } };
  const startedAt = Date.now();
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  url = url.replace(/\/$/, "");
  const origin = new URL(url).origin;
  const domain = new URL(url).hostname;

  // Phase 1: platform first (its profile says how to read the site), then robots.txt + sitemap -> pages that sell
  const homepage = origin + "/";
  step("citire", "running");
  const homeDirect = await fetchPage(homepage);
  // A shop that blocks the server's datacenter IP is read through the real browser (lib/browser-fetch.ts).
  let browserFetcher: PageFetcher | null = null;
  const openFetcher = async () => {
    if (!browserFetcher) browserFetcher = await openWithRetry(() => openBrowserFetcher(origin));
    return browserFetcher;
  };
  if (looksBlocked(homeDirect.ok, homeDirect.html)) await openFetcher();
  const readText = (u: string) => (browserFetcher ? browserFetcher.fetchText(u) : fetchText(u));
  const readPage = (u: string) => (browserFetcher ? browserFetcher.fetchPage(u) : fetchPage(u));
  const homeHtmlEarly = browserFetcher ? (browserFetcher as PageFetcher).homeHtml : homeDirect.html;
  // Curated profile + what the audits learned and passed the safety gate (lib/learning.ts).
  const learning = computeLearning(await readObservations(), PROFILES, await readApprovals());
  const profile = effectiveProfile(profileFor(detectPlatform(homeHtmlEarly.slice(0, 400000))), learning);
  const language = homeHtmlEarly.match(/<html[^>]*\blang=["']?([a-z]{2})/i)?.[1]?.toLowerCase() ?? null;
  const platformName = detectPlatform(homeHtmlEarly.slice(0, 400000));
  // The kind of site decides which pages are read: a shop's categories and products, or a lead site's services and
  // locations (spec 2026-09-25 §2).
  const siteKind = decideSiteKind(homeHtmlEarly, homepage, opts.kind);
  const leads = siteKind?.type === "leads";
  step("citire", "done", siteKind ? fill(PROGRESS.platformKind, { platform: platformName ?? PROGRESS.anySite, kind: SITE_KIND[siteKind.type] }) : platformName ?? PROGRESS.anySite);
  step("robots", "running");
  const robotsTxt = await readText(`${origin}/robots.txt`);
  // Read before the page burst: rate-limiting shops (Shopify) refuse small files requested right after it.
  const llmsTxt = await readText(`${origin}/llms.txt`);
  const sitemapUrl = extractSitemapFromRobots(robotsTxt, origin);
  const sitemapXml = await readText(sitemapUrl);
  const sitemapCandidates = [sitemapUrl, ...profile.sitemapEntryPoints.map((p) => origin + p)];
  let typed: TypedUrls = { product: [], category: [], other: [] };
  let leadTyped: LeadTypedUrls = { service: [], location: [], other: [] };
  // The sitemap the pages were actually read from: robots.txt may not declare it (piontaniservices.ro) while the
  // platform's usual address has it.
  let foundSitemapXml = sitemapXml;
  for (const sm of [...new Set(sitemapCandidates)]) {
    const xml = sm === sitemapUrl ? sitemapXml : await readText(sm);
    if (!xml) continue;
    if (leads) {
      const found = await collectLeadUrls(xml, readText, sm, { profile });
      const own: LeadTypedUrls = { service: filterUrls(found.service, origin, true), location: filterUrls(found.location, origin, true), other: filterUrls(found.other, origin, true) };
      if (own.service.length + own.location.length + own.other.length > 0) { foundSitemapXml = xml; leadTyped = own; typed = { product: [], category: [], other: [...own.service, ...own.location, ...own.other] }; break; }
      continue;
    }
    const found = await collectTypedUrls(xml, readText, sm, { profile, language });
    const own: TypedUrls = { product: filterUrls(found.product, origin), category: filterUrls(found.category, origin), other: filterUrls(found.other, origin) };
    if (own.product.length + own.category.length + own.other.length > 0) { foundSitemapXml = xml; typed = own; break; }
  }

  const listedCount = typed.product.length + typed.category.length + typed.other.length;
  step("robots", "done", [hasRobotsRules(robotsTxt) ? PROGRESS.robotsFound : PROGRESS.robotsMissing, listedCount ? fill(PROGRESS.sitemapPages, { n: listedCount }) : PROGRESS.sitemapMissing].join(" · "));
  step("alegere", "running");

  // Every page the sitemap lists, before home page links are added: a lead site's "listed in the sitemap" row.
  const siteKey = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();
  const listedInSitemap = new Set([...typed.product, ...typed.category, ...typed.other, ...leadTyped.service, ...leadTyped.location, ...leadTyped.other].map(siteKey));

  // No typed sitemap: the homepage links (menu, featured products) come before untyped sitemap order.
  if (typed.product.length === 0 && typed.category.length === 0) {
    const homeLinks = filterUrls(extractInternalLinks(homeHtmlEarly, origin), origin);
    typed.other = [...homeLinks, ...typed.other];
  }
  const select = () => {
    if (!leads) return selectPages(homepage, typed);
    const known = new Set([...leadTyped.service, ...leadTyped.location, ...leadTyped.other]);
    leadTyped = completeLeadTypes({ ...leadTyped, other: [...leadTyped.other, ...typed.other.filter((u) => !known.has(u))] });
    return selectLeadPages(homepage, leadTyped);
  };
  let { urls: toAnalyze, planned } = select() as { urls: string[]; planned: Map<string, string> };

  // Fallback link-crawl: sitemap absent/blocat -> link-uri interne din primele pagini descoperite.
  if (toAnalyze.length < MIN_PAGES) {
    let discovered = filterUrls(extractInternalLinks(homeHtmlEarly, origin), origin);
    for (const seed of discovered.slice(0, 5)) {
      if (toAnalyze.length + discovered.length >= PAGE_BUDGET) break;
      discovered = discovered.concat(filterUrls(extractInternalLinks(await readText(seed), origin), origin));
    }
    typed.other = [...typed.other, ...discovered];
    ({ urls: toAnalyze, planned } = select() as { urls: string[]; planned: Map<string, string> });
  }

  const plannedOf = (t: string) => [...planned.values()].filter((x) => x === t).length;
  step("alegere", "done", leads ? fill(PROGRESS.chosenLeads, { n: toAnalyze.length - 1 }) : fill(PROGRESS.chosenShop, { c: plannedOf("category"), p: plannedOf("product") }));

  // The small SEO checks (redirects, www, sitemap sample, sort parameter) before the page burst, like llms.txt.
  const listedSample = leads ? [...leadTyped.service, ...leadTyped.location, ...leadTyped.other].slice(0, 20) : [...typed.category.slice(0, 10), ...typed.product.slice(0, 10)];
  const probes = await runSeoProbes(origin, listedSample, leads ? null : typed.category[0] ?? null, foundSitemapXml)
    .catch(() => ({ sitemapLastmod: null, httpToHttps: null, maxRedirectHops: null, variantsSameHost: null, sitemapSample: { ok: 0, total: 0 }, sortParamHandled: null }));

  // Phase 2: Fetch pages at the pace the platform accepts (profile.concurrency); the screen counts them as they come.
  step("pagini", "running");
  let readCount = 0;
  const counted = (read: (u: string) => Promise<PageData>) => async (u: string) => {
    const p = await read(u);
    if (p.ok) step("pagini", "running", fill(PROGRESS.pagesRead, { n: ++readCount }));
    return p;
  };
  const fetchDeadline = Date.now() + PAGE_FETCH_BUDGET_MS;
  const fetched = (list: (PageData | undefined)[]) => list.filter((p): p is PageData => !!p);
  const viaBrowser = (fetcher: PageFetcher) => async (urls: string[]) =>
    fetched(await mapWithConcurrency(urls, profile.concurrency, counted((u) => fetcher.fetchPage(u)), Date.now() + PAGE_FETCH_BUDGET_MS));
  const { pages, usedBrowser } = await fetchPagesWithProbe<PageData>(
    toAnalyze,
    async (urls) => fetched(await mapWithConcurrency(urls, profile.concurrency, counted(readPage), fetchDeadline)),
    async () => { const f = await openFetcher(); return f ? viaBrowser(f) : null; },
  );
  const failedTypes = pages.slice(1).filter((p) => !p.ok).map((p) => planned.get(p.url) ?? "other");
  if (failedTypes.length > 0 && Date.now() < fetchDeadline) {
    const refill = leads ? replacementsFor(failedTypes as LeadPageType[], leadTyped, new Set(toAnalyze)) : replacementsFor(failedTypes as PageType[], typed, new Set(toAnalyze));
    pages.push(...fetched(await mapWithConcurrency(refill.urls, profile.concurrency, counted(readPage), fetchDeadline)));
    refill.planned.forEach((t, u) => planned.set(u, t));
  }
  await (browserFetcher as PageFetcher | null)?.close();

  const analyzedPages = pages.filter(p => p.ok);
  step("pagini", "done", fill(PROGRESS.pagesRead, { n: analyzedPages.length }));
  step("viteza", "running");
  const normUrl = (u: string) => u.replace(/\/$/, "");
  // A lead page is typed against the site's own template: what most pages read carry.
  const template = leadTemplate(analyzedPages.slice(1).map((p) => leadPageSignals(p.html)));
  const leadPageType = new Map(leads ? analyzedPages.slice(1).map((p) => [normUrl(p.url), classifyFetchedLeadPage(p.url, p.html, (planned.get(normUrl(p.url)) ?? "other") as LeadPageType, template)]) : []);
  const leadPages = leads ? { service: [...leadPageType].filter(([, t]) => t === "service").map(([u]) => u), location: [...leadPageType].filter(([, t]) => t === "location").map(([u]) => u) } : undefined;
  const pageType = new Map(leads ? [] : analyzedPages.slice(1).map((p) => [normUrl(p.url), classifyFetchedPage(p.html, (planned.get(normUrl(p.url)) ?? "other") as PageType)]));
  const products = [...pageType].filter(([, t]) => t === "product").map(([u]) => u);
  const categories = [...pageType].filter(([, t]) => t === "category").map(([u]) => u);
  const homepageData = analyzedPages[0] ?? pages[0] ?? { url: homepage, html: "", status: 0, headers: {}, ok: false };

  // Phase 3: PSI + TTFB + feed produse (parallel, homepage/origin only)
  const [mobileResult, desktopResult, ttfbResult, feedResult] = await Promise.allSettled([
    fetchPSI(origin, "mobile"),
    fetchPSI(origin, "desktop"),
    measureTTFB(origin),
    probeProductFeed(origin),
  ]);
  const mobile = mobileResult.status === "fulfilled" ? mobileResult.value : null;
  const desktop = desktopResult.status === "fulfilled" ? desktopResult.value : null;
  const ttfbMs = ttfbResult.status === "fulfilled" ? ttfbResult.value : null;
  const hasProductFeed = feedResult.status === "fulfilled" ? feedResult.value : false;
  if (mobile?.lcp && mobile.lcp !== UNAVAILABLE) step("viteza", "done", fill(PROGRESS.lcp, { s: mobile.lcp }));
  else step("viteza", "unmeasured", WORD.verify);
  step("verificari", "running");


  const avertisment = detectBlocker(homepageData.html) ?? undefined;

  // Phase 4: Compute section results
  const viteza = computeVitezaChecks(mobile, desktop, ttfbMs);
  const seoChecks = computeSeoChecks(analyzedPages);
  const continutChecks = computeContinutChecks(analyzedPages);
  const keywordsChecks = computeKeywordsChecks(analyzedPages);
  const structuraChecks = computeStructuraChecks(analyzedPages, robotsTxt, sitemapXml, sitemapUrl, { categories, products });
  const aiChecks = computeAiChecks(robotsTxt, llmsTxt, analyzedPages);
  const schema = computeSchemaChecks(analyzedPages, { categories, products });
  const readThroughBrowser = usedBrowser || !!browserFetcher;
  const seo = computeSeoComponents({
    origin, requested: pages, pages: analyzedPages, categories, products, robotsTxt, sitemapXml: foundSitemapXml,
    listed: { categories: typed.category.length, products: typed.product.length, other: typed.other.length },
    refusedServer: looksBlocked(homeDirect.ok, homeDirect.html) || readThroughBrowser, readWithBrowser: readThroughBrowser, probes,
    ...(leadPages ? { kind: "leads" as const, services: leadPages.service, locations: leadPages.location, inSitemap: (u: string) => listedInSitemap.has(siteKey(u)) } : {}),
  });
  const seoRow = (id: string) => seo.flatMap((c) => c.rows).find((r) => r.id === id);
  const described = seoRow("descriere_exista");
  if (described && described.total > 0) step("verificari", "done", described.ok < described.total ? fill(PROGRESS.noDescription, { n: described.total - described.ok }) : PROGRESS.allDescribed);
  else step("verificari", "unmeasured", WORD.verify);
  const aiRow = seoRow("ai_roboti");
  step("ai", "running");
  if (aiRow && aiRow.total > 0) step("ai", "done", fill(PROGRESS.aiAccess, { ok: aiRow.ok, t: aiRow.total }));
  else step("ai", "unmeasured", WORD.verify);
  step("scor", "running");
  const social = computeSocialChecks(homepageData);
  const securitate = computeSecurityChecks(homepageData);

  const isEcom = siteKind ? siteKind.type === "ecom" : detectEcom(analyzedPages.map((p) => p.html).join("\n").toLowerCase());
  const productSignal = isEcom ? computeProductSignal(analyzedPages, products, hasProductFeed) : undefined;
  // Part 2 as ✓/✗ rows for both kinds (spec 2026-09-25 §4); its score is the share of ✓. A shop keeps its page
  // fields for the page-type slide.
  const uxKind = isEcom ? "ecom" : leadPages ? "leads" : null;
  const uxStd = uxKind ? computeUxStandard(uxKind, analyzedPages, { categories, products, services: leadPages?.service ?? [], locations: leadPages?.location ?? [] }, mobile, domain) : undefined;
  const uxFields = isEcom ? computeUxAudit(analyzedPages, { homepage, categories, products }, mobile, domain) : undefined;
  const ux = uxStd ? { scor: seoScore(uxStd), fields: uxFields?.fields ?? [] } : undefined;
  // The overall score is the mean of the two parts the cover shows (docs/superpowers/specs/2026-09-24-seo-ten-...).
  const scor = ux ? Math.round((seoScore(seo) + ux.scor) / 2) : seoScore(seo);
  step("scor", "done", fill(PROGRESS.score, { score: scor }));

  const checksRezultate = { ...viteza, ...schema, ...social, ...securitate };
  const failedPageChecks = [...seoChecks, ...continutChecks, ...keywordsChecks, ...structuraChecks, ...aiChecks]
    .filter((c) => c.correctCount < c.total * 0.7).map((c) => c.id);
  await appendObservation({
    at: Date.now(), domain, platform: profile.platform,
    sitemap: typed.product.length + typed.category.length + typed.other.length > 0 ? sitemapUrl : "",
    urls: { product: typed.product.length, category: typed.category.length, other: typed.other.length },
    fetched: pages.length, ok: analyzedPages.length,
    refused: pages.filter((p) => p.status === 403 || p.status === 429).length,
    usedBrowser: usedBrowser || !!browserFetcher, blocked: analyzedPages.length === 0,
    products: products.length, categories: categories.length,
    productPrefixes: pathPrefixes(products), categoryPrefixes: pathPrefixes(categories),
    failedChecks: [...Object.entries(checksRezultate).filter(([, r]) => r.status !== "ok").map(([k]) => k), ...failedPageChecks],
    durationMs: Date.now() - startedAt,
  }).catch(() => { /* the audit result never depends on the log */ });

  return {
    url: origin,
    domain,
    pagesAnalyzed: analyzedPages.length,
    scor,
    avertisment,
    checksRezultate,
    seoChecks,
    continutChecks,
    keywordsChecks,
    structuraChecks,
    aiChecks,
    isEcom,
    ...(siteKind ? { siteKind } : {}),
    ...(leadPages ? { leadPages } : {}),
    ...(uxStd ? { uxStd } : {}),
    productSignal,
    ux,
    seo,
  };
}
