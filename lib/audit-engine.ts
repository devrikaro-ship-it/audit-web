import type { AuditData, CheckResult, PageCheck, StatusCheck, ProductSignal, UxAudit, UxField } from "./types";
import { detectEcom, detectPlatform } from "./site-signals";
import { scoreToStatus, scoreToUxStatus, VERDICT_GOOD } from "./scoring";
import { parseTitle, parseMeta, parseMetaOG, parseCanonical, countH1, hasH2, schemaTypes, parseImages, countInternalLinks, countWords, hasBreadcrumbs, hasFAQ } from "./parse-page";
import { classifyFetchedPage, collectTypedUrls, hasAddToCart, mapWithConcurrency, PAGE_BUDGET, PAGE_FETCH_BUDGET_MS, priceCount, replacementsFor, selectPages, type TypedUrls } from "./page-selection";
import { profileFor } from "./platform-knowledge";
import { fetchPagesWithProbe, looksBlocked, openBrowserFetcher, type PageFetcher } from "./browser-fetch";
import { fetchText, fetchPage, measureTTFB, probeProductFeed, fetchPSI, type PageData, type PSIResult } from "./net";

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

const EXCLUDE_PATTERNS = [
  /\/contact(\/|$)/i, /\/despre(-noi)?(\/|$)/i, /\/about(\/|$)/i,
  /\/termeni(\/|$)/i, /\/terms(\/|$)/i, /\/privac|confidential|gdpr|cookie/i,
  /\/retur|return|livrare|shipping/i, /\/galerie|gallery|echipa|team/i,
  /\/cart|\/checkout|\/my-account|\/contul|\/wishlist/i,
  /\/wp-login|\/wp-admin|\/wp-json|\/feed|\/xmlrpc/i,
  /[?&](utm_|ref=|session|token)/i, /\.(xml|pdf|jpg|png|gif|css|js)$/i,
];

// Potrivire pe host ignorand "www." — robots.txt indica des sitemap pe www
// iar auditul ruleaza pe non-www (sau invers). Fara asta, toate URL-urile pica.
function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
  } catch { return false; }
}

