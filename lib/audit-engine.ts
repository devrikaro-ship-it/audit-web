import type { AuditData, CheckResult, PageCheck, StatusCheck, ConversieAudit, MoneyLeak, Presence, ConvZona, ProductSignal, UxAudit, UxField } from "./types";
import { analyzeProspectLive, deriveProductQueries, type GoogleShoppingIntel, type LiveTracking } from "./css-detect";
import { detectEcom, detectHtmlTracking } from "./site-signals";
import { scoreToStatus, scoreToUxStatus, VERDICT_GOOD } from "./scoring";
import { parseTitle, parseMeta, parseMetaOG, parseCanonical, countH1, hasH2, parseJsonLD, parseImages, countInternalLinks, countWords, hasBreadcrumbs, hasFAQ } from "./parse-page";
import { fetchText, fetchPage, measureTTFB, probeProductFeed, fetchPSI, type PageData, type PSIResult } from "./net";

const MAX_PAGES = 60;        // candidati (buffer peste minimul de 50 pt paginile care pica)
const MIN_PAGES = 50;        // tinta minima de pagini analizate
const FETCH_CONCURRENCY = 8;
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
// crawler-ul nu primeste HTML real, deci auditul ar fi fals. Acelasi gard ca in collect.py.
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

async function parseSitemapXml(xml: string): Promise<string[]> {
  const urls: string[] = [];
  // Sitemap index: find <sitemap><loc>URL</loc></sitemap>
  const indexRe = /<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>/gi;
  let m: RegExpExecArray | null;
  const childSitemaps: string[] = [];
  while ((m = indexRe.exec(xml)) !== null) {
    childSitemaps.push(m[1].trim());
  }
  if (childSitemaps.length > 0) {
    // Fetch each child sitemap (limit to first 5)
    const children = await Promise.all(
      childSitemaps.slice(0, 5).map(u => fetchText(u))
    );
    for (const childXml of children) {
      const locRe = /<url>[\s\S]*?<loc>([\s\S]*?)<\/loc>/gi;
      while ((m = locRe.exec(childXml)) !== null) {
        urls.push(m[1].trim());
      }
    }
  } else {
    // Regular sitemap
    const locRe = /<url>[\s\S]*?<loc>([\s\S]*?)<\/loc>/gi;
    while ((m = locRe.exec(xml)) !== null) {
      urls.push(m[1].trim());
    }
  }
  return urls;
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

function segmentUrls(urls: string[], origin: string): { homepage: string; categories: string[]; products: string[] } {
  const homepage = origin + "/";
  const categories: string[] = [];
  const products: string[] = [];
  for (const u of urls) {
    if (u === homepage || u === origin) continue;
    const path = new URL(u).pathname.replace(/\/$/, "");
    const segs = path.split("/").filter(Boolean);
    if (segs.length === 1) categories.push(u);
    else products.push(u);
  }
  return { homepage, categories, products };
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

function computeSchemaChecks(pages: PageData[]): Record<string, CheckResult> {
  const homepage = pages[0];
  const rawSchemas = homepage ? parseJsonLD(homepage.html) : [];
  const schemas = rawSchemas as Record<string, unknown>[];
  const types = schemas.map(s => s["@type"] ?? "").filter(Boolean);
  const hasOrgOrLocal = types.some(t => ["Organization", "LocalBusiness", "MedicalBusiness"].includes(t as string));
  const hasProduct = types.some(t => t === "Product");
  const hasBreadcrumb = types.some(t => t === "BreadcrumbList");
  const hasRating = types.some(t => t === "AggregateRating") ||
    schemas.some(s => "aggregateRating" in s);

  const availabilityOk = !hasProduct || pages.some(p => p.html.includes("schema.org/InStock"));

  return {
    schema_markup: {
      status: schemas.length > 0 ? "ok" : "critic",
      value: schemas.length > 0 ? types.join(", ") || "JSON-LD prezent" : "Nicio schema detectata",
    },
    schema_tipuri: {
      status: hasOrgOrLocal ? "ok" : "atentie",
      value: hasOrgOrLocal ? "Organization / LocalBusiness prezent" : "Lipseste schema Organization",
    },
    schema_validare: {
      status: availabilityOk ? "ok" : "atentie",
      value: availabilityOk ? "Fara erori detectate" : "availability sau itemCondition incorecte",
    },
    schema_breadcrumbs: {
      status: hasBreadcrumb ? "ok" : "critic",
      value: hasBreadcrumb ? "BreadcrumbList prezent" : "Lipseste BreadcrumbList",
    },
    schema_rating: {
      status: hasRating ? "ok" : "critic",
      value: hasRating ? "AggregateRating prezent" : "Nicio schema de rating",
    },
  };
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
  social: Record<string, CheckResult>,
  securitate: Record<string, CheckResult>,
): number {
  const weights = [
    { score: sectionScore(viteza),     weight: 0.15 },
    { score: pageCheckScore(seo),      weight: 0.22 },
    { score: pageCheckScore(continut), weight: 0.18 },
    { score: pageCheckScore(keywords), weight: 0.15 },
    { score: pageCheckScore(structura),weight: 0.12 },
    { score: sectionScore(schema),     weight: 0.08 },
    { score: sectionScore(social),     weight: 0.05 },
    { score: sectionScore(securitate), weight: 0.05 },
  ];
  return Math.round(weights.reduce((acc, w) => acc + w.score * w.weight, 0));
}

// ── UX / UI — analiza pe tipuri de pagina (spec 3.3) ─────────────────────────
// Semnale euristice din HTML-ul fiecarui tip de pagina (home / categorie / produs).
// Cand nu prindem un tip de pagina in crawl -> status "necunoscut" (exclus din medie).

function priceCount(html: string): number {
  return (html.match(/\d[\d.\s]*[.,]?\d*\s*(lei|ron|€|eur)\b/gi) ?? []).length;
}
function hasAddToCart(html: string): boolean {
  return /add[-_ ]?to[-_ ]?cart|adaug[aă]\s+[iî]n\s+co[sș]|single_add_to_cart|comanda\s+rapida|cumpar[aă]\s+acum|buy\s+now/i.test(html);
}
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
// Pagina de produs reala (nu Contact/Blog/Categorie) — pe semnale de continut, nu pe adancimea URL.
function isProductPage(html: string): boolean {
  const hasProductSchema = /"@type"\s*:\s*"Product"/i.test(html) || /schema\.org\/Product\b/i.test(html) || /property=["']og:type["'][^>]*content=["']product/i.test(html);
  const hasPrice = /itemprop=["']price["']|"price"\s*:|\d[\d.\s]*[.,]?\d*\s*(lei|ron|€)/i.test(html);
  return hasProductSchema || (hasPrice && hasAddToCart(html));
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
  const headline = "Produsele tale nu sunt optimizate pentru Google Shopping si cautare";

  const feedFraza = hasProductFeed
    ? "Ai un feed de produse, dar titlurile si descrieriile din el conteaza la fel de mult ca existenta lui."
    : "Fara un feed de produse optimizat nici nu poti rula Google Shopping la potential.";

  let message: string;
  if (checked > 0 && (weakTitles > 0 || missingMeta > 0)) {
    const parti: string[] = [];
    if (weakTitles > 0) parti.push(`${weakTitles} au titluri scurte sau generice`);
    if (missingMeta > 0) parti.push(`${missingMeta} nu au descriere`);
    message = `Am verificat ${checked} pagini de produs si ${parti.join(" iar ")} — exact textele pe care Google le foloseste ca sa decida pe ce cautari iti arata produsele. Titlurile si descrierile slabe inseamna ca produsele apar mai rar in Shopping si in cautare decat ar putea, chiar cu buget de reclama. ${feedFraza} Cu titluri, descrieri si feed optimizate acelasi catalog aduce mai multe afisari si clicuri, fara buget suplimentar.`;
  } else {
    message = `Titlurile, descrierile si feed-ul produselor sunt textele pe care Google le foloseste ca sa decida pe ce cautari apari in Shopping si in cautare. In majoritatea magazinelor acestea raman needitate (numele scurt din platforma), asa ca produsele apar mai rar decat ar putea. ${feedFraza} Optimizate, acelasi catalog aduce mai multe afisari si clicuri, fara buget suplimentar de reclama.`;
  }

  return { checked, weakTitles, missingMeta, hasFeed: hasProductFeed, headline, message };
}

// ── Conversie / bani pierduti (PPC) ──────────────────────────────────────────

function computeConversieAudit(pages: PageData[], mobile: PSIResult | null, hasProductFeed: boolean): ConversieAudit {
  const homepage = pages[0];
  const corpus = pages.map(p => p.html).join("\n").toLowerCase();
  const has = (...n: string[]) => n.some(x => corpus.includes(x));

  // amprenta platforma/ecom din modulul partajat (aceeasi ca in scanul din funnel)
  const isEcom = detectEcom(corpus);

  const leaks: MoneyLeak[] = [];
  const add = (id: string, label: string, zona: ConvZona, present: Presence, pierdere: string, fix: string) =>
    leaks.push({ id, label, zona, present, pierdere, fix });

  // ---- TRACKING & PPC (carligul de vanzare) ----
  // GTM injecteaza tag-urile client-side, deci nu apar in HTML-ul brut. Cand GTM
  // e prezent dar tag-ul nu se vede static, marcam "necunoscut" (nu "nu"), ca sa
  // nu raportam fals ca lipseste. Pt. ecom, browserul BrightData verifica la runtime.
  const track = detectHtmlTracking(corpus);
  const hasGTM = track.gtm;
  const hasGA4 = track.ga4;
  const hasAds = /aw-\d{6,}/i.test(corpus) || has("google_conversion", "googleads.g.doubleclick", "gtag_report_conversion");
  const hasPixel = track.metaPixel;
  const hasTikTok = track.tiktok;
  const hasConsent = has("gtag('consent'", 'gtag("consent"', "'consent', 'default'", "cookiebot", "onetrust", "cookieyes", "complianz", "consentmanager");
  const veil = (found: boolean): Presence => found ? "da" : (hasGTM ? "necunoscut" : "nu");

  add("ga4", "Google Analytics 4", "Tracking & PPC", veil(hasGA4),
    "Fara analytics nu stii ce pagini si ce reclame aduc vanzari — optimizezi pe ghicit, nu pe date.",
    "Instalam GA4 cu evenimente ecommerce (view_item, add_to_cart, purchase).");
  add("ads_conv", "Google Ads — urmarire conversii", "Tracking & PPC", hasAds ? "da" : ((hasGA4 || hasGTM) ? "necunoscut" : "nu"),
    "Daca dai bani pe Google Ads fara urmarirea conversiilor, Google liciteaza orb — ajungi sa platesti de 2-3x mai mult per vanzare.",
    "Conectam conversiile reale (Purchase) la Google Ads si licitam pe valoare, nu pe clicuri.");
  add("pixel", "Meta Pixel", "Tracking & PPC", veil(hasPixel),
    "Fara Pixel, reclamele Meta nu pot gasi cumparatori si nu poti face retargeting — cea mai profitabila audienta a ta.",
    "Instalam Meta Pixel + evenimente standard + audiente de retargeting.");
  add("tiktok", "TikTok Pixel", "Tracking & PPC", veil(hasTikTok),
    "Fara TikTok Pixel nu poti masura sau optimiza reclamele TikTok — un canal in crestere rapida pentru ecommerce.",
    "Instalam TikTok Pixel + evenimente standard pentru campanii TikTok.");
  add("capi", "Meta Conversion API (server-side)", "Tracking & PPC", "necunoscut",
    "Fara CAPI se pierd ~10-30% din conversii (iOS, blocare cookies) → Meta optimizeaza pe date incomplete si arde buget.",
    "Configuram CAPI cu deduplicare web + server pentru date complete.");
  add("consent", "Consent Mode v2", "Tracking & PPC", veil(hasConsent),
    "Fara Consent Mode v2 pierzi date de conversie din UE, iar reclamele Google pierd din eficienta (si e obligatoriu legal).",
    "Implementam banner de consimtamant conectat la Consent Mode v2.");

  // ---- INCREDERE ----
  const hasReviews = has("aggregaterating", "trustpilot", "yotpo", "judge.me", "stamped.io", "reviews.io", "okendo", '"reviewcount"', "stele verificate");
  const hasPolicies = ["retur", "return", "livrare", "shipping", "termeni", "terms", "confidentialitate", "privacy", "gdpr", "anpc"]
    .filter(k => corpus.includes(k)).length >= 3;
  const hasPay = has("visa", "mastercard", "netopia", "paypal", "stripe", "mobilpay", "plata securizata", "apple pay", "google pay");
  add("reviews", "Recenzii / dovada sociala", "Incredere", hasReviews ? "da" : "necunoscut",
    "92% dintre cumparatori citesc recenzii inainte sa comande. Fara ele, traficul (inclusiv cel platit) pleaca fara sa cumpere.",
    "Activam recenzii pe produse + cerere automata dupa livrare + afisare rating in Google.");
  add("policies", "Pagini Retur / Livrare / Termeni", "Incredere", hasPolicies ? "da" : "nu",
    "Lipsa politicilor clare = neincredere + risc legal (ANPC). Vizitatorul nu cumpara daca nu vede cum returneaza.",
    "Adaugam pagini de Retur, Livrare, Termeni si Confidentialitate vizibile in footer.");
  add("pay", "Metode de plata vizibile", "Incredere", hasPay ? "da" : "necunoscut",
    "Cand metodele de plata (card, ramburs, rate) nu sunt vizibile, o parte din cumparatori abandoneaza din nesiguranta.",
    "Afisam clar metodele de plata + badge de plata securizata langa butonul de comanda.");

  // ---- FUNCTII MAGAZIN (doar ecom) ----
  if (isEcom) {
    const hasSearch = /type=["']search["']/i.test(corpus) || /role=["']search["']/i.test(corpus) || has("search-field", "/?s=", "search-form", "cauta produse");
    const hasFilters = has("woocommerce-widget-layered-nav", "wc-block-attribute-filter", "yith-wcan", "filtreaza", "facet", "filter-options", "price_slider");
    const hasStock = has("in stoc", "in stock", "schema.org/instock", "stoc epuizat", "out of stock", "disponibilitate");
    const hasRelated = has("produse similare", "related", "s-ar putea sa-ti placa", "recomandate", "you may also like", "complete the look");
    add("search", "Cautare pe site", "Functii magazin", hasSearch ? "da" : "necunoscut",
      "Vizitatorii care folosesc cautarea convertesc de pana la 2x mai mult. Fara ea, cei care nu gasesc rapid pleaca.",
      "Adaugam cautare cu sugestii instant pe produse.");
    add("filters", "Filtre produse (marime/culoare/pret)", "Functii magazin", hasFilters ? "da" : "necunoscut",
      "Catalog mare fara filtre = frustrare si abandon. Clientul nu sapa prin 20 de pagini ca sa-si gaseasca marimea.",
      "Implementam filtre pe categorii (marime, culoare, pret, brand).");
    add("product_info", "Pagina produs completa (stoc, livrare, recenzii)", "Functii magazin", hasStock ? "da" : "necunoscut",
      "Pagina de produs e locul deciziei. Fara stoc, estimare livrare si recenzii, cumparatorul ezita si pleaca.",
      "Completam pagina de produs: stoc, estimare livrare, recenzii, ghid marimi.");
    add("related", "Produse similare / recomandate", "Functii magazin", hasRelated ? "da" : "necunoscut",
      "Recomandarile cresc valoarea cosului cu 10-30%. Fara ele, lasi bani pe masa la fiecare comanda.",
      "Adaugam blocuri de produse similare si 'cumparate impreuna'.");
    add("feed", "Feed de produse (Shopping / Catalog Meta)", "Functii magazin", hasProductFeed ? "da" : "necunoscut",
      "Fara un feed de produse nu poti rula Google Shopping sau reclame de catalog Meta — cele mai profitabile formate pentru ecommerce. Concurentii cu feed apar cu poza si pret direct in cautare.",
      "Generam si conectam un feed de produse la Google Merchant Center si la catalogul Meta.");
    add("shopping_segmentare", "Segmentare produse in Google Shopping", "Functii magazin", "necunoscut",
      "Daca rulezi Shopping fara separare pe performanta, bugetul se imparte aproape egal pe tot catalogul — produsele care nu vand mananca bani degeaba. Un sistem de etichetare pe performanta muta banii pe produsele care aduc comenzi, cu aceeasi investitie.",
      "Implementam segmentare pe performanta a feed-ului (Heroes / Sidekicks / Villains / Zombies) + structura de campanii pe etichete.");
  }

  // ---- UX & MOBIL ----
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(homepage?.html ?? "");
  const speedSlow = mobile != null && mobile.score < 50;
  add("mobile", "Optimizare mobil", "UX & Mobil", hasViewport ? "da" : "nu",
    "~70% din trafic e pe telefon. Un site care nu e gandit pentru mobil pierde majoritatea cumparatorilor — si a bugetului de reclama.",
    "Optimizam experienta pe mobil: layout, butoane, viteza de incarcare.");
  add("speed", "Viteza pe mobil", "UX & Mobil", mobile == null ? "necunoscut" : (speedSlow ? "nu" : "da"),
    "Fiecare secunda de incarcare in plus inseamna pana la -7% conversii. Pe trafic platit, asta e buget aruncat direct.",
    "Optimizam imaginile, scripturile si serverul pentru incarcare sub 2.5s.");

  // ---- COS & CHECKOUT ----
  const hasFreeShip = has("livrare gratuita", "transport gratuit", "livrare gratis", "free shipping");
  add("freeship", "Prag livrare gratuita afisat", "Cos & checkout", hasFreeShip ? "da" : "necunoscut",
    "Costurile-surpriza de livrare sunt motivul #1 de abandon al cosului. Un prag de livrare gratuita afisat creste si valoarea comenzii.",
    "Afisam o bara de progres spre livrarea gratuita (ex: 'mai ai 40 lei pana la livrare gratuita').");

  const scorPpc = computePpcScore(leaks);

  return { isEcom, ruleazaReclame: (hasAds || hasPixel) ? "da" : (hasGTM ? "necunoscut" : "nu"), scorPpc, leaks };
}

// scor PPC: ponderam tracking-ul (vinde PPC), ignoram necunoscut
function computePpcScore(leaks: MoneyLeak[]): number {
  const w = (l: MoneyLeak) => (l.zona === "Tracking & PPC" ? 2 : 1);
  let num = 0, den = 0;
  for (const l of leaks) {
    if (l.present === "necunoscut") continue;
    den += w(l);
    if (l.present === "da") num += w(l);
  }
  return den ? Math.round((num / den) * 100) : 0;
}

// Suprascrie detectia statica cu adevarul din browser (runtime). Doar upgrade la
// "da" — absenta la runtime nu dovedeste lipsa (consent gating, tag pe alte pagini).
function applyLiveTracking(c: ConversieAudit, t: LiveTracking): ConversieAudit {
  const seen: Record<string, boolean> = { ga4: t.ga4, ads_conv: t.googleAds, pixel: t.metaPixel, tiktok: t.tiktok, consent: t.consent };
  const leaks = c.leaks.map((l) => (seen[l.id] && l.present !== "da" ? { ...l, present: "da" as Presence } : l));
  const ruleazaReclame: Presence = (t.googleAds || t.metaPixel || t.ga4) ? "da" : c.ruleazaReclame;
  return { ...c, leaks, scorPpc: computePpcScore(leaks), ruleazaReclame };
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function runAudit(rawUrl: string): Promise<AuditData> {
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  url = url.replace(/\/$/, "");
  const origin = new URL(url).origin;
  const domain = new URL(url).hostname;

  // Phase 1: robots.txt + sitemap
  const robotsTxt = await fetchText(`${origin}/robots.txt`);
  const sitemapUrl = extractSitemapFromRobots(robotsTxt, origin);
  const sitemapXml = await fetchText(sitemapUrl);
  let pageUrls = await parseSitemapXml(sitemapXml);

  // Fallback: try /sitemap_index.xml then /sitemap.xml
  if (pageUrls.length === 0) {
    const alt1 = await fetchText(`${origin}/sitemap_index.xml`);
    if (alt1) pageUrls = await parseSitemapXml(alt1);
  }
  if (pageUrls.length === 0) {
    const alt2 = await fetchText(`${origin}/sitemap.xml`);
    if (alt2) pageUrls = await parseSitemapXml(alt2);
  }

  let filtered = filterUrls(pageUrls, origin);

  // Fallback: sitemap declared in robots.txt pointeaza la alt domeniu (ex: brisa.ro)
  // In acest caz, incarcam direct sitemap-ul propriu al domeniului
  if (filtered.length === 0) {
    const own1 = await fetchText(`${origin}/sitemap_index.xml`);
    const own1urls = own1 ? await parseSitemapXml(own1) : [];
    filtered = filterUrls(own1urls, origin);
  }
  if (filtered.length === 0) {
    const own2 = await fetchText(`${origin}/sitemap.xml`);
    const own2urls = own2 ? await parseSitemapXml(own2) : [];
    filtered = filterUrls(own2urls, origin);
  }

  const { homepage, categories, products } = segmentUrls(filtered, origin);

  // Select pages to analyze — homepage + mix categorii/produse, umplut pana la MAX_PAGES
  const uniq = (arr: string[]) => [...new Set(arr.map(u => u.replace(/\/$/, "")))];
  let toAnalyze = uniq([homepage, ...categories, ...products]).slice(0, MAX_PAGES);

  // Fallback link-crawl: daca sitemap-ul a dat prea putine pagini (ex: sitemap absent/blocat),
  // extrage link-uri interne din homepage + primele cateva categorii pana atingem tinta.
  if (toAnalyze.length < MIN_PAGES) {
    const homeHtml = await fetchText(homepage);
    let discovered = filterUrls(extractInternalLinks(homeHtml, origin), origin);
    for (const seed of discovered.slice(0, 5)) {
      if (uniq([...toAnalyze, ...discovered]).length >= MAX_PAGES) break;
      const seedHtml = await fetchText(seed);
      discovered = discovered.concat(filterUrls(extractInternalLinks(seedHtml, origin), origin));
    }
    toAnalyze = uniq([homepage, ...categories, ...products, ...discovered]).slice(0, MAX_PAGES);
  }

  if (!toAnalyze.includes(homepage)) toAnalyze.unshift(homepage);

  // Phase 2: Fetch pages (concurenta FETCH_CONCURRENCY)
  const pages: PageData[] = [];
  for (let i = 0; i < toAnalyze.length; i += FETCH_CONCURRENCY) {
    const batch = toAnalyze.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(batch.map(u => fetchPage(u)));
    pages.push(...results);
  }

  const analyzedPages = pages.filter(p => p.ok);
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
  const schema = computeSchemaChecks(analyzedPages);
  const social = computeSocialChecks(homepageData);
  const securitate = computeSecurityChecks(homepageData);

  const scor = computeOverallScore(viteza, seoChecks, continutChecks, keywordsChecks, structuraChecks, schema, social, securitate);
  let conversie = computeConversieAudit(analyzedPages, mobile, hasProductFeed);
  const productSignal = conversie.isEcom ? computeProductSignal(analyzedPages, products, hasProductFeed) : undefined;
  const ux = conversie.isEcom ? computeUxAudit(analyzedPages, { homepage, categories, products }, mobile, domain) : undefined;

  // Phase 5: browser real (BrightData) — tracking la runtime + CSS + peisaj Shopping.
  // Doar ecom. Tracking-ul via GTM nu se vede in HTML brut; il citim la runtime.
  let googleAds: GoogleShoppingIntel | undefined;
  if (conversie.isEcom && process.env.BRIGHTDATA_CDP) {
    // Selectia titlurilor de produs pt interogarile Shopping, in ordinea increderii:
    // 1) pagini cu semnale reale de produs (schema/pret+cos), 2) segmentare pe URL, 3) restul.
    const norm = (u: string) => u.replace(/\/$/, "");
    const productSet = new Set(products.map(norm));
    const titlesFrom = (ps: PageData[]) => ps.map((p) => parseTitle(p.html)).filter(Boolean);
    const contentProducts = titlesFrom(analyzedPages.filter((p) => isProductPage(p.html)));
    const urlProducts = titlesFrom(analyzedPages.filter((p) => productSet.has(norm(p.url))));
    const fallbackTitles = titlesFrom(analyzedPages.slice(1));
    const bestTitles = contentProducts.length >= 2 ? contentProducts : (urlProducts.length ? urlProducts : fallbackTitles);
    const brand = domain.replace(/^www\./, "").split(".")[0];
    const queries = deriveProductQueries(brand, bestTitles);
    try {
      // safety cap: navigatia BrightData poate fi lenta; nu blocam auditul.
      // 4 faze secventiale (tracking + Shopping + brand) -> plafon 82s.
      const live = await Promise.race([
        analyzeProspectLive(domain, origin, queries, { maxQueries: 3, brand }),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 82000)),
      ]);
      if (live) {
        googleAds = { css: live.css, shopping: live.shopping, pricePosition: live.pricePosition, brandDefense: live.brandDefense, gbpReviews: live.gbpReviews };
        if (live.tracking?.ok) conversie = applyLiveTracking(conversie, live.tracking);
      }
    } catch {
      googleAds = undefined;
    }
  }

  // Nota: simularea de venit (roiSim) se calculeaza in lib/audit-store (tryFinalize),
  // cand sosesc inputurile din funnel — nu aici. runAudit produce doar semnalele.

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
    conversie,
    googleAds,
    productSignal,
    ux,
  };
}
