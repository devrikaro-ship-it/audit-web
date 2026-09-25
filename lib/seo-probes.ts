// The small network checks behind the SEO components (lib/seo-components.ts): redirects followed by hand so every
// hop is counted. A 403/429 is the shop limiting our server, never a finding about the shop: it is left out.
import { isNoindex } from "./audit-engine";
import { parseCanonical } from "./parse-page";
import { BROWSER_UA } from "./net";
import type { SeoProbes } from "./seo-components";

type Hop = { status: number; location: string | null };
type Fetcher = (url: string, method: "HEAD" | "GET") => Promise<Hop & { html?: string; headers?: Record<string, string> }>;

export const liveFetcher: Fetcher = async (url, method) => {
  const r = await fetch(url, { method, redirect: "manual", headers: { "user-agent": BROWSER_UA }, signal: AbortSignal.timeout(10000) });
  return {
    status: r.status, location: r.headers.get("location"),
    html: method === "GET" ? await r.text() : undefined,
    headers: Object.fromEntries(r.headers.entries()),
  };
};

// Follows redirects by hand: the final address and how many hops it took; null when unreachable or refused.
async function trace(url: string, fetcher: Fetcher, maxHops = 6): Promise<{ final: string; hops: number } | null> {
  let current = url;
  for (let hops = 0; hops <= maxHops; hops++) {
    const r = await fetcher(current, "HEAD").catch(() => null);
    if (!r || r.status === 403 || r.status === 429) return null;
    if (r.status >= 300 && r.status < 400 && r.location) { current = new URL(r.location, current).href; continue; }
    return { final: current, hops };
  }
  return null;
}

// Run before the page burst: shops that rate-limit (Shopify) answer 429 to anything requested right after it.
export async function runSeoProbes(origin: string, listedMoney: string[], category: string | null, sitemapXml = "", fetcher: Fetcher = liveFetcher): Promise<SeoProbes> {
  const host = new URL(origin).host;
  const other = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const [main, http, httpOther, httpsOther] = await Promise.all([
    trace(`https://${host}/`, fetcher), trace(`http://${host}/`, fetcher), trace(`http://${other}/`, fetcher), trace(`https://${other}/`, fetcher),
  ]);
  const finalHost = (t: { final: string }) => new URL(t.final).host;
  const variants = [main, http, httpOther, httpsOther].filter((t): t is { final: string; hops: number } => !!t);
  const others = [http, httpOther, httpsOther].filter((t): t is { final: string; hops: number } => !!t);

  const sample = listedMoney.slice(0, 20);
  let ok = 0, total = 0;
  for (const u of sample) {
    let r = await fetcher(u, "HEAD").catch(() => null);
    if (r && r.status === 405) r = await fetcher(u, "GET").catch(() => null);
    if (!r || r.status === 403 || r.status === 429) continue;
    total++;
    if (r.status === 200) ok++;
  }

  let sortParamHandled: boolean | null = null;
  if (category) {
    // Followed by hand: a category without its trailing slash first redirects to the address that has it.
    let url = `${category}${category.includes("?") ? "&" : "?"}sort=price`;
    let r = await fetcher(url, "GET").catch(() => null);
    for (let hop = 0; r && r.status >= 300 && r.status < 400 && r.location && hop < 5; hop++) {
      url = new URL(r.location, url).href;
      r = await fetcher(url, "GET").catch(() => null);
    }
    const clean = (u: string) => u.replace(/[?#].*$/, "").replace(/\/$/, "");
    if (r && r.status === 200 && r.html !== undefined) {
      const page = { url, html: r.html, status: 200, ok: true, headers: r.headers ?? {} };
      const canonical = parseCanonical(r.html);
      sortParamHandled = isNoindex(page) || (!!canonical && clean(new URL(canonical, url).href) === clean(category) && !new URL(canonical, url).search);
    }
  }

  // A sitemap index (Shopify, Rank Math) keeps the dates in its child sitemaps: of the first three children, the one
  // listing the most pages is judged (Shopify's first child lists a single agents.md).
  let sitemapLastmod: boolean | null = sitemapXml ? /<lastmod>/i.test(sitemapXml) : null;
  if (/<sitemapindex/i.test(sitemapXml)) {
    const children = [...sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].slice(0, 3).map((m) => m[1].replace(/&amp;/g, "&"));
    const read = await Promise.all(children.map((c) => fetcher(c, "GET").then((r) => (r.status === 200 ? r.html ?? "" : null)).catch(() => null)));
    const biggest = read.filter((x): x is string => x !== null).sort((a, b) => (b.match(/<url>/gi)?.length ?? 0) - (a.match(/<url>/gi)?.length ?? 0))[0];
    sitemapLastmod = biggest === undefined ? null : /<lastmod>/i.test(biggest);
  }

  return {
    sitemapLastmod,
    httpToHttps: http ? http.final.startsWith("https://") : null,
    maxRedirectHops: variants.length ? Math.max(...variants.map((v) => v.hops)) : null,
    // An address variant that does not exist (no www at all) cannot duplicate the site.
    variantsSameHost: main ? others.every((t) => finalHost(t) === finalHost(main)) : null,
    sitemapSample: { ok, total },
    sortParamHandled,
  };
}
