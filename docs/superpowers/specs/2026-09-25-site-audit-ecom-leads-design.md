# Site audit for two kinds of site: online shops (ecom) and lead generators (leads)

Operator decisions, 2026-09-24/25. Supersedes AUDIT-SPEC §1 "ECOM-ONLY": the site audit now reports on a shop and on
a site that collects contacts (clinics, services, B2B), each judged on what brings it money. Scope stays the site
itself (operator, 2026-09-25: "doar la site, performanta si SEO"): no revenue estimates, no company registry data, no
competitors, no search-position lookups. Reference lead site: dentalview.ro (YTS Dental View, imaging clinics).

## 1. Deciding the kind of site

The rule is Darwin's (`~/Projects/darwin/backend/services/typeScan.js`, `classifyFromScan`), taken over unchanged so
both products decide the same way. It was corrected on dentalview.ro itself, first misread as a shop from an
installed WooCommerce and the text "40 lei".

1. Structural signals decide ecom on their own: Product/Offer markup, `og:type=product`, `product:price:amount`,
   microdata price, a cart or checkout route, "add to cart" / "adauga in cos".
2. A shop platform in the page source only corroborates: platform + two weak signals (a price, stock words, a shop
   route) = ecom, low confidence.
3. Two weak signals with no contact request on the page = ecom, low confidence.
4. Otherwise the site is leads: high confidence with a lead signal (appointment, quote request, free consultation,
   contact form, contact route, `tel:` link), medium without.
5. A page with under 200 readable characters is a defect of the reading, never a kind.
6. The verdict is stored with its evidence (the signals found, with a sample of each) and its confidence.

The scan card of the funnel shows the kind ("Magazin online" / "Site de servicii") with "Schimba". A visitor's
correction wins, is sent with the audit and stored as `siteKind: { type, by: "scan" | "visitor", confidence,
evidence }`. The dashboard shows the kind and who decided it.

## 2. Reading the site

1. One real-browser user agent for every request the audit makes (pages, robots, sitemaps, probes). Darwin measured
   a shop answering 429 to a request without one and 200 with one; the audit today sends two different robot names.
2. Retries: 429, 5xx and timeouts are retried after 1 s and 2.5 s, honouring `Retry-After`; 403 and 404 are not.
3. Ecom: unchanged (15 categories, 35 products, up to 5 other pages).
4. Leads: the home page, then service pages, location pages, a prices page and the contact page, up to 60; blog and
   article pages are left out. A page's type comes, in order, from the sitemap file it is listed in (a file named for services or
   locations: `service`, `servicii`, `location`, `locatii`, e.g. `service-sitemap.xml`), from its path family (the
   first path segment shared by the pages already typed), and from the page itself: an address with a map or opening
   hours marks a location, a `tel:` link or a contact form under a service heading marks a service. Pages whose type cannot be told stay "other" and
   fill the budget last.

## 3. Part 1, SEO: the same ten components

Same chain, same ✓/✗ checklist, same score (share of ✓). Only the rows tied to selling online change for leads:

| # | Component | Ecom | Leads |
|---|---|---|---|
| 3 | Sitemap | lists categories and products | lists service and location pages |
| 4 | Can appear in Google | includes the sort-parameter row | no sort-parameter row (no product lists) |
| 5 | Content without later loading | product name, price, description in the HTML | service name, phone and address, service description in the HTML |
| 8 | Page content | category text, product photo described | own text on every service page; location pages that differ from each other (not one page with another district's name) |
| 9 | Structured data | organisation, product with price and stock, rating, trail, shipping/returns, declared price shown | a local business (address, phone, opening hours, a specific type: clinic, dentist, office), the same contact details on every page, reviews, trail |

Components 1, 2, 6, 7 and 10 are identical.

## 4. Part 2, UX/UI

Both kinds move to ✓/✗ rows with the score as the share of ✓. Ecom keeps its fields (speed, home, category, product,
filters). Leads has five:

1. Speed on mobile: as for shops.
2. Home page: says what is offered and where; the phone is visible without scrolling; a button to book or contact;
   fits a phone screen.
3. Service page: explains the service; a price or "de la"; a book/contact button on the page; links to related
   services.
4. Contact and booking: a short form (at most five fields); a click-to-call phone; WhatsApp or chat; a map and
   address; opening hours.
5. Trust: reviews or testimonials; the team (doctors, specialists); certifications or partners; real photos.

What cannot be read from outside is "de verificat" and counts in no score (AUDIT-SPEC §5.1).

## 5. The report

Same structure (cover, summary, Part 1, Part 2, contact). Wording follows the kind: "servicii" for "produse",
"programare/contact" for "cos". Reports saved before keep their rendering.

## 6. The progress screen (operator, 2026-09-25)

The waiting page shows the audit's REAL steps, as the engine runs them, and each finished step shows what it measured
(the idea seen in a competitor's audit, kept to the site). Today's page rotates fixed sentences every 3.5 s,
unrelated to what the engine is doing; that goes.

1. The engine reports each step as it starts and ends into the job (`steps: { id, state: "running" | "done" |
   "unmeasured", result? }[]`), and `GET /api/audit?id=` returns them; the page polls every 1.5 s as today.
2. Steps, in the order the engine runs them, each with the measured result it shows when done, e.g.:
   1. "Citim site-ul" -> "WooCommerce · magazin online" / "WordPress · site de servicii"
   2. "Verificam robots.txt si sitemap-ul" -> "robots.txt gasit · sitemap cu 824 de pagini"
   3. "Alegem paginile care vand" -> "15 categorii si 35 de produse" / "12 servicii si 9 locatii"
   4. "Citim paginile" -> "60 de pagini citite" (a live count while it runs)
   5. "Masuram viteza pe mobil" -> "3,6 s pana apare continutul" or "de verificat"
   6. "Verificam titlurile, descrierile si datele pentru Google" -> "5 pagini fara descriere"
   7. "Verificam accesul asistentilor AI" -> "3 din 3 roboti AI au acces"
   8. "Calculam scorul" -> "Scor 76/100"
3. A progress bar ("Pasul 4 din 8") and the elapsed time. Every result line is a measured fact from this audit; a
   step that could not measure says "de verificat". No estimates, no money, nothing outside the site.

## 7. Testing

1. The classifier on real page bodies: dentalview.ro = leads, high confidence; magazinfitness.ro and diente.ro =
   ecom; a WooCommerce plugin plus one price stays leads (the case that produced the rule).
2. Lead page selection on dentalview.ro: services and locations chosen, articles left out.
3. Every new row with a case that must fail and one that must pass, each seen failing with the fault put back.
4. A full production audit of dentalview.ro read slide by slide, desktop and phone PDF.
5. The progress screen watched through a real audit: steps advance in engine order, each result matches the report.
