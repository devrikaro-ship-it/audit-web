# Design for conversion — Part 2 rules measured on the rendered page

> **Status:** draft for the operator's approval, 2026-09-26. Operator's request (2026-09-26): Part 2 must check the
> design elements a site needs to convert, separately for shops and lead sites, based on research. Chosen order:
> first the "problem + impact" form of the UX checklist (delivered a6dba91), then these rules.

## 1. Why

Part 2 today reads page code only: it checks that elements exist (a menu, a price, a phone link). It says nothing
about design — whether the buy button stands out, whether it is on the first screen, whether a finger can hit it,
whether text is readable on a phone, whether a carousel or a popup hides the offer. Those need the page rendered.

Research behind each rule (links in §6): visual hierarchy and contrast (NN/g), CTA contrast (CXL), target size
(Material 48 dp, Apple 44 pt, WCAG 2.5.8 — legally required in the EU since the European Accessibility Act, June
2025), body text 16 px (typography research), auto-rotating carousels ignored as ads (NN/g), intrusive interstitials
(Google), sticky buy bar on mobile (+5–12% mobile conversion, Baymard), layout shift (Core Web Vitals).

## 2. How it is measured

1. The engine opens real Chrome (the one the PDF route already uses) on a phone screen: 390 × 844 CSS px, device
   scale 3, a mobile user agent, touch on. A site the engine read through the BrightData browser is rendered there.
2. Pages rendered, per kind:
   - Shop: the home page and one product page (the first product read with a price and an add-to-cart control).
   - Lead site: the home page and one service page (the first service page read).
3. On each page: wait for load, then 3 s; read positions, sizes and computed styles; wait 6 s more without touching
   the page for the carousel check; scroll to twice the screen height for the sticky check.
4. The Google PageSpeed call the engine already makes also asks for the accessibility category (same request, no
   new service): its colour-contrast and target-size audits back rules D3 and D9, and CLS comes from the performance
   audits it already returns.
5. It runs alongside the PageSpeed step, so the audit takes about 5–10 s longer, not 25 s. A page that cannot be
   rendered makes its rules "de verificat" (they count in no score, AUDIT-SPEC §5.1).

## 3. The rules

The "primary action" is, for a shop, the add-to-cart button on the product page; for a lead site, the booking or
contact button or the phone link (the controls the engine already recognises: `hasAddToCart`, `ASK_CONTROL`, `tel:`).

| # | Rule | Shop | Lead site | Pass when |
|---|---|---|---|---|
| D1 | The first screen tells the offer and holds the action | product page: the product photo, the price and the add-to-cart button start within the first 844 px | home page: the main heading and the phone link or the booking button start within the first 844 px | all named elements visible in the first screen |
| D2 | The primary action stands out | add-to-cart button | booking / contact button or phone link | its text against its own background ≥ 4.5 : 1 and its background against the page around it ≥ 3 : 1 |
| D3 | A finger can hit the controls | product page | home and service page | the primary action is at least 44 × 44 px, and at least 90% of the links and buttons in the first screen are at least 24 × 24 px |
| D4 | Text is readable on a phone | both pages | both pages | body text is at least 16 px with line spacing at least 1.4 × the letter size |
| D5 | No carousel turns by itself in the first screen | home page | home page | no element taking a third of the first screen or more changes its picture or slides within 6 s without a touch |
| D6 | No window covers the page on arrival | both pages | both pages | 3 s after load, no fixed layer covers a third of the screen or more; a cookie-consent banner is allowed (Google exempts legal notices) |
| D7 | The action stays at hand while scrolling | product page: a fixed bar with the add-to-cart button | service page: a fixed call or booking button | after scrolling two screens, the primary action is still visible |
| D8 | The page does not jump while loading | home page | home page | layout shift (CLS) on mobile below 0.1 |
| D9 | All text reads against its background | both pages | both pages | PageSpeed's colour-contrast audit passes |
| D10 | Choices are visible, not hidden in a list | product page with variants: sizes or colours as buttons, not a drop-down | not applicable | no `<select>` for a variant in the buy form; a product without variants skips the rule |
| D11 | The contact form is quick to fill on a phone | not applicable (checkout is not read) | contact form | its fields are 16 px or larger (no automatic zoom on iPhone) and it has no multi-line field or drop-down besides an optional message |

Each rule, like every row since a6dba91, has in the register: the rule as a title, the problem with its count, the
negative impact, the positive impact and the fix — for both kinds where the wording differs.

## 4. In the report

1. Part 2 gets a group "Design pentru conversie", shown after the page types, with its score (share of ✓) in the
   Part 2 table and in the Part 2 score. Reports saved before are unchanged.
2. Every ✗ row names the problem with the measured value, e.g. "Butonul 'Adauga in cos' are contrast 2,1 : 1 fata de
   fundal (minim 3 : 1)" or "Butonul de programare nu apare in primul ecran pe telefon; e la 1.420 px de sus".
3. The progress screen gains no step; the measurement belongs to the speed step ("Masuram viteza si designul pe
   mobil").

## 5. Testing

1. Local fixture pages served to real Chrome, one passing and one failing page per rule (a low-contrast button, a
   button below the fold, a 32 px button, 13 px text, an auto-rotating slider, a newsletter popup and a cookie bar, a
   sticky bar, a size drop-down, a form with a drop-down); each rule seen failing with its fault put back.
2. Production audits of dentalview.ro, magazinfitness.ro and diente.ro: every ✗ checked by hand on a phone-sized
   screenshot saved with the audit.
3. The audit's duration measured before and after on the same three sites.

## 6. Sources

NN/g visual design principles https://www.nngroup.com/articles/principles-visual-design/ · NN/g auto-forwarding
carousels https://www.nngroup.com/articles/auto-forwarding/ · NN/g homepage principles
https://www.nngroup.com/articles/homepage-design-principles/ · CXL CTA colour and contrast
https://cxl.com/blog/which-color-converts-the-best/ · Material touch targets
https://m3.material.io/foundations/designing/structure · WCAG target size (TetraLogical)
https://tetralogical.com/blog/2022/12/20/foundations-target-size/ · font sizes
https://www.learnui.design/blog/mobile-desktop-website-font-size-guidelines.html · Google intrusive interstitials
https://www.smashingmagazine.com/2017/05/intrusive-interstitials-guidelines-avoid-google-penalty/ · Baymard product
page research https://baymard.com/research/product-page · Google mobile speed
https://business.google.com/uk/think/marketing-strategies/mobile-page-speed-load-time/
