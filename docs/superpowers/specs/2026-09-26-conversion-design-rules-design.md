# Part 2 as a checklist per page type — design, text, experience, selling

> **Status:** draft for the operator's approval, 2026-09-26 (second version). Operator's direction (2026-09-26):
> fewer overlapping rules; judge first how the site looks (modern or not), whether texts are short and easy to read,
> the overall experience, and whether the structure and texts are made to sell or only present information; and
> judge it per page type, each with its own checklist. It replaces the first draft of eleven technical rules.

## 1. The shape

Part 2 becomes one checklist per page type, each grouped under the same four questions:

1. **Aspect** — does the page look modern and cared for?
2. **Text** — are the texts short and easy to read on a phone?
3. **Experienta** — can a visitor do what he came for without effort?
4. **Vanzare** — are structure and texts made to sell (or to bring a contact), or do they only present information?

| Kind | Page types |
|---|---|
| Shop | Home page · Category · Product |
| Lead site | Home page · Service · Contact |

Speed on mobile stays its own group (measured by PageSpeed). Today's rows (menu, filters, reviews, phone link, map,
hours, ...) move into the page type and question they belong to; nothing measured today is lost.

## 2. Who judges what

Each row says how it is judged, and the report labels it:

1. **Masurat** — computed from the page code or the rendered page: positions, sizes, counts, lengths. Same result
   every run.
2. **Evaluat pe capturi** — judged by an AI vision model on phone and desktop screenshots and on the page text,
   against a fixed list of observable signs per row. It must quote the text or name the element its verdict rests
   on; without that evidence the row is "de verificat". Temperature 0, same prompt, same screenshots → same answer.

Screenshots: real Chrome (already on the server for the PDFs) at 390 × 844 (phone) and 1440 × 900 (desktop), one
page per type (the first page read of that type), full first screen plus the whole page scaled.

## 3. The checklists

### Shop

**Home page**

| Question | Row | Judged |
|---|---|---|
| Aspect | The design looks current: airy spacing, at most two or three fonts, consistent colours, sharp photos, no dated patterns (auto-rotating slider, tiny text, crowded side columns) | Evaluat |
| Text | The main heading has at most 10 words; no paragraph is longer than 4 lines on a phone | Masurat |
| Experienta | The first screen says what is sold and to whom; the category menu is visible; nothing covers the page on arrival | Evaluat + Masurat |
| Vanzare | The heading speaks of the customer's benefit, not of the company; proof near the top (reviews, delivery, returns, number of customers); paths to the best-selling categories and products | Evaluat + Masurat |

**Category**

| Question | Row | Judged |
|---|---|---|
| Aspect | A clean product grid with photos of the same size and style | Evaluat |
| Text | A short intro (2–3 sentences) that helps choosing | Masurat + Evaluat |
| Experienta | Filters and sorting visible on a phone; each product shows photo, price and rating | Masurat |
| Vanzare | The list highlights what helps deciding: discount, stock, fast delivery, reviews | Evaluat |

**Product**

| Question | Row | Judged |
|---|---|---|
| Aspect | Large, sharp photos with a consistent background; the buy button stands out | Evaluat + Masurat (contrast) |
| Text | The description is short and scannable: bullets, short paragraphs | Masurat |
| Experienta | Photo, price and buy button in the first phone screen; sizes/colours as buttons; the buy button stays at hand while scrolling | Masurat |
| Vanzare | The text sells benefits, not only specifications; next to the button: delivery, returns, stock, reviews | Evaluat + Masurat |

### Lead site

**Home page**

| Question | Row | Judged |
|---|---|---|
| Aspect | The design looks current, with real photos of the place and the team, not stock pictures | Evaluat |
| Text | The main heading has at most 10 words; no paragraph is longer than 4 lines on a phone | Masurat |
| Experienta | The first screen says what is offered and where, with the phone or the booking button | Masurat + Evaluat |
| Vanzare | The heading states the result for the client; proof (reviews, years, team, results); a call to act after each section | Evaluat + Masurat |

**Service**

| Question | Row | Judged |
|---|---|---|
| Aspect | Real pictures of the service or its results | Evaluat |
| Text | Structured by subheadings and bullets; short paragraphs | Masurat |
| Experienta | A booking/contact button in the first screen and at the end; links to related services | Masurat |
| Vanzare | The text answers what it is, for whom, how it goes, how much it costs, what result; it answers objections (price, pain, duration); proof (reviews, before/after) | Evaluat |

**Contact**

| Question | Row | Judged |
|---|---|---|
| Aspect | The page is tidy, the ways to reach you are grouped, not scattered | Evaluat |
| Text | Short, plain instructions | Masurat |
| Experienta | A short form (fields of 16 px or more, no drop-downs), a click-to-call phone, map and address, opening hours, WhatsApp or chat | Masurat |
| Vanzare | A promise of what happens next ("te sunam in 24 de ore"); proof next to the form | Evaluat |

Every row, like every row since a6dba91, has: the rule as a title, the problem stated directly, the negative
impact, the positive impact and the fix.

## 4. In the report

1. Part 2: one slide per page type with its four questions and a Bun / De reglat / Rau per question, then its
   checklist; speed stays first. The Part 2 score is the share of ✓ over all measured and evaluated rows.
2. An evaluated row carries "Evaluat pe capturi" next to its result and the evidence in its explanation; a measured
   row carries "Masurat".
3. Reports saved before are unchanged.

## 5. What it needs

1. An API key for a vision model (Anthropic or OpenAI) in the audit app's environment on Coolify. Cost: a few cents
   per audit (six screenshots and the texts of three pages). Time: about 20–30 s more per audit, run alongside the
   PageSpeed step.
2. Without the key, the evaluated rows are "de verificat" and the measured rows still run.

## 6. Testing

1. Measured rows: local fixture pages, one passing and one failing per row, each seen failing with its fault put back.
2. Evaluated rows: the same screenshots evaluated three times must give the same verdicts; a page built to fail each
   row (a dated design, a wall of text, a heading about the company) must fail it with the right evidence.
3. Production audits of dentalview.ro, magazinfitness.ro and diente.ro, every ✗ checked by hand against the
   screenshots saved with the audit.

## 7. Sources

NN/g visual design principles https://www.nngroup.com/articles/principles-visual-design/ · NN/g homepage principles
https://www.nngroup.com/articles/homepage-design-principles/ · NN/g auto-forwarding carousels
https://www.nngroup.com/articles/auto-forwarding/ · Baymard product page https://baymard.com/research/product-page ·
Baymard product lists https://baymard.com/research/ecommerce-product-lists · Baymard cart abandonment
https://baymard.com/lists/cart-abandonment-rate · CXL CTA contrast https://cxl.com/blog/which-color-converts-the-best/
· font sizes https://www.learnui.design/blog/mobile-desktop-website-font-size-guidelines.html · Spiegel Research
Center reviews https://spiegel.medill.northwestern.edu/how-online-reviews-influence-sales/
