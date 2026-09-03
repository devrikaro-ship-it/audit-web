# Google Ads Reporting V2 Design

**Date:** 2026-09-02  
**Status:** Approved visual direction; frozen for implementation planning  
**Approved prototype:** `.superpowers/brainstorm/38788-1788341823/content/report-v2-metrics.html`

## Objective

Replace the dense product-profitability dashboard with a Romanian-language online report that explains the account in plain business terms. A non-technical store owner must understand the targets, current performance, period comparisons, financial result, and product actions without reading an advertising audit.

## Results

1. The owner sees whether the selected period produced a profit or loss against the agreed advertising profitability target.
2. The owner sees the three largest business conclusions immediately: money lost, sales volume missed, and catalog products that did not receive enough promotion.
3. Every product appears in one action-oriented tab, with the count and financial consequence of that group shown before the table.
4. Current performance can be compared with the previous equivalent period and the same period last year using the same four business measures plus the profitability result.

## Scope

The V2 report remains an online application page. It is not a PDF and does not introduce a PDF export. It uses live report data and keeps the existing period-selection behavior.

The report is presented in Romanian. Technical source identifiers remain in English. Business-facing terms use plain Romanian wording, including “Volum vanzari” for conversion value and “Nr. vanzari” for conversions.

## Page structure

The report is a single vertical page with five sections.

### 1. Brand header

The top bar contains the Devrika identity and selected reporting period. It states that the audit is read-only.

### 2. Account headline and targets

The gradient header gives one plain-language conclusion about the account. Below it, four equal target tiles show:

1. Current ROAS.
2. Minimum ROAS target.
3. Current CPA.
4. Maximum CPA target.

Current values use warning color when they miss the target. Target values use a positive color. Every target is read from the same profile or report source used by the calculation engine; the report does not maintain a separate value.

### 3. Three primary conclusions

Three equal cards replace the previous CPA-difference block:

1. Total money lost and the number of unprofitable products.
2. Estimated missed sales volume and the number of opportunity products.
3. The number of catalog products that have not received enough promotion.

Each card has one direct sentence, one number, and one short explanation. The values must match the corresponding product tab exactly.

### 4. Period comparison

The comparison table contains three rows:

1. Selected period.
2. Previous equivalent period.
3. Same period in the previous year.

The columns appear in this order:

1. Period.
2. Budget.
3. Sales volume.
4. Number of sales.
5. CPA.
6. ROAS.
7. Profit or loss.

The final column always states both the verdict and amount. A negative result is shown as a loss in red. A positive result is shown as profit in green. Missing comparison data is shown as unavailable and is never estimated.

### 5. Product action tabs

Only one category is open at a time. The default tab is the loss category. The four tabs are:

1. Products consuming budget.
2. Products not promoted enough.
3. Products with potential.
4. Profitable products.

Every tab contains:

1. A sentence with the number of products and the relevant amount or measured budget.
2. A short explanation of what the group means.
3. The average clicks required for one sale when the metric is meaningful for that group.
4. Every product assigned to that group.
5. Clicks, cost, number of sales, clicks per sale, CPA, sales volume, ROAS, and the group-specific financial result or status.

## Metrics and formulas

All calculations use the selected period and the account currency.

### Core metrics

```text
roas = salesVolume / adSpend
cpa = adSpend / numberOfSales
averageClicksPerSale = totalClicks / totalNumberOfSales
```

CPA and average clicks per sale are unavailable when the denominator is zero.

### Period profit or loss

The report expresses profitability against the configured minimum ROAS. It does not claim to be accounting net profit.

```text
allowedAdSpend = salesVolume / minimumRoasTarget
profitOrLoss = allowedAdSpend - actualAdSpend
```

A positive value is displayed as profit. A negative value is displayed as loss. The displayed amount is rounded to the nearest whole currency unit.

Example using the approved prototype:

```text
44,850 / 4.0 - 14,950 = -3,737.5
displayed result = 3,738 RON loss
```

### Product loss

For a product below the minimum ROAS target:

```text
productLoss = actualAdSpend - (salesVolume / minimumRoasTarget)
```

The group total is the sum of product losses, not the sum of product spend.

### Missed sales volume

Opportunity products must have at least one sale and a ROAS above the minimum target. Their average ROAS is weighted by spend.

```text
weightedOpportunityRoas = totalOpportunitySalesVolume / totalOpportunitySpend
missedSalesVolume = totalLossProductSpend * weightedOpportunityRoas
```

The missed sales volume is explicitly labeled as a simulation. It is not presented as measured revenue or guaranteed future revenue.

### Products not promoted enough

A product with no sales is not an opportunity product. Products with no sales and fewer clicks than the calculated average clicks required for one sale are shown in the not-promoted-enough group. The tab states the benchmark and each product's current traffic.

### Group membership

The existing report classification remains the source of truth for mutually exclusive product labels. The V2 presentation adds these validity checks:

1. An opportunity product must have at least one sale and ROAS at or above the minimum target.
2. A not-promoted-enough product must have no sales and remain below the clicks-per-sale benchmark.
3. A loss product must have measurable spend and a financial result below zero.
4. A profitable product must have a financial result at or above zero and enough data to leave the insufficient-promotion groups.

If a source label violates a validity check, the report must not silently display a contradictory conclusion. It reports the data as unavailable for that classification and records the mismatch for diagnosis.

## Data requirements

The report payload needs the selected period, previous equivalent period, and same period last year. Each period requires spend, sales volume, number of sales, and targets or a reference to the shared target source.

Each product requires its stable identifier, display name, label, clicks, spend, number of sales, and sales volume. Derived values are calculated in one shared reporting layer so the summary, comparison table, tabs, and tests cannot disagree.

No client name, target, period, currency, threshold, or product value is hardcoded in production code.

## Empty and unavailable states

1. A missing comparison period shows unavailable data in that row.
2. A zero-denominator CPA or clicks-per-sale value shows an unavailable marker.
3. A product group with zero products keeps its tab and explains that no products currently match the category.
4. A missing target blocks profitability claims while leaving measured spend, sales volume, and sales count visible.
5. A partial product dataset is labeled partial and does not present group totals as account-wide totals.

## Responsive behavior

Desktop uses the full comparison grid and product table. On smaller screens, the target tiles become a two-column grid, the three conclusion cards stack vertically, tabs scroll horizontally, and wide tables scroll without hiding columns or changing their order.

## Accessibility

Tabs use tab semantics, keyboard navigation, visible focus, and selected state. Color is never the only profitability signal: every amount also includes a profit, loss, simulated, or unavailable label. Numeric table headers remain associated with their cells.

## Verification

Implementation is complete only when all of the following are proven:

1. The report renders in Romanian with the approved plain-language terminology.
2. All three conclusion cards equal the totals in their corresponding tabs.
3. All four tabs contain every product assigned to their category and switch without navigation.
4. The selected, previous, and prior-year rows use the correct date windows.
5. Period profit or loss and product loss match the formulas above.
6. Missed sales volume matches loss-product spend multiplied by weighted opportunity ROAS and is labeled as simulated.
7. Missing targets or comparison periods never produce invented values.
8. Desktop and mobile visual checks show no clipped labels, hidden columns, or duplicated category summaries.

## Out of scope

1. Changing Google Ads campaigns, budgets, product labels, or account settings.
2. Accounting profit after product cost, tax, shipping, agency fees, or operating expenses.
3. Predictive guarantees or forecasts presented as measured results.
4. PDF generation or export.
