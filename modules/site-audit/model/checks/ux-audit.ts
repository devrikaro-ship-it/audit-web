import { hasAddToCart, priceCount } from "@/modules/site-audit/model/page-selection";
import { countH1, countInternalLinks, countWords, hasBreadcrumbs, parseImages } from "@/modules/site-audit/model/parse-page";
import type { UxAudit, UxField } from "@/modules/site-audit/model/types";
import { VERDICT_GOOD, scoreToUxStatus } from "@/modules/site-audit/model/scoring";
import type { PSIResult, PageData } from "@/modules/site-audit/model/data/net";
import { UX_SIGNALS } from "@/modules/site-audit/model/copy-registry";

// ── UX / UI — analiza pe tipuri de pagina (spec 3.3) ─────────────────────────
// Semnale euristice din HTML-ul fiecarui tip de pagina (home / categorie / produs).
// Cand nu prindem un tip de pagina in crawl -> status "necunoscut" (exclus din medie).

export function hasPaginationUi(html: string): boolean {
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

export function hasSortUi(html: string): boolean {
  return /orderby|sorteaz[aă]|sortare|sort[-_ ]?by|[?&]sort=|["']sort-/i.test(html);
}

export function hasFiltersUi(html: string): boolean {
  return /woocommerce-widget-layered-nav|wc-block-attribute-filter|yith-wcan|filtreaz[aă]|facet|filter-options|price_slider|filter-widget|data-filter|["']filters?["']/i.test(html);
}

export function hasReviewsUi(html: string): boolean {
  return /aggregaterating|trustpilot|yotpo|judge\.me|stamped|reviews\.io|okendo|recenzii|review-|star-rating|rating-stars|stele/i.test(html);
}

export function hasRelatedUi(html: string): boolean {
  return /produse similare|related|s-ar putea sa|recomandate|you may also like|complete the look|cross-sell|upsell/i.test(html);
}

export function hasNavUi(html: string): boolean {
  return /<nav[\s>]|role=["']navigation["']|class=["'][^"']*(menu|navbar|main-nav)/i.test(html);
}

export function hasIntroText(html: string): boolean {
  const paras = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  return paras.some(p => countWords(p) >= 30);
}

export function contentImageCount(html: string): number {
  return parseImages(html).filter(im => !/logo|icon|sprite|badge|payment|placeholder|avatar/i.test(im.src)).length;
}

export function hasStockSignal(html: string): boolean {
  return /in stoc|in stock|schema\.org\/instock|stoc epuizat|out of stock|disponibil|availability/i.test(html);
}

export function uxField(id: string, label: string, checks: { ok: boolean; g: string; l: string }[], problema: string, fix: string): UxField {
  const gasit = checks.filter(c => c.ok).map(c => c.g);
  const lipsa = checks.filter(c => !c.ok).map(c => c.l);
  const scor = Math.round((gasit.length / checks.length) * 100);
  return { id, label, status: scoreToUxStatus(scor), scor, gasit, lipsa, problema, fix };
}

export function uxUnknown(id: string, label: string, problema: string, fix: string, lipsa = "nu am prins acest tip de pagina in crawl"): UxField {
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
