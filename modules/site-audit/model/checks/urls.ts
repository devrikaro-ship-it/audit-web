

// ── HTML parsing utilities: in lib/parse-page (pur + testat) ──────────────────

export function isCleanUrl(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    if (search) return false;
    if (/[^a-z0-9\-\/\.\_]/i.test(pathname)) return false;
    return true;
  } catch { return false; }
}

export function extractKeyword(title: string): string {
  const clean = title.split(/[|\-–—,:]/)[0].trim().toLowerCase();
  return clean.split(" ").slice(0, 3).join(" ");
}

// ── Fetch utilities: in lib/net (seam de retea, singurul loc cu fetch) ─────────

// Site in spatele unei protectii anti-bot (Cloudflare/challenge) sau pagina goala:
// crawler-ul nu primeste HTML real, deci auditul ar fi fals.
export function detectBlocker(homepageHtml: string): string | null {
  const blocked = /Just a moment|cf-mitigated|challenge-platform|Attention Required|_cf_chl|Enable JavaScript and cookies/i.test(homepageHtml);
  const empty = homepageHtml.replace(/\s+/g, "").length < 2000;
  if (blocked) return "Site-ul este in spatele unei protectii anti-bot (Cloudflare/challenge). Crawler-ul nu primeste continutul real, asa ca o parte din verificari pot fi incomplete.";
  if (empty) return "Pagina a raspuns cu foarte putin continut (posibil site JavaScript/SPA sau gol). O parte din verificari pot fi incomplete.";
  return null;
}

// ── Sitemap discovery ────────────────────────────────────────────────────────

export function extractSitemapFromRobots(robotsTxt: string, origin: string): string {
  const m = robotsTxt.match(/^Sitemap:\s*(.+)$/im);
  return m?.[1]?.trim() ?? `${origin}/sitemap.xml`;
}

// A lead site's contact page is one of the pages that bring contacts (spec 2026-09-25 §2.4): read there, excluded
// on a shop.
export const CONTACT_PAGE = /\/contact(\/|$)/i;

export const EXCLUDE_PATTERNS = [
  CONTACT_PAGE, /\/despre(-noi)?(\/|$)/i, /\/about(\/|$)/i,
  /\/termeni(\/|$)/i, /\/terms(\/|$)/i, /\/privac|confidential|gdpr|cookie/i,
  /\/retur|return|livrare|shipping/i, /\/galerie|gallery|echipa|team/i,
  /\/cart|\/checkout|\/my-account|\/contul|\/wishlist/i,
  /\/wp-login|\/wp-admin|\/wp-json|\/feed|\/xmlrpc/i,
  /[?&](utm_|ref=|session|token)/i, /\.(xml|pdf|jpe?g|png|gif|webp|svg|ico|css|js|woff2?|ttf|mp4)(\?|$)/i,
];

// Potrivire pe host ignorand "www." — robots.txt indica des sitemap pe www
// iar auditul ruleaza pe non-www (sau invers). Fara asta, toate URL-urile pica.
export function sameHost(a: string, b: string): boolean {
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
