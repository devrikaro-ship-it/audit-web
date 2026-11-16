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

## The most important conclusions open the report

The report opens, right under the score, with "Cele mai importante concluzii": at most five conclusions, taken from
the platform and Context Analytics conclusions, ordered by how much they cost in sales, each with its value against
the threshold, the consequence and a link to the section it comes from. No conclusion appears there that is not also
in its own section (operator, 2026-11-16, on a shop audit report: "astea cu concluziile cele mai importante trebuie
la inceput").

## Every conclusion carries a verdict and an impact

Each conclusion, in every table, shows two labels (operator, 2026-11-16, on a shop audit report: "fiecare sa scrie
dupa daca e bine sau nu si impact daca e mic mediu sau mare"):

1. Verdict: "Bine", "Problema", or "Nu se aplica" when its checklist rows are not applicable.
2. Impact on sales: "Mare" when it changes how many orders come or how much a visit or a click sells (cancellations,
   conversion, add to cart, phone speed, which campaign spends on a product); "Mediu" when it touches a part of the
   traffic or the spend; "Mic" when it is hygiene with little effect on sales.

In each table the problems come first, from large impact to small, then what is good, then what does not apply.
Impact is coloured only on a problem ("Mare" red, "Mediu" amber, "Mic" grey); on a good conclusion it is grey, so colour
always means something to fix. A conclusion that does not apply shows no impact ("-").

## Every checklist row and metric carries an impact

Each setting of the checklist and each metric of the Context Analytics table shows its impact on sales if it is
wrong: "Mare", "Mediu" or "Mic", with the same meaning and colours as on the conclusions; a row that does not apply,
or a metric with no threshold, shows "-" (operator, 2026-11-16, on a shop audit report: "la fiecare linie vreau
sa spui daca impactul e mic mediu sau mare"). For example: "Value and currency are real" is "Mare" whether it is
correct or not; the colour only appears when it is wrong.

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

## What the section does not show

Raw totals (sessions, orders, revenue) and sessions by channel are not shown in the Context Analytics section: they
carry no threshold and no conclusion reads them (operator, 2026-11-16, on a shop audit report: "astea nu au sens
aici").
