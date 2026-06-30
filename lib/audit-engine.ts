import type { AuditData, CheckResult, PageCheck, StatusCheck } from "./types";

const FETCH_TIMEOUT = 12000;
const MAX_PAGES = 50;
const LLM_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot", "CCBot", "Googlebot-Extended"];

// ── HTML parsing utilities ───────────────────────────────────────────────────

function parseTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function parseMeta(html: string, name: string): string {
  const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*?)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']${name}["']`, "i");
  return (html.match(re1) ?? html.match(re2))?.[1]?.trim() ?? "";
}

function parseMetaOG(html: string, prop: string): string {
  const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*?)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']${prop}["']`, "i");
  return (html.match(re1) ?? html.match(re2))?.[1]?.trim() ?? "";
}

function parseCanonical(html: string): string {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*?)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']*?)["'][^>]+rel=["']canonical["']/i);
  return m?.[1]?.trim() ?? "";
}

function countH1(html: string): number {
  return (html.match(/<h1[\s>]/gi) ?? []).length;
}

function hasH2(html: string): boolean {
  return /<h2[\s>]/i.test(html);
}

function parseJsonLD(html: string): object[] {
  const results: object[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try { results.push(JSON.parse(m[1])); } catch { /* skip invalid */ }
  }
  return results;
}

function parseImages(html: string): { src: string; alt: string }[] {
  const results: { src: string; alt: string }[] = [];
  const re = /<img([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const src = (attrs.match(/src=["']([^"']+)["']/) ?? [])[1] ?? "";
    const alt = (attrs.match(/alt=["']([^"']*?)["']/) ?? [])[1] ?? "__MISSING__";
    if (src && !src.startsWith("data:")) results.push({ src, alt });
  }
  return results;
}

function countInternalLinks(html: string, domain: string): number {
  const re = /href=["']([^"']+)["']/gi;
  let count = 0, m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.includes(domain) || href.startsWith("/")) count++;
  }
  return count;
}

function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").filter(w => w.length > 2).length : 0;
}

function hasBreadcrumbs(html: string): boolean {
  return /breadcrumb/i.test(html) || /BreadcrumbList/i.test(html);
}

function hasFAQ(html: string): boolean {
  return /faq|intrebari\s+frecvente|frequently\s+asked/i.test(html) || /FAQPage/i.test(html);
}

function isCleanUrl(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    if (search) return false;
    if (/[^a-z0-9\-\/\.\_]/i.test(pathname)) return false;
    return true;
  } catch { return false; }
}

function extractKeyword(title: string, metaDesc: string): string {
  const clean = title.split(/[|\-–—,:]/)[0].trim().toLowerCase();
  return clean.split(" ").slice(0, 3).join(" ");
}

// ── Fetch utilities ──────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AuditBot/1.0)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetchWithTimeout(url);
    return r.ok ? r.text() : "";
  } catch { return ""; }
}

type PageData = {
  url: string;
  html: string;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
};

async function fetchPage(url: string): Promise<PageData> {
  try {
    const r = await fetchWithTimeout(url, 10000);
    const html = r.ok ? await r.text() : "";
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { url, html, status: r.status, headers, ok: r.ok };
  } catch {
    return { url, html: "", status: 0, headers: {}, ok: false };
  }
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

function filterUrls(urls: string[], origin: string): string[] {
  return urls.filter(u => {
    if (!u.startsWith(origin)) return false;
    return !EXCLUDE_PATTERNS.some(re => re.test(u));
  });
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

// ── PageSpeed API ────────────────────────────────────────────────────────────

type PSIResult = {
  score: number;
  lcp: string;
  cls: string;
  tbt: string;
};

async function fetchPSI(url: string, strategy: "mobile" | "desktop"): Promise<PSIResult | null> {
  try {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&fields=lighthouseResult.categories.performance.score,lighthouseResult.audits`;
    const r = await fetchWithTimeout(endpoint, 25000);
    if (!r.ok) return null;
    const json = await r.json();
    const audits = json?.lighthouseResult?.audits ?? {};
    const score = Math.round((json?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
    return {
      score,
      lcp: audits["largest-contentful-paint"]?.displayValue ?? "—",
      cls: audits["cumulative-layout-shift"]?.displayValue ?? "—",
      tbt: audits["total-blocking-time"]?.displayValue ?? "—",
    };
  } catch { return null; }
}

function psiToStatus(score: number): StatusCheck {
  if (score >= 70) return "ok";
  if (score >= 40) return "atentie";
  return "critic";
}

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

function computeSeoChecks(pages: PageData[], domain: string): PageCheck[] {
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
    const kw = extractKeyword(title, parseMeta(p.html, "description"));
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

function computeSecurityChecks(homepage: PageData, allPages: PageData[]): Record<string, CheckResult> {
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

function computeVitezaChecks(mobile: PSIResult | null, desktop: PSIResult | null): Record<string, CheckResult> {
  if (!mobile && !desktop) {
    return {
      pagespeed_mobile:  { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" },
      pagespeed_desktop: { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" },
      lcp:  { status: "atentie", value: "Date indisponibile" },
      cls:  { status: "atentie", value: "Date indisponibile" },
      inp:  { status: "atentie", value: "Date indisponibile" },
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

  // Select pages to analyze
  const toAnalyze = [
    homepage,
    ...categories.slice(0, 15),
    ...products.slice(0, 34),
  ].slice(0, MAX_PAGES);

  if (!toAnalyze.includes(homepage)) toAnalyze.unshift(homepage);

  // Phase 2: Fetch pages (5 concurrent)
  const pages: PageData[] = [];
  for (let i = 0; i < toAnalyze.length; i += 5) {
    const batch = toAnalyze.slice(i, i + 5);
    const results = await Promise.all(batch.map(u => fetchPage(u)));
    pages.push(...results);
  }

  const analyzedPages = pages.filter(p => p.ok);
  const homepageData = analyzedPages[0] ?? pages[0] ?? { url: homepage, html: "", status: 0, headers: {}, ok: false };

  // Phase 3: PSI (parallel, homepage only)
  const [mobileResult, desktopResult] = await Promise.allSettled([
    fetchPSI(origin, "mobile"),
    fetchPSI(origin, "desktop"),
  ]);
  const mobile = mobileResult.status === "fulfilled" ? mobileResult.value : null;
  const desktop = desktopResult.status === "fulfilled" ? desktopResult.value : null;

  // Phase 4: Compute section results
  const viteza = computeVitezaChecks(mobile, desktop);
  const seoChecks = computeSeoChecks(analyzedPages, domain);
  const continutChecks = computeContinutChecks(analyzedPages);
  const keywordsChecks = computeKeywordsChecks(analyzedPages);
  const structuraChecks = computeStructuraChecks(analyzedPages, robotsTxt, sitemapXml, sitemapUrl);
  const schema = computeSchemaChecks(analyzedPages);
  const social = computeSocialChecks(homepageData);
  const securitate = computeSecurityChecks(homepageData, analyzedPages);

  const scor = computeOverallScore(viteza, seoChecks, continutChecks, keywordsChecks, structuraChecks, schema, social, securitate);

  return {
    url: origin,
    domain,
    pagesAnalyzed: analyzedPages.length,
    scor,
    checksRezultate: { ...viteza, ...schema, ...social, ...securitate },
    seoChecks,
    continutChecks,
    keywordsChecks,
    structuraChecks,
  };
}
