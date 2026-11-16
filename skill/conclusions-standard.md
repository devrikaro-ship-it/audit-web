# Conclusions standard for a shop audit

Approved by the operator on 2026-11-16 ("Da, este corect"), on a shop audit report. It applies to every shop audit,
whatever the branch or the client.

## How a conclusion is written

1. Every conclusion comes from one metric of the table below, or from one checklist row: its value, the threshold
   and what the shop loses because of it. A conclusion from an impression, or from a metric outside the table, is
   not written.
2. A metric below its threshold is a problem. The metrics at or above their thresholds are gathered in one
   "in order" conclusion.
3. Problems come first, in the order in which they cost sales.
4. Shape: what happens, the value against the threshold, the consequence. For example: "Conversion is 0.98%, under
   the 1.5% threshold: 1,000 visits bring 10 orders instead of 15."
5. These are results, not settings: they are shown in their own unscored section ("Context Analytics") and never
   enter the settings score.

## The shop thresholds

One threshold per metric, the same for every shop. The values were chosen from the ranges of published ecommerce
studies (conversion 1.4-2.7%, add to cart 4.6-6%, cart abandonment 70.22% average of 50 studies, ecommerce
engagement 54.4%, 3.3-4.1 pages per session, repeat customers 16.5-30%, retail cancellations 2-8%), rounded to one
house value.

| # | Metric | Source of the value | Good from |
|---|---|---|---|
| 1 | Conversion rate (sessions with a purchase) | GA4 | at least 1.5% |
| 2 | Add to cart, of the users who viewed a product | GA4 | at least 5% |
| 3 | Cart abandonment (added to cart, did not buy) | GA4 | at most 70% |
| 4 | Engagement rate | GA4 | at least 55% |
| 5 | Bounce rate | GA4 | at most 45% |
| 6 | Pages per session | GA4 | at least 3 |
| 7 | Returning customers who buy again | shop orders | at least 20% |
| 8 | Cancelled orders | shop orders | at most 5% |
| 9 | Refunded orders | shop orders | at most 5% |
| 10 | AOV (average order value) | GA4 and shop orders | no threshold; reported as a value |

Window: the last 30 days up to yesterday. A metric whose data cannot be read is shown as "to read", never guessed.
