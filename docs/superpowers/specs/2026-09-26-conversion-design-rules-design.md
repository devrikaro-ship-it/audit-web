# Part 2 as a checklist per page type — structure, design, content: do they sell or fill?

> **Status:** approved by the operator 2026-09-26 (third version). His direction: fewer overlapping technical rules
> (the small measured rules — button in the first screen, contrast, sticky button, variant buttons, form fields — were
> rejected as low impact); judge each page type on its structure (the sections that lead to a sale), how modern it
> looks, how short and readable its texts are, the overall experience, and whether texts are made to sell. AI
> evaluation on screenshots (key copied from darwin-backend with his approval).

## 1. The shape

> Operator, 2026-09-26 (latest): pages are judged on three criteria — structure, design, content — and for each the
> question is whether it leads toward a sale or is only filler. It replaces the five questions of the second version
> (aspect and experience are design; text and selling are content).

1. **Structura** — does the page have the sections that lead to a sale, in a sensible order, or sections that fill
   space?
2. **Design** — does the look (modern, cared for) and the ease of use push the visitor to the next step, or is it
   decoration?
3. **Content** — do the texts and the proof sell (benefits, reasons, answers to objections), or do they only present
   information?

| Kind | Page types |
|---|---|
| Shop | Home page · Category · Product |
| Lead site | Home page · Service · Contact |

Speed on mobile stays its own group. Today's rows sit under the criterion they belong to.

## 2. Structure: the sections each page type needs

A section missing is a ✗ row with its problem, negative impact and fix; the hero is also checked to come first.

**Shop**

| Home page | Category | Product |
|---|---|---|
| 1. Hero: a heading with the benefit and a button to the products | 1. Heading and a short intro | 1. Photo gallery |
| 2. Trust bar: delivery, returns, payment, guarantee | 2. Filters and sorting | 2. Name, price, rating |
| 3. Main categories with pictures | 3. Product grid with price, discount, rating, stock | 3. Variants and the buy button |
| 4. Popular products | 4. A buying guide or FAQ at the end | 4. Delivery (cost, time), returns, guarantee next to the button |
| 5. Why buy from us | 5. Related categories or products | 5. Benefits as bullets |
| 6. Reviews and proof | | 6. Description and specifications |
| 7. Footer with contact, delivery, returns, payments | | 7. Reviews |
| | | 8. Similar products or bought together |

**Lead site**

| Home page | Service | Contact |
|---|---|---|
| 1. Hero: the result for the client, where, a booking button or phone | 1. Hero: the service, the result, the button | 1. Heading and what happens next ("te sunam in 24 de ore") |
| 2. Trust bar: years, clients, Google rating | 2. Who it is for, what problem it solves | 2. A short form |
| 3. The main services | 3. Benefits | 3. Phone, WhatsApp, e-mail |
| 4. Why us | 4. How it goes, step by step | 4. Map, address, opening hours |
| 5. Results (before/after, cases) | 5. Price or "de la" | 5. Reviews next to the form |
| 6. The team | 6. Results (before/after) | |
| 7. Reviews | 7. Reviews | |
| 8. How working together goes | 8. FAQ and objections | |
| 9. FAQ | 9. A final call to act | |
| 10. A final call to act and contact | 10. Related services | |

## 3. Design and content: the signs judged

Judged per page type by the AI on the screenshots and the page text; each verdict says whether the criterion leads
to a sale or is filler, with the evidence.

| Criterion | Shop | Lead site |
|---|---|---|
| Design | modern and cared for (airy spacing, two or three fonts, consistent colours, sharp product photos, no dated patterns); the first screen says what is sold and to whom; the way to the products and the cart is obvious | the same, with real photos of the place and team; the first screen says what is offered, where, and how to book; booking one tap away |
| Content | short, readable texts; why buy here (price, delivery, guarantee, choice); descriptions sell benefits; proof near the button | short, readable texts; the heading states the client's result; proof (reviews, years, team, results); objections answered; a promise of what happens next |

## 4. How it is judged

1. Real Chrome (already on the server for the PDFs) renders the first page read of each type at 390 × 844 (phone)
   and 1440 × 900 (desktop); the screenshots are the phone first screen, the phone full page (scaled to a readable
   height) and the desktop first screen.
2. One call per page type to Claude (`claude-opus-5`, fallback `"default"`), with the three screenshots, the page's
   readable text and a fixed prompt listing the page type's sections and each criterion's signs. Structured output:
   for each section present or missing (and whether the hero comes first), for design and content a verdict (bun /
   de-reglat / rau: leads to a sale, partly, or filler), the evidence (quoted text or the element named) and one problem sentence. Plain Romanian, no
   diacritics, no technical terms (the report's jargon list is in the prompt).
3. A verdict without evidence, a failed call, or no API key: the row is "de verificat" and counts in no score.
4. The calls run alongside the PageSpeed step; the audit takes about 20–30 s more.

## 5. In the report

1. Each page type opens with its three criteria and their verdicts, then its checklist grouped by criterion; the
   structure rows list the sections.
2. An evaluated row is labelled "Evaluat pe capturi" and shows what was seen; a measured row "Masurat".
3. The Part 2 score counts every measured and evaluated row. Reports saved before are unchanged.

## 6. Testing

1. The client stubbed: the prompt carries the page type's sections and signs; a missing evidence becomes "de
   verificat"; an API error or a missing key leaves rows "de verificat"; the output lands in the right rows.
2. A real call on built pages (one complete, one missing sections, one dated with walls of text), three runs each,
   the same verdicts every run.
3. Production audits of dentalview.ro, magazinfitness.ro, diente.ro, every ✗ checked by hand against the saved
   screenshots; the audit duration before and after.

## 7. Sources

NN/g visual design https://www.nngroup.com/articles/principles-visual-design/ · NN/g homepage
https://www.nngroup.com/articles/homepage-design-principles/ · Baymard product page
https://baymard.com/research/product-page · Baymard product lists https://baymard.com/research/ecommerce-product-lists
· Baymard cart abandonment https://baymard.com/lists/cart-abandonment-rate · Spiegel reviews
https://spiegel.medill.northwestern.edu/how-online-reviews-influence-sales/
