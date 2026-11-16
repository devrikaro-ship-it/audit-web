
## A WooCommerce price read as missing from the HTML (2026-11-16)
- **Symptom:** the row "price written in the page" showed 17 of 49 products while every product page carried its price.
- **Cause:** `priceCount` strips tags but left `&nbsp;` between the amount and the currency
  (`664,05&nbsp;<span>lei</span>`), so the amount-plus-currency pattern never matched.
- **Recognise it:** a low price count on a WooCommerce shop whose product pages show a price in `<p class="price">`.
- **Fix:** non-breaking spaces count as spaces in `priceCount` (commit 0c5b027, with a test that fails without it).

## 2026-11-16 — "Below threshold" label on a maximum threshold

- **Symptom:** in a shop audit report, cart abandonment at 70.5% against "at most 70%" was labelled "Sub prag" (below threshold), which says the opposite of the problem.
- **Cause:** the failing verdict was named after minimum thresholds only; half of the shop thresholds are maximums (abandonment, bounce, cancelled, refunded).
- **Recognise it:** a verdict label that names a direction ("below", "above") on a table that mixes minimum and maximum thresholds.
- **Fix:** the failing verdict reads "Problema", with no direction; the threshold column already says "Minim" or "Maxim".