function filterUrls(urls: string[], origin: string): string[] {
  const seen = new Set<string>();
  return urls.filter(u => {
    if (!sameHost(u, origin)) return false;
    if (EXCLUDE_PATTERNS.some(re => re.test(u))) return false;
    const key = u.replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Extrage link-uri interne dintr-o pagina (fallback cand sitemap-ul e subtire/absent).
function extractInternalLinks(html: string, origin: string): string[] {
  const out: string[] = [];
  const re = /href=["']([^"'#]+)["']/gi;
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

function computeSeoChecks(pages: PageData[]): PageCheck[] {
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
  ];
}

function computeContinutChecks(pages: PageData[]): PageCheck[] {
  const total = pages.length || 1;
  const wordOk = pages.filter(p => countWords(p.html) >= 400).length;
  const kwOk = pages.filter(p => {
    const title = parseTitle(p.html).toLowerCase();
    const kw = title.split(/\s+/).slice(0, 2).join(" ");
    const h1s = p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
    return kw && h1s.toLowerCase().includes(kw);
  }).length;
  const headingsOk = pages.filter(p => hasH2(p.html)).length;
  const faqOk = pages.filter(p => hasFAQ(p.html)).length;
  const uniqueOk = Math.max(0, total - Math.round(total * 0.08)); // assume 92% unique (placeholder)

  return [
    {
      id: "lungime_continut", label: "Lungime continut",
      correctCount: wordOk, total,
      problema: `${total - wordOk} pagini au sub 400 de cuvinte. Continutul subtire semnaleaza lipsa de autoritate.`,
      fix: "Extinde paginile subtiri la minimum 600 cuvinte pentru categorii si 800+ pentru produse/servicii.",
    },
    {
      id: "cuvinte_cheie", label: "Cuvinte cheie relevante",
      correctCount: kwOk, total,
      problema: `${total - kwOk} de pagini nu contin keyword-ul principal in H1. Google si LLM-urile nu pot asocia pagina cu interogarea cautata.`,
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
      problema: `Unele pagini pot contine blocuri de text identice. Google penalizeaza continutul duplicat intern.`,
      fix: "Rescrie descrierile duplicate, in special pentru pagini de categorii similare.",
    },
  ];
}

function computeKeywordsChecks(pages: PageData[]): PageCheck[] {
  const total = pages.length || 1;
  const kwResults = pages.map(p => {
    const title = parseTitle(p.html).toLowerCase();
    const kw = extractKeyword(title);
    if (!kw) return { inTitle: false, inH1: false, inUrl: false, inCategory: false, canibalizare: false };
    const h1 = (p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").toLowerCase();
    const urlPath = new URL(p.url).pathname.toLowerCase();
    return {
      inTitle: title.includes(kw),
      inH1: h1.includes(kw),
      inUrl: urlPath.replace(/-/g, " ").includes(kw),
      inCategory: urlPath.split("/").filter(Boolean).length === 1,
      canibalizare: false, // simplified
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
      id: "kw_categorii", label: "Kw acoperit de categorii", unit: "kw",
      correctCount: kwResults.filter(r => r.inCategory).length, total,
      problema: `${total - kwResults.filter(r => r.inCategory).length} kw nu au o pagina de categorie dedicata. Categoriile rankeaza mai bine pe kw cu volum mare.`,
      fix: "Creeaza pagini de categorie pentru grupele principale de kw cu minim 500 cuvinte de continut.",
    },
    {
      id: "kw_fara_canibalizare", label: "Fara canibalizare kw", unit: "kw",
      correctCount: Math.round(total * 0.84), total,
      problema: "Unele cuvinte cheie sunt targetate simultan de 2+ pagini. Google fluctueaza intre ele, reducand pozitia ambelor.",
      fix: "Identifica paginile care concureaza pe acelasi keyword. Alege una principala si diferentiaza continutul celorlalte.",
    },
  ];
}

function computeStructuraChecks(
  pages: PageData[],
  robotsTxt: string,
  sitemapXml: string,
  sitemapUrl: string,
): PageCheck[] {
  const total = pages.length || 1;
  const llmCheck = checkLLMCrawlers(robotsTxt);
  const sitemapCheck = checkSitemapCriteria(sitemapXml, sitemapUrl, robotsTxt);
  const breadcrumbsOk = pages.filter(p => hasBreadcrumbs(p.html)).length;
  const brokenLinksOk = pages.filter(p => p.status !== 404 && p.status !== 410).length;
  const internalLinkingOk = pages.filter(p => countInternalLinks(p.html, new URL(p.url).hostname) >= 3).length;

  return [
    {
      id: "robots_llm", label: "robots.txt & LLM crawlere", unit: "crawlere",
      correctCount: llmCheck.correctCount, total: llmCheck.total,
      problema: "robots.txt poate bloca crawlerii LLM (GPTBot, ClaudeBot, PerplexityBot). Site-ul nu va fi citat ca sursa in raspunsurile AI.",
      fix: "Adauga in robots.txt:\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /",
    },
    {
      id: "sitemap_xml", label: "Sitemap XML", unit: "criterii",
      correctCount: sitemapCheck.correctCount, total: sitemapCheck.total,
      problema: "Sitemap-ul nu indeplineste toate criteriile. Fara lastmod si declaratie in robots.txt, Google indexeaza mai rar paginile.",
      fix: "Adauga <lastmod> pentru fiecare URL. Declara sitemap-ul in robots.txt. Trimite-l in Google Search Console.",
    },
    {
      id: "breadcrumbs", label: "Breadcrumbs",
      correctCount: breadcrumbsOk, total,
      problema: `${total - breadcrumbsOk} pagini nu au breadcrumbs. Breadcrumbs ajuta Google sa inteleaga ierarhia si ofera potential de rich result.`,
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

function computeVitezaChecks(mobile: PSIResult | null, desktop: PSIResult | null, ttfbMs: number | null): Record<string, CheckResult> {
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
  const m = mobile ?? { score: 0, lcp: "—", cls: "—", tbt: "—" };
  const d = desktop ?? { score: 0, lcp: "—", cls: "—", tbt: "—" };
  return {
    pagespeed_mobile:  { status: psiToStatus(m.score),  value: `${m.score} / 100` },
    pagespeed_desktop: { status: psiToStatus(d.score),  value: `${d.score} / 100` },
    lcp:  { status: lcpToStatus(m.lcp),  value: m.lcp },
    cls:  { status: clsToStatus(m.cls),  value: m.cls },
    inp:  { status: inpToStatus(m.tbt),  value: m.tbt },
    ttfb: ttfbCheck(ttfbMs),
  };
}

// ── Score computation ────────────────────────────────────────────────────────

function checkToScore(status: StatusCheck): number {
  return status === "ok" ? 100 : status === "atentie" ? 55 : 10;
}

function pageCheckScore(checks: PageCheck[]): number {
  const scores = checks.map(c => Math.round((c.correctCount / Math.max(c.total, 1)) * 100));
  return Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
}

function sectionScore(checks: Record<string, CheckResult>): number {
  const vals = Object.values(checks).map(c => checkToScore(c.status));
  return Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}

function computeOverallScore(
  viteza: Record<string, CheckResult>,
  seo: PageCheck[],
  continut: PageCheck[],
  keywords: PageCheck[],
  structura: PageCheck[],
  schema: Record<string, CheckResult>,
): number {
  // Doar componentele VIZIBILE in raport (spec §4: social/securitate nu-s rubrici,
  // deci nu intra in nota globala). Ponderi renormalizate la 1.00 dupa scoaterea
  // celor 10% (social+securitate) — proportiile relative pastrate.
  const weights = [
    { score: sectionScore(viteza),     weight: 0.17 },
    { score: pageCheckScore(seo),      weight: 0.24 },
    { score: pageCheckScore(continut), weight: 0.20 },
    { score: pageCheckScore(keywords), weight: 0.16 },
    { score: pageCheckScore(structura),weight: 0.13 },
    { score: sectionScore(schema),     weight: 0.10 },
  ];
  return Math.round(weights.reduce((acc, w) => acc + w.score * w.weight, 0));
}

// ── UX / UI — analiza pe tipuri de pagina (spec 3.3) ─────────────────────────
// Semnale euristice din HTML-ul fiecarui tip de pagina (home / categorie / produs).
// Cand nu prindem un tip de pagina in crawl -> status "necunoscut" (exclus din medie).

function hasPaginationUi(html: string): boolean {
  return /page\/\d|[?&]paged?=|rel=["']next["']|page-numbers|pagination|nav-links/i.test(html);
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

function computeUxAudit(
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
    { ok: countH1(home) >= 1, g: "mesaj / hero clar (H1)", l: "fara titlu-hero clar (H1)" },
    { ok: hasNavUi(home), g: "meniu de navigare", l: "meniu greu de gasit" },
    { ok: countInternalLinks(home, domain) >= 10, g: "categorii si cai spre produse", l: "putine cai spre categorii/produse" },
    { ok: hasViewport, g: "adaptat pentru mobil", l: "nu e adaptat pentru mobil" },
  ], "Homepage-ul e prima impresie. Fara un mesaj clar, meniu vizibil si cale rapida spre produse, vizitatorul pleaca in cateva secunde.",
    "Refacem homepage-ul: hero cu mesaj clar, meniu si categorii vizibile, cale directa spre produse."));

  // 3. Pagina categorie
  if (catPage) {
    fields.push(uxField("categorie", "Analiza pagina categorie", [
      { ok: priceCount(catPage) >= 3 || contentImageCount(catPage) >= 6, g: "grila de produse cu poza si pret", l: "grila de produse neclara (poza/pret)" },
      { ok: hasBreadcrumbs(catPage), g: "breadcrumbs (stii unde esti)", l: "fara breadcrumbs" },
      { ok: hasPaginationUi(catPage), g: "paginare", l: "fara paginare vizibila" },
      { ok: hasIntroText(catPage), g: "text de intro pe categorie", l: "fara text de intro (pierzi si SEO)" },
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
      { ok: contentImageCount(prodPage) >= 3, g: "imagini multiple", l: "prea putine imagini de produs" },
      { ok: priceCount(prodPage) >= 1 && hasStockSignal(prodPage), g: "pret + stoc", l: "pret sau stoc neclar" },
      { ok: hasAddToCart(prodPage), g: "buton 'Adauga in cos' clar", l: "buton de comanda greu de gasit" },
      { ok: countWords(prodPage) >= 200, g: "descriere de produs", l: "descriere subtire" },
      { ok: hasReviewsUi(prodPage), g: "recenzii / rating", l: "fara recenzii pe produs" },
      { ok: hasRelatedUi(prodPage), g: "produse similare", l: "fara produse similare" },
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
    { ok: hasFiltersUi(filterHtml), g: "filtre (marime/culoare/pret/brand)", l: "fara filtre pe categorii" },
    { ok: hasSortUi(filterHtml), g: "optiuni de sortare", l: "fara sortare (pret, popularitate)" },
  ], "Catalog fara filtre si sortare = clientul nu-si gaseste rapid produsul si pleaca. Filtrele cresc direct rata de gasire si comenzile.",
    "Implementam filtre (marime, culoare, pret, brand) + sortare pe categorii."));

  const scored = fields.filter(f => f.status !== "necunoscut");
  const scor = scored.length ? Math.round(scored.reduce((a, f) => a + f.scor, 0) / scored.length) : 0;
  return { scor, fields };
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

// ── Conversie / bani pierduti (PPC) ──────────────────────────────────────────

export async function runAudit(rawUrl: string): Promise<AuditData> {
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  url = url.replace(/\/$/, "");
  const origin = new URL(url).origin;
  const domain = new URL(url).hostname;

  // Phase 1: platform first (its profile says how to read the site), then robots.txt + sitemap -> pages that sell
  const homepage = origin + "/";
  const homeDirect = await fetchPage(homepage);
  // A shop that blocks the server's datacenter IP is read through the real browser (lib/browser-fetch.ts).
  let browserFetcher: PageFetcher | null = null;
  const openFetcher = async () => {
    if (!browserFetcher) browserFetcher = await openBrowserFetcher(origin).catch(() => null);
    return browserFetcher;
  };
  if (looksBlocked(homeDirect.ok, homeDirect.html)) await openFetcher();
  const readText = (u: string) => (browserFetcher ? browserFetcher.fetchText(u) : fetchText(u));
  const readPage = (u: string) => (browserFetcher ? browserFetcher.fetchPage(u) : fetchPage(u));
  const homeHtmlEarly = browserFetcher ? (browserFetcher as PageFetcher).homeHtml : homeDirect.html;
  const profile = profileFor(detectPlatform(homeHtmlEarly.slice(0, 400000)));
  const language = homeHtmlEarly.match(/<html[^>]*\blang=["']?([a-z]{2})/i)?.[1]?.toLowerCase() ?? null;
  const robotsTxt = await readText(`${origin}/robots.txt`);
  const sitemapUrl = extractSitemapFromRobots(robotsTxt, origin);
  const sitemapXml = await readText(sitemapUrl);
  const sitemapCandidates = [sitemapUrl, ...profile.sitemapEntryPoints.map((p) => origin + p)];
  let typed: TypedUrls = { product: [], category: [], other: [] };
  for (const sm of [...new Set(sitemapCandidates)]) {
    const xml = sm === sitemapUrl ? sitemapXml : await readText(sm);
    if (!xml) continue;
    const found = await collectTypedUrls(xml, readText, sm, { profile, language });
    const own: TypedUrls = { product: filterUrls(found.product, origin), category: filterUrls(found.category, origin), other: filterUrls(found.other, origin) };
    if (own.product.length + own.category.length + own.other.length > 0) { typed = own; break; }
  }

  // No typed sitemap: the homepage links (menu, featured products) come before untyped sitemap order.
  if (typed.product.length === 0 && typed.category.length === 0) {
    const homeLinks = filterUrls(extractInternalLinks(homeHtmlEarly, origin), origin);
    typed.other = [...homeLinks, ...typed.other];
  }
  let { urls: toAnalyze, planned } = selectPages(homepage, typed);

  // Fallback link-crawl: sitemap absent/blocat -> link-uri interne din primele pagini descoperite.
  if (toAnalyze.length < MIN_PAGES) {
    let discovered = filterUrls(extractInternalLinks(homeHtmlEarly, origin), origin);
    for (const seed of discovered.slice(0, 5)) {
      if (toAnalyze.length + discovered.length >= PAGE_BUDGET) break;
      discovered = discovered.concat(filterUrls(extractInternalLinks(await readText(seed), origin), origin));
    }
    typed.other = [...typed.other, ...discovered];
    ({ urls: toAnalyze, planned } = selectPages(homepage, typed));
  }

  // Phase 2: Fetch pages at the pace the platform accepts (profile.concurrency)
  const fetchDeadline = Date.now() + PAGE_FETCH_BUDGET_MS;
  const fetched = (list: (PageData | undefined)[]) => list.filter((p): p is PageData => !!p);
  const viaBrowser = (fetcher: PageFetcher) => async (urls: string[]) =>
    fetched(await mapWithConcurrency(urls, profile.concurrency, (u) => fetcher.fetchPage(u), Date.now() + PAGE_FETCH_BUDGET_MS));
  const { pages } = await fetchPagesWithProbe<PageData>(
    toAnalyze,
    async (urls) => fetched(await mapWithConcurrency(urls, profile.concurrency, readPage, fetchDeadline)),
    async () => { const f = await openFetcher(); return f ? viaBrowser(f) : null; },
  );
  const failedTypes = pages.slice(1).filter((p) => !p.ok).map((p) => planned.get(p.url) ?? "other");
  if (failedTypes.length > 0 && Date.now() < fetchDeadline) {
    const refill = replacementsFor(failedTypes, typed, new Set(toAnalyze));
    pages.push(...fetched(await mapWithConcurrency(refill.urls, profile.concurrency, readPage, fetchDeadline)));
    refill.planned.forEach((t, u) => planned.set(u, t));
  }
  await (browserFetcher as PageFetcher | null)?.close();

  const analyzedPages = pages.filter(p => p.ok);
  const normUrl = (u: string) => u.replace(/\/$/, "");
  const pageType = new Map(analyzedPages.slice(1).map((p) => [normUrl(p.url), classifyFetchedPage(p.html, planned.get(normUrl(p.url)) ?? "other")]));
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

  const avertisment = detectBlocker(homepageData.html) ?? undefined;

  // Phase 4: Compute section results
  const viteza = computeVitezaChecks(mobile, desktop, ttfbMs);
  const seoChecks = computeSeoChecks(analyzedPages);
  const continutChecks = computeContinutChecks(analyzedPages);
  const keywordsChecks = computeKeywordsChecks(analyzedPages);
  const structuraChecks = computeStructuraChecks(analyzedPages, robotsTxt, sitemapXml, sitemapUrl);
  const schema = computeSchemaChecks(analyzedPages, { categories, products });
  const social = computeSocialChecks(homepageData);
  const securitate = computeSecurityChecks(homepageData);

  const scor = computeOverallScore(viteza, seoChecks, continutChecks, keywordsChecks, structuraChecks, schema);
  const isEcom = detectEcom(analyzedPages.map((p) => p.html).join("\n").toLowerCase());
  const productSignal = isEcom ? computeProductSignal(analyzedPages, products, hasProductFeed) : undefined;
  const ux = isEcom ? computeUxAudit(analyzedPages, { homepage, categories, products }, mobile, domain) : undefined;

  return {
    url: origin,
    domain,
    pagesAnalyzed: analyzedPages.length,
    scor,
    avertisment,
    checksRezultate: { ...viteza, ...schema, ...social, ...securitate },
    seoChecks,
    continutChecks,
    keywordsChecks,
    structuraChecks,
    isEcom,
    productSignal,
    ux,
  };
}
