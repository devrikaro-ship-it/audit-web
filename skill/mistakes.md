
## A WooCommerce price read as missing from the HTML (2026-11-16)
- **Symptom:** the row "price written in the page" showed 17 of 49 products while every product page carried its price.
- **Cause:** `priceCount` strips tags but left `&nbsp;` between the amount and the currency
  (`664,05&nbsp;<span>lei</span>`), so the amount-plus-currency pattern never matched.
- **Recognise it:** a low price count on a WooCommerce shop whose product pages show a price in `<p class="price">`.
- **Fix:** non-breaking spaces count as spaces in `priceCount` (commit 0c5b027, with a test that fails without it).
