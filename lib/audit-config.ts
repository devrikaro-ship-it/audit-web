// Motorul de audit foloseste sitemap-ul site-ului ca sursa de pagini de analizat.
// Sitemap-ul contine deja paginile pe care proprietarul vrea indexate — nu ghicim dupa URL.

// ── Limite crawl ─────────────────────────────────────────────────────────────

export const CRAWL_LIMITS = {
  maxProduse:    25,  // pagini de produs / serviciu de nivel 2+
  maxCategorii:  20,  // pagini de categorie / sectiune
  maxBlogPosts:  10,  // articole de blog
  totalMaxPagini: 60, // limita totala per audit
};

// ── Pagini excluse chiar daca apar in sitemap ─────────────────────────────────
// Unele site-uri includ in sitemap si pagini fara valoare SEO.

export const URL_PATTERNS_EXCLUSE: RegExp[] = [
  /\/contact(\/|$)/i,
  /\/despre(-noi)?(\/|$)/i,
  /\/about(\/|$)/i,
  /\/termeni(\/|$)/i,
  /\/terms(\/|$)/i,
  /\/privacy|\/confidentialitate|\/gdpr|\/cookie/i,
  /\/politica-retur|\/returns|\/livrare|\/shipping/i,
  /\/galerie|\/gallery|\/echipa|\/team/i,
  /\/cart|\/checkout|\/my-account|\/contul-meu|\/wishlist/i,
  /\/wp-login|\/wp-admin|\/wp-json|\/feed|\/xmlrpc/i,
  /[?&](utm_|ref=|session|token)/i,
];

// ── Flux audit bazat pe sitemap ───────────────────────────────────────────────
//
// 1. Citeste robots.txt → gaseste linia "Sitemap: ..."
// 2. Fetch sitemap.xml (poate fi sitemap index cu mai multe fisiere)
// 3. Parseaza toate URL-urile din <loc> tags
// 4. Filtreza URL-urile excluse (lista de mai sus)
// 5. Homepage = URL-ul care e radacina domeniului (ex: https://site.ro/)
// 6. Restul URL-urilor: sorteaza dupa <priority> descrescator (daca exista)
// 7. Aplica CRAWL_LIMITS — ia primele N din fiecare categorie
// 8. Analizeaza fiecare pagina selectata
//
// De ce sitemap si nu crawl complet:
// - Sitemap-ul reflecta intentia proprietarului — paginile pe care le vrea indexate
// - Nu pierde timp pe pagini irelevante (contact, termeni, conturi)
// - Mai rapid: nu trebuie sa urmaresti link-uri interne
// - Mai precis: sitemap-ul are prioritati si date de modificare

// ── Clasificare simpla dupa adancimea URL-ului ────────────────────────────────
// Folosita doar pentru a aplica limitele (max N produse, max M categorii).
// Nu e critica — si daca gresim clasificarea, pagina tot se analizeaza.

export type TipPagina = "homepage" | "categorie" | "produs" | "ignorata";

export function clasificaPagina(url: string): TipPagina {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");

    if (path === "" || path === "/") return "homepage";
    if (URL_PATTERNS_EXCLUSE.some(p => p.test(path))) return "ignorata";

    const segmente = path.split("/").filter(Boolean);
    // 1 segment = categorie/sectiune (ex: /servicii, /produse, /blog)
    // 2+ segmente = pagina individuala (ex: /servicii/implant, /produse/telefon)
    return segmente.length === 1 ? "categorie" : "produs";
  } catch {
    return "ignorata";
  }
}

export const PRIORITATE_TIP: Record<TipPagina, number> = {
  homepage:  1,
  categorie: 2,
  produs:    3,
  ignorata:  99,
};
