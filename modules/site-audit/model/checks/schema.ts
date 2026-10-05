import type { PageData } from "@/modules/site-audit/model/data/net";
import type { CheckResult, StatusCheck } from "@/modules/site-audit/model/types";
import { schemaTypes } from "@/modules/site-audit/model/parse-page";

// Organization subtypes follow schema.org naming (OnlineStore, LocalBusiness, ClothingStore, MedicalBusiness...).
export const ORGANIZATION_TYPE = /Organization|Business|Store|Corporation/;

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
