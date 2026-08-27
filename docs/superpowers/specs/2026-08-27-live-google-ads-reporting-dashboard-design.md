# Live Google Ads Reporting Dashboard Design

## Goal

Turn the existing profitability report into one live, interactive dashboard used both immediately after the audit and inside the monthly client portal.

## User experience

The interface uses a familiar Google Ads reporting language without copying Google branding: a light neutral canvas, compact controls, blue actions, restrained status colors, dense tabular data, sticky headers, and clear numeric alignment.

The page opens with the selected account, reporting period, and last refresh time. A performance strip shows measured account-wide spend, sales, clicks, orders, conversion rate, CPA, and ROAS. A profitability status compares measured ROAS with break-even ROAS and states the numeric gap.

The main product table is live HTML, not a PDF, image, iframe, or fixed excerpt. It exposes the complete product population available to the report through a vertically scrollable region. The header stays visible while scrolling. Users can search, filter by classification, sort by each numeric metric, and change the reporting period. Horizontal scrolling preserves every column on narrow screens.

## Product classifications

Each product receives exactly one primary label from a closed vocabulary:

1. `LOSS_MAKER`: measured spend with ROAS below break-even ROAS.
2. `NOT_PROMOTED`: catalog-eligible product with no measured impressions in the selected period.
3. `UNDERPROMOTED_POTENTIAL`: profitable product whose measured traffic is below the traffic required for its next expected sale.
4. `PERFORMER`: profitable product with sufficient measured traffic.
5. `INSUFFICIENT_DATA`: the available evidence cannot support another label.

`clicksPerSale` is calculated from measured clicks and conversions. The opportunity threshold is derived from the comparable profitable product population, not from a client-specific hardcoded constant. A product cannot be labelled `NOT_PROMOTED` from Ads performance rows alone; the report must also know that the product exists and is eligible in the catalog.

## Product table

Columns are product, item ID, label, impressions, clicks, cost, conversions, conversion rate, clicks per sale, sales, CPA, ROAS, profitability gap, and measured money at risk or estimated opportunity. Numeric values remain traceable to the selected period.

The initial ordering places products needing action first, then growth opportunities, then performers and insufficient-data rows. Search, filters, and sorting operate on the full loaded population rather than only visible rows.

## Simulator

The existing budget simulator remains below the measured dashboard and keeps its explicit simulated-data labeling. Measured and simulated values never share an unlabeled column or status.

## Data contract

New report snapshots store account-wide clicks and impressions plus the complete product reporting population needed by the dashboard. Old signed snapshots remain readable. Missing account-wide metrics in old snapshots render as unavailable; they are never reconstructed from the loss and opportunity subsets.

The immediate report and monthly portal render the same dashboard component from the same signed snapshot contract. Period changes may only show periods for which a signed report snapshot exists until a server-side refresh pipeline is added.

## Responsive behavior

Desktop keeps the dense reporting table. Mobile uses a compact KPI grid and horizontal table scrolling without hiding profitability, labels, or product identity. All controls remain keyboard accessible and status is communicated by text as well as color.

## Boundaries

This increment changes the client-facing report dashboard only. It does not deploy to production, redesign the internal Devrika client dashboard, enroll contacts, send email, mutate Google Ads, or invent catalog eligibility where no catalog source exists.
