
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

## 2026-11-16 — Shop orders called unreadable while the read key was in the client folder

- **Symptom:** a shop audit report showed returning customers, cancelled and refunded orders as "to read", and the operator was asked for access.
- **Cause:** only `profile/accounts.json` was searched; the WooCommerce read key lives beside it, in the client folder (`clients/<client>/.wc-api.env`), and had already been used earlier in the same session.
- **Recognise it:** a shop metric marked "to read" or an access request while the client folder holds a `.wc-api.env` (or any `*.env`).
- **Fix:** before declaring shop data unreadable, list the client folder's env files; read the orders through `/wp-json/wc/v3/orders` (read only).

## 2026-11-16 — Labels shown in capitals across the audit app

- **Symptom:** audit.devrika.ro showed "FREE AUDITS FOR ONLINE STORES", "AVAILABLE", "SCANEAZA MAGAZINUL" and table headers in capitals, against the house rule of sentence case.
- **Cause:** more than 30 rules and utilities (`text-transform:uppercase`, Tailwind `uppercase`) spread over the landing, Google Ads, report and deck styles; no rule above them cancelled it.
- **Recognise it:** a label that reads in capitals while its source text is in sentence case.
- **Fix:** one rule in `app/globals.css` cancels capitals and small caps on every element (`app/no-caps.test.tsx`, fails without it). The local dev server kept serving a stale stylesheet; check a change of global CSS on a production build (`next build` + `next start`).

## A summary row dropped the figure that softened it (2026-11-16)

- Symptom: the top conclusions row said the main content appears in 6.4 s against under 2.5 s, while its own UX row
  reads "6.4 s in test; 2.4 s for real visitors". The summary was harsher than its source; the final check caught it.
- Cause: the row was shortened from the source cell and kept only the worse of two figures.
- Recognise it: a summary or conclusion quoting one value from a source cell that holds two values.
- Fix: a summary keeps every qualifier of its source cell ("in test", "for real visitors"); the row now reads
  "in test ... 6.4 s ... (for real visitors, 2.4 s)".

## A conclusion marked good while its checklist row was wrong (2026-11-16)

- Symptom: "Categories are fine (20 of 21)" carried the verdict "Bine" while the checklist row "Text on the category
  page" was "Gresit"; the final check caught it.
- Cause: the conclusion's verdict was set from its wording ("in order") instead of from its checklist rows.
- Recognise it: a conclusion with a count short of the total ("20 of 21") marked good.
- Fix: a conclusion's verdict is read from its rows: any wrong row makes it a problem, and the text names what is
  missing ("one category of 21 has no text on the page").

## Client names written into a public skill (2026-11-16)

- Symptom: the conclusions standard and four lessons named the audited client and quoted its order figures, in a
  repository whose visibility is public.
- Cause: the text was written as in a private client folder, without checking where the skill's bytes are published.
- Recognise it: `gh repo view --json visibility` answers PUBLIC and a grep of `skill/` for the client's name or
  domain finds hits.
- Fix: the skill names no client; the client's data and figures stay in its own folder, and the report template
  reads them from a data file kept there. The history was rewritten with `git filter-repo --replace-text` and
  `--replace-message` and force pushed, with the operator's approval (2026-11-16); a bundle of the history before
  the rewrite is kept in the client's folder. A force push is a hard stop: it is asked first.

## 2026-11-19: the pre-flight passed on a stale deploy conf and the gate still refused the deploy

- Symptom: `deploy-checks.sh --pre` with `docs/deploy-checks.audit-web.conf` passed, then the Coolify deploy was
  refused with "the deploy checks have not run for this tree".
- Cause: two confs described the same app. The gate reads `~/.claude/hooks/deploy-checks.seo-audit.conf`; the repo
  copy from 2026-08-26 had drifted (suite floor 450 vs 470, another perimeter and build marker) and nothing read it.
- Recognise: a deploy conf in the repo whose path is not a `project` line of `~/.claude/hooks/deploy-checks.gate.conf`.
- Fix: the repo copy and its gate pointer were removed (b92c4db); the release runs
  `deploy-checks.sh --conf ~/.claude/hooks/deploy-checks.seo-audit.conf --pre`.
