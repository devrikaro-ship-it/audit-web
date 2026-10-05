import type { SeoComponent, SeoRow } from "@/modules/site-audit/model/types";
import type { PSIResult, PageData } from "@/modules/site-audit/model/data/net";
import { VERDICT_GOOD } from "@/modules/site-audit/model/scoring";
import { countH1, countInternalLinks, countWords, hasBreadcrumbs } from "@/modules/site-audit/model/parse-page";
import { hasAddToCart, priceCount } from "@/modules/site-audit/model/page-selection";
import { UX_LIMITS } from "@/modules/site-audit/model/seo-limits";
import { ownWrittenText } from "./content";
import { contentImageCount, hasFiltersUi, hasIntroText, hasNavUi, hasRelatedUi, hasReviewsUi, hasSortUi, hasStockSignal, paginationState } from "./ux-audit";

// ── Part 2 as a ✓/✗ checklist, both kinds of site (spec 2026-09-25 §4) ──────────
// Rows share the SEO rows' shape: ok of total, total 0 = not measured, verify = cannot be told from outside. The score
// is the share of ✓ (lib/seo-score.ts). Lead signals measured 2026-09-25 on dentalview.ro and piontaniservices.ro.
export const uxRow = (id: string, ok: number, total: number, verify = false): SeoRow => ({ id, ok, total, ...(verify ? { verify } : {}) });

export const yes = (id: string, pass: boolean | null): SeoRow => uxRow(id, pass ? 1 : 0, pass === null ? 0 : 1);

export const onPages = (id: string, pages: PageData[], pass: (p: PageData) => boolean): SeoRow => uxRow(id, pages.filter(pass).length, pages.length);

export const readableOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// A phone in the header: a phone link before the page's main heading (both sites: header phone, H1 further down).
export const phoneBeforeHeading = (html: string) => {
  const body = html.slice(Math.max(0, html.search(/<body/i)));
  const tel = body.search(/href=["']tel:/i);
  const h1 = body.search(/<h1/i);
  return tel >= 0 && (h1 >= 0 ? tel < h1 : tel < body.length * 0.2);
};

// A button or link that asks to book, for a quote or to get in touch.
export const ASK_CONTROL = /<(a|button)\b[^>]*>[^<]*(?:<[^>]+>[^<]*){0,3}(programeaz|programare|solicit[ăa]\s+(o\s+)?ofert|cere(ti)?\s+(o\s+)?ofert|contacteaz|contact|suna|book|get a quote)/i;

// A contact form: a phone or email field, at most five fields a visitor fills (the site search box is not one).
export const shortContactForm = (html: string) => (html.match(/<form[\s\S]*?<\/form>/gi) ?? []).some((f) => {
  const fields = f.match(/<(input|select|textarea)\b(?![^>]*type=["']?(hidden|submit|button|checkbox|radio|image|reset)\b)[^>]*>/gi) ?? [];
  return /type=["']?(email|tel)\b|name=["'][^"']*(email|phone|telefon|tel)\b/i.test(f) && fields.length >= 2 && fields.length <= 5;
});

// A WhatsApp link or a chat widget: the word "whatsapp" alone matched an image file name on dentalview.ro.
export const CHAT = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|embed\.tawk\.to|tawkTo|code\.tidio|client\.crisp\.chat|smartsuppchat|livechatinc|zopim|widget\.intercom|customerchat|msg-item-whatsapp/i;

export const MAP = /google\.[a-z.]+\/maps|maps\.google\.|<iframe[^>]*maps/i;

export const HOURS = /luni\s*[-–]\s*(vineri|sambata|sâmbătă)|\bL\s*[-–]\s*V\b|opening hours|openingHours|program(ul)?\s*(de lucru)?\s*:/i;

export const REVIEWS = /testimonial|recenzi|pareri|p[ăa]rerea|ce spun|review|aggregaterating|trustpilot|google-reviews|stele/i;

export const TEAM = /\bechip[aei]|\bmedicii\b|\bspecialist|\bdr\.\s|\bdoctor|\bteam\b/i;

export const CERTS = /certific|acredit|parteneri|\biso\s?\d|autorizat|premi(u|i|ul)|award/i;

export const lcpSeconds = (lcp: string) => { const m = lcp.replace(",", ".").match(/([\d.]+)\s*(ms|s)\b/i); return m ? Number(m[1]) / (m[2].toLowerCase() === "ms" ? 1000 : 1) : null; };

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
        // Trust is judged where a visitor forms his first opinion (spec 2026-09-26 §3): the home page.
        yes("tr_reviews", anyPage(REVIEWS, true) || anyPage(/aggregateRating/i)),
        yes("tr_team", anyPage(TEAM, true)),
        yes("tr_certs", anyPage(CERTS, true)),
        uxRow("tr_photos", 0, 1, true),
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
      yes("home_paths", countInternalLinks(home, domain) >= UX_LIMITS.homeLinks),
      yes("home_mobile", viewport),
    ] },
    { id: "categorie", rows: [
      on(cat, "cat_grid", () => priceCount(cat) >= 3 || contentImageCount(cat) >= 6),
      on(cat, "cat_trail", () => hasBreadcrumbs(cat)),
      ...(pagination === null ? [] : [yes("cat_pagination", pagination)]),
      on(cat, "cat_intro", () => hasIntroText(cat)),
      // Filters and sorting belong to the category page they serve (spec 2026-09-26 §3).
      yes("filters", hasFiltersUi(filterHtml)),
      yes("sort", hasSortUi(filterHtml)),
    ] },
    { id: "produs", rows: [
      on(prod, "prod_images", () => contentImageCount(prod) >= UX_LIMITS.productImages),
      on(prod, "prod_price", () => priceCount(prod) >= 1 && hasStockSignal(prod)),
      on(prod, "prod_cart", () => hasAddToCart(prod)),
      on(prod, "prod_description", () => countWords(prod) >= 200),
      on(prod, "prod_reviews", () => hasReviewsUi(prod)),
      on(prod, "prod_related", () => hasRelatedUi(prod)),
    ] },
  ];
}
