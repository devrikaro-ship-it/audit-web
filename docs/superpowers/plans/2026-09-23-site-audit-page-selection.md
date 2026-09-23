# Site audit page selection — implementation plan

> Executed inline in the primary session (project rule: no subagents). Operator ordering: implementation first,
> then targeted tests, then negative controls.

**Goal:** the cold website audit analyses products and categories instead of whatever the sitemap lists first.

**Architecture:** a new pure module `lib/page-selection.ts` owns sitemap classification, quota selection and
post-fetch page classification. `lib/audit-engine.ts` calls it instead of `parseSitemapXml` + `segmentUrls` and
feeds the classified product/category lists to the existing UX, Catamo and Shopping-query code.

**Tech stack:** Next.js / TypeScript, vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-site-audit-page-selection-design.md`.

## Global constraints

1. Report structure unchanged: no rubric or field added or removed (`docs/AUDIT-SPEC.md` §3-§4).
2. Budget 60 pages including the homepage; quotas 15 categories, 35 products, at most 5 other pages.
3. Space a type cannot fill goes to products, then categories, then other pages.
4. A URL listed in a category sitemap stays a category (WooCommerce category grids carry add-to-cart buttons).

---

### Task 1: `lib/page-selection.ts`

**Produces:**
- `type PageType = "product" | "category" | "other"`, `type TypedUrls = Record<PageType, string[]>`
- `classifySitemap(url: string): PageType`
- `collectTypedUrls(xml: string, fetchText: (u: string) => Promise<string>, sitemapUrl?: string): Promise<TypedUrls>`
- `sampleEvenly<T>(items: T[], n: number): T[]`
- `selectPages(homepage: string, typed: TypedUrls): { urls: string[]; planned: Map<string, PageType> }`
- `classifyFetchedPage(html: string, planned: PageType): PageType`
- `priceCount(html)`, `hasAddToCart(html)` moved here from the engine (the engine imports them).

Sitemap name rules: category = `product_cat|collections?|categor`; other = `tag|brand`; product = `products?`;
everything else other. Child sitemaps: every product and category child is read (capped at 10 per type); other
children only up to 5, as before.

Fetched-page rules, in order: planned category → category; Product JSON-LD or `og:type=product` → product;
planned product with a price signal and add-to-cart → product; 6 or more prices → category; else other.

### Task 2: wire the engine

**Modify:** `lib/audit-engine.ts` — `runAudit` phase 1 and the Shopping query selection.

1. Build `TypedUrls` from robots sitemap → `/sitemap_index.xml` → `/sitemap.xml` (same fallback order as today),
   filter every pool with `filterUrls`.
2. When no product and no category URL was found, put the homepage internal links at the front of `other`.
3. `selectPages` → `toAnalyze`. The existing link-crawl fallback below `MIN_PAGES` appends discovered links to
   `other` and re-selects.
4. After fetching, classify each page with `classifyFetchedPage`; `products` and `categories` become the URLs
   classified as such. `computeProductSignal`, `computeUxAudit` and the Shopping queries use those lists.
5. Delete `parseSitemapXml`, `segmentUrls`, `isProductPage` and `MAX_PAGES` once unused.

### Task 3: tests + negative controls

**Create:** `lib/page-selection.test.ts`

1. `classifySitemap` on WooCommerce/Yoast/Rank Math, WordPress core and Shopify names.
2. A magazinfitness-shaped index (post 63, page 8, product 100 + 101, brand 5, product_cat 20 as the 6th child)
   yields 201 products and 20 categories.
3. `selectPages` on it: 15 categories, at least 30 products, at most 5 other, 60 URLs, homepage first.
4. `sampleEvenly` reaches the end of the list (last pick index above 170 of 201).
5. `classifyFetchedPage`: category grid with add-to-cart stays category; `og:type=product` page is product; blog
   post is other; unplanned grid of 8 prices is category.

Negative controls: (a) cap children at the first 5 → test 2 must fail; (b) make `selectPages` take URLs in input
order without quotas → test 3 must fail. Record both in the commit message.

Run: `npx vitest run lib/page-selection.test.ts`, then the six older site-audit test files, `npx tsc --noEmit`, lint.

### Task 4: local end-to-end, deploy, production proof

1. Local `runAudit("https://www.magazinfitness.ro")` via a scratchpad script: product UX field not "necunoscut",
   `productSignal.checked > 0`.
2. Update `docs/AUDIT-SPEC.md` §8, the skill `mistakes.md`, commit, merge into `main`, push (Coolify deploys main).
3. Production audits on magazinfitness.ro, one Shopify store, one store on another platform: product UX field
   known, `productSignal.checked > 0`, duration under about 90 s.
