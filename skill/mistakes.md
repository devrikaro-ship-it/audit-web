# audit-devrika — mistakes

Newest first.

## 2026-09-14 — A payment method that disappeared was called the main cause of a revenue drop, before counting kept orders

**Symptom.** In the Depo Tools performance diagnosis, WooCommerce orders per payment method showed the TBI Bank
installment method going from 21-33 orders a week to 0 between 27.07 and 10.08. It was reported to the operator as
"the strongest lead" for the late-July revenue drop, because installments serve high-ticket products.

**Cause.** Measured afterwards: of the TBI Bank orders created since 25.05, only 6 ever reached completed or
processing (15,478 RON in total); almost all were cancelled. The first reading counted orders CREATED, not orders
KEPT, so a method that brings almost no revenue looked like a large loss.

**How to recognise it.** A revenue explanation built on order counts per payment method, channel or status, with no
split between created and kept (completed/processing) orders.

**Fix.** Before attributing revenue to any segment of WooCommerce orders, compute kept orders and kept value per
segment next to created orders, and rank causes by kept value. Report a correction to the operator as soon as the
kept figures contradict an earlier lead.
