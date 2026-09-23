import { describe, expect, it } from "vitest";
import { schemaTypes } from "./parse-page";
import { computeSchemaChecks } from "./audit-engine";
import type { PageData } from "./net";

const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const page = (url: string, html: string): PageData => ({ url, html, status: 200, headers: {}, ok: true });

// Shapes measured on 2026-09-23: Rank Math puts every entity in @graph (magazinfitness.ro); Shopify and GoMag
// declare the organization as OnlineStore (diente.ro, mariart.ro); BreadcrumbList lives on product pages only.
const home = page("https://s.ro", ld({ "@context": "https://schema.org", "@graph": [{ "@type": "Organization" }, { "@type": "WebSite" }] }));
const product = (i: number, rated: boolean) => page(`https://s.ro/p${i}`, ld({ "@graph": [{ "@type": "BreadcrumbList" }, { "@type": ["Product"], ...(rated ? { aggregateRating: { "@type": "AggregateRating", ratingValue: 5 } } : {}) }] }));

describe("schemaTypes", () => {
  it("reads types inside @graph, array-valued @type and nested entities", () => {
    expect([...schemaTypes(product(1, true).html)].sort()).toEqual(["AggregateRating", "BreadcrumbList", "Product"]);
    expect(schemaTypes(home.html).has("Organization")).toBe(true);
  });
});

describe("computeSchemaChecks", () => {
  const seg = { categories: [], products: ["https://s.ro/p1", "https://s.ro/p2", "https://s.ro/p3", "https://s.ro/p4"] };

  it("finds an Organization declared inside @graph", () => {
    expect(computeSchemaChecks([home], { categories: [], products: [] }).schema_tipuri.status).toBe("ok");
  });

  it("accepts Organization subtypes such as OnlineStore", () => {
    const store = page("https://s.ro", ld({ "@type": "OnlineStore" }));
    expect(computeSchemaChecks([store], { categories: [], products: [] }).schema_tipuri.status).toBe("ok");
  });

  it("looks for BreadcrumbList on product pages, not on the homepage", () => {
    const r = computeSchemaChecks([home, product(1, false), product(2, false)], seg);
    expect(r.schema_breadcrumbs.status).toBe("ok");
  });

  it("does not judge breadcrumbs or rating when no product or category page was read", () => {
    const r = computeSchemaChecks([home], { categories: [], products: [] });
    expect(r.schema_breadcrumbs).toBeUndefined();
    expect(r.schema_rating).toBeUndefined();
  });

  it("reports rating on some product pages as partial, with the real counts", () => {
    const r = computeSchemaChecks([home, product(1, true), product(2, false), product(3, false), product(4, false)], seg);
    expect(r.schema_rating).toEqual({ status: "atentie", value: "Rating pe 1 din 4 pagini de produs verificate" });
  });
});
