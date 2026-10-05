import type { PageData } from "@/modules/site-audit/model/data/net";
import type { ProductSignal } from "@/modules/site-audit/model/types";
import { parseMeta, parseTitle } from "@/modules/site-audit/model/parse-page";

// ── Semnal produse neoptimizate (carlig Catamo) ──────────────────────────────
// Constatare standard, mereu-prezenta pe ecom. Cand prindem pagini de produs,
// o ancoram in numere reale (titluri scurte/generice, meta lipsa); altfel generica.

export function computeProductSignal(pages: PageData[], productUrls: string[], hasProductFeed: boolean): ProductSignal {
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
