# Site audit, Part 1 SEO: ten components in dependency order

Operator decision, 2026-09-24. Replaces the six generic SEO zones ("SEO tehnic", "Continut", "Cuvinte cheie", ...)
with ten components ordered as a chain: a later component matters only once the earlier ones hold (a page Google
cannot read needs no good title). Every row is measured from the store URL alone; what cannot be measured is
"de verificat", never a finding (AUDIT-SPEC §5.1).

## Sources

- Google, technical requirements: a page is eligible when Googlebot is not blocked, it answers 200, and it has
  indexable content. https://developers.google.com/search/docs/essentials/technical
- Google, AI Overviews / AI Mode: no extra requirements beyond normal SEO; content in text, structured data that
  matches the visible text. https://developers.google.com/search/docs/appearance/ai-features
- Google, SEO starter guide: keywords in the URL have "hardly any effect", no word-count target, heading order is not
  an SEO factor, meta keywords unused. https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google, Product structured data (merchant listings: price, availability, shipping, returns).
  https://developers.google.com/search/docs/appearance/structured-data/product
- OpenAI: OAI-SearchBot must be allowed to appear in ChatGPT search; GPTBot is training only.
  https://developers.openai.com/api/docs/bots
- Perplexity: PerplexityBot must be allowed to appear in Perplexity. https://docs.perplexity.ai/guides/bots
- Anthropic: Claude-SearchBot serves search; ClaudeBot is training.
  https://support.claude.com/en/articles/8896518
- AI crawlers (GPTBot, ClaudeBot) do not execute JavaScript: https://vercel.com/blog/the-rise-of-the-ai-crawler
- Google does not use llms.txt (Search Central Live, July 2025).

## Rows

"Money pages" = the category and product pages read. A row is `{ ok, total }`; `total = 0` means not measured.

### A. Can the site be read?

1. Pages answer correctly
   - 1.1 pages that answer 200: of the pages requested, excluding 403/429 answers to our server.
   - 1.2 https everywhere: the site answers on https and http:// sends to https (1 of 1).
   - 1.3 short redirects: http://, http://www. (or without www) reach the final address in at most two redirects
     (Google follows up to ten; http://www -> https://www -> https:// is the common setup).
   - 1.4 the site does not refuse server requests: refused (403/challenge) = "de verificat", since some protections
     also refuse search robots.
2. robots.txt
   - 2.1 exists (answers with robots rules).
   - 2.2 Googlebot and Bingbot may read the site (2 of 2, "/" allowed).
   - 2.3 money pages and the stylesheets of the home page are allowed to Googlebot (scripts are not judged: Shopify
     blocks its cart and checkout scripts by default, which do not render the page).
   - 2.4 declares the sitemap.
3. Sitemap
   - 3.1 exists (urlset or sitemapindex at the declared or default address).
   - 3.2 lists categories and products (2 of 2).
   - 3.3 lists only pages that answer 200 directly: a sample of up to 20 listed money pages, no redirect followed.
   - 3.4 has last-modified dates.
4. Pages can appear in Google
   - 4.1 money pages without noindex (meta robots or X-Robots-Tag).
   - 4.2 money pages whose canonical is the page itself.
   - 4.3 www and non-www lead to the same address.
   - 4.4 a category with an extra sort parameter points Google back to the category (canonical to the clean
     address, or noindex): 1 of 1.
5. Content is in the page, not loaded later (only when pages were read without the browser)
   - 5.1 product pages whose HTML has the product name as a heading.
   - 5.2 product pages whose HTML shows a price.
   - 5.3 product pages whose HTML has written description text.

### B. Does Google understand the page?

6. Title in Google
   - 6.1 pages with a title. 6.2 titles 15-65 characters. 6.3 titles not repeated on another page.
   - 6.4 money pages whose title contains the first words of their main heading (the product or category name).
7. Description in Google
   - 7.1 pages with a meta description. 7.2 not repeated on another page. 7.3 70-160 characters.
8. Page content
   - 8.1 pages with exactly one main heading. 8.2 pages whose own text is not copied from another page.
   - 8.3 categories with their own written text. 8.4 product pages whose product images all have alt text.
9. Structured data
   - 9.1 the organisation is declared. 9.2 product pages with Product + price + availability.
   - 9.3 product pages with a rating. 9.4 money pages with BreadcrumbList.
   - 9.5 product pages declaring shipping or returns. 9.6 product pages whose declared price is shown on the page.

### C. Can AI assistants use the information?

10. AI search access
   - 10.1 AI search robots allowed: OAI-SearchBot, PerplexityBot, Claude-SearchBot (of 3).
   - 10.2 links to the company's official profiles (sameAs, of 2).

## Scores

Component score = mean of its measured rows (ok / total). SEO score = mean of the components with a measured row.
Overall score = mean of the SEO and UX/UI scores, the two numbers the cover shows.

## Removed (sources above)

Keyword in the URL, word count, H2/H3 structure, FAQ presence, llms.txt, security headers, category coverage
(already removed), "pages competing" (now 6.3, repeated titles).

## Rendering

Reports carrying `seo` render Part 1 from the ten components: an overview of the ten with their scores, the worst
rows with their fix, and a checklist grouped by component. Reports saved before keep the previous Part 1.
Wording lives in the deck (AUDIT-SPEC §5.3); the engine only measures.
