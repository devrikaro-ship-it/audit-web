# Site audit — page selection by page type

Status: approved by the operator on 2026-09-23. Scope: the cold website audit (lead magnet), `lib/audit-engine.ts`.

## Problem

The audit picks pages in sitemap order and stops at 60. It classifies a URL as a category when its path has one
segment and as a product otherwise. It reads only the first 5 child sitemaps of a sitemap index.

Measured on magazinfitness.ro (2026-09-23, production audit `3e26fcc8`): the index lists `post-sitemap.xml` first
(63 blog posts), then `page-sitemap.xml` (8), then two product sitemaps (201 products), then `product_cat` as the
6th child. The 60-page budget was spent on blog posts: 0 products and 0 real categories analysed. The report then
said "product page: not caught in crawl", scored "category page: good" on blog posts, counted 0 product titles for
the Catamo signal, and built the Shopping/CSS queries from blog titles, so every Google Ads field came back
"could not verify".

## Rule

The audit analyses the pages that sell (products and categories). Other pages only take the space left.

## Design

1. Child sitemaps are classified by name: product (`product-sitemap`, `sitemap_products`, `posts-product`),
   category (`product_cat`, `collections`, `categor`), other (everything else). All product and category children
   are read, not only the first 5; other children are read only while the budget is not filled.
2. Quotas, 60 pages in total: homepage + 15 categories + 35 products + at most 5 other pages. Space a type cannot
   fill goes to products, then categories, then other pages.
3. Products are sampled evenly across the whole product list, not the first N.
4. After fetching, a page counts as a product only when its content says so (`isProductPage`: Product schema,
   `og:type=product`, or price plus add-to-cart). A page from the product sitemap that is not a product is not
   counted; a product found elsewhere is.
5. No typed sitemap, or no sitemap: start from the homepage links, classify fetched pages by content, and take
   product links from category pages.

The report structure does not change: no rubric or field is added or removed. `docs/AUDIT-SPEC.md` §8 is updated.

## Done when

1. Unit tests on a fixture shaped like magazinfitness.ro (blog first, single-segment product URLs, category sitemap
   6th) select at least 30 products and 10 categories; each new test is seen failing on the old selection.
2. After deploy, production audits of magazinfitness.ro (WooCommerce), one Shopify store and one store on another
   platform show: the product-page UX field is not "not caught in crawl", `productSignal.checked > 0`, and the
   audit finishes in under about 90 seconds.

## Not in this change

False "schema missing" findings and the revenue simulation assuming a CPC cut when CSS is unknown are separate
defects, handled one at a time after this one is live.
