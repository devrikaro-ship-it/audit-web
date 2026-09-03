"use client";

import { useState, type KeyboardEvent, type ReactElement } from "react";
import type {
  GoogleAdsReportV2Conclusion,
  GoogleAdsReportV2Group,
  GoogleAdsReportV2ProductRow,
  GoogleAdsReportV2ViewModel,
  ProfitOrLossValue,
  ReportMetric,
  ReportPeriodRow,
  V2ProductLabel,
} from "@/lib/gads-report-metrics";

export type PeriodSelector = {
  action: string;
  selected: string;
  options: { value: string; label: string }[];
};

type ReportingDashboardProps = {
  report: GoogleAdsReportV2ViewModel;
  periodSelector?: PeriodSelector;
  demo?: boolean;
};

type GroupPresentation = {
  tabLabel: string;
  metricLabel: string;
  resultHeader: string;
  tone: "loss" | "neutral" | "opportunity" | "profit";
};

const GROUP_PRESENTATION: Record<V2ProductLabel, GroupPresentation> = {
  LOSS_MAKER: {
    tabLabel: "Consumă buget",
    metricLabel: "Pierdere totală",
    resultHeader: "Pierdere",
    tone: "loss",
  },
  NOT_PROMOTED: {
    tabLabel: "Insuficient promovate",
    metricLabel: "Produse valide",
    resultHeader: "Stare",
    tone: "neutral",
  },
  UNDERPROMOTED_POTENTIAL: {
    tabLabel: "Au potențial",
    metricLabel: "Volum vanzari ratat",
    resultHeader: "Potențial",
    tone: "opportunity",
  },
  PERFORMER: {
    tabLabel: "Profitabile",
    metricLabel: "Profit total",
    resultHeader: "Profit",
    tone: "profit",
  },
};

const CONCLUSION_PRESENTATION: Record<
  GoogleAdsReportV2Conclusion["key"],
  { label: string; tone: GroupPresentation["tone"] }
> = {
  MEASURED_PRODUCT_LOSS: { label: "Pierdere măsurată", tone: "loss" },
  SIMULATED_MISSED_SALES: { label: "Vânzări ratate", tone: "opportunity" },
  NOT_PROMOTED_PRODUCTS: {
    label: "Produse insuficient promovate",
    tone: "neutral",
  },
};

const PERIOD_PRESENTATION = {
  SELECTED: { label: "Perioada selectată", unavailableLabel: "Perioada selectată" },
  PREVIOUS: { label: "Perioada anterioară", unavailableLabel: "Perioada anterioară" },
  PREVIOUS_YEAR: {
    label: "Aceeași perioadă anul trecut",
    unavailableLabel: "Aceeași perioadă anul trecut",
  },
} as const;

const formatNumber = (value: number, maximumFractionDigits = 0): string =>
  new Intl.NumberFormat("ro-RO", { maximumFractionDigits }).format(value);

const formatRatio = (value: number): string =>
  `${formatNumber(value, 2)}×`;

const formatMoney = (
  value: number,
  currency: ReportMetric<string>,
): string => {
  if (currency.status === "UNAVAILABLE") {
    return `${formatNumber(value)} · Monedă indisponibilă`;
  }
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency.value,
    maximumFractionDigits: 0,
  }).format(value);
};

const metricRawValue = (metric: ReportMetric<number>): string =>
  metric.status === "AVAILABLE" ? String(metric.value) : "unavailable";

const formatDateRange = (from: string, to: string): string => {
  const date = (value: string) => new Date(`${value}T12:00:00Z`);
  const start = date(from);
  const end = date(to);
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();
  const day = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    timeZone: "UTC",
  });
  const monthYear = new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const full = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return sameMonth
    ? `${day.format(start)}–${day.format(end)} ${monthYear.format(end)}`
    : `${full.format(start)} – ${full.format(end)}`;
};

const groupDomId = (key: V2ProductLabel): string =>
  key.toLowerCase().replaceAll("_", "-");

export default function ReportingDashboard({
  report,
  periodSelector,
  demo = false,
}: ReportingDashboardProps): ReactElement {
  const [activeGroupKey, setActiveGroupKey] =
    useState<V2ProductLabel>("LOSS_MAKER");
  const activeGroup =
    report.groups.find((group) => group.key === activeGroupKey) ?? report.groups[0];
  const selectedPeriod = report.periods.selected;
  const selectedPeriodLabel =
    selectedPeriod.status === "AVAILABLE"
      ? formatDateRange(selectedPeriod.range.from, selectedPeriod.range.to)
      : "Perioadă indisponibilă";

  const selectTabFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % report.groups.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + report.groups.length) % report.groups.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = report.groups.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextGroup = report.groups[nextIndex];
    setActiveGroupKey(nextGroup.key);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div className="reportV2" data-report-dashboard="v2">
      <header className="brandHeader" data-report-section="brand-header">
        <div className="brandIdentity">
          <span className="brandMark" aria-hidden="true">D</span>
          <strong>DEVRIKA</strong>
        </div>
        <div className="reportPeriod">
          <span>Audit doar în citire</span>
          <b>{selectedPeriodLabel}</b>
        </div>
        {periodSelector ? (
          <form action={periodSelector.action} method="get" className="periodForm">
            <label htmlFor="report-period">Raport salvat</label>
            <select
              id="report-period"
              name="report"
              defaultValue={periodSelector.selected}
            >
              {periodSelector.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit">Arată perioada</button>
          </form>
        ) : null}
        {demo ? <span className="demoBadge">MOD DEMO · Date simulate</span> : null}
      </header>

      <section className="accountSummary" data-report-section="account-summary">
        <div className="heroCopy">
          <span>Raport Google Ads · Produse și profitabilitate</span>
          <h1>{report.accountHeadline}</h1>
          <p>
            Rezultatul compară vânzările măsurate cu țintele configurate pentru
            publicitate. Nu reprezintă profit contabil net.
          </p>
        </div>
        <div
          className="targetGrid"
          role="region"
          aria-label="Țintele contului"
          data-mobile-target-columns="2"
        >
          <TargetTile
            label="ROAS actual"
            metric={report.targets.currentRoas}
            format={formatRatio}
            status={targetStatus(
              report.targets.currentRoas,
              report.targets.minimumRoas,
              "minimum",
            )}
          />
          <TargetTile
            label="ROAS minim"
            metric={report.targets.minimumRoas}
            format={formatRatio}
            status={
              report.targets.minimumRoas.status === "AVAILABLE"
                ? "positive"
                : "unavailable"
            }
          />
          <TargetTile
            label="CPA actual"
            metric={report.targets.currentCpa}
            format={(value) => formatMoney(value, report.currencyCode)}
            status={targetStatus(
              report.targets.currentCpa,
              report.targets.maximumCpa,
              "maximum",
            )}
          />
          <TargetTile
            label="CPA maxim"
            metric={report.targets.maximumCpa}
            format={(value) => formatMoney(value, report.currencyCode)}
            status={
              report.targets.maximumCpa.status === "AVAILABLE"
                ? "positive"
                : "unavailable"
            }
          />
        </div>
      </section>

      <main className="reportContent">
        <section
          className="conclusionGrid"
          aria-label="Concluziile principale"
          data-report-section="primary-conclusions"
          data-mobile-conclusions="stack"
        >
          {report.conclusions.map((conclusion) => (
            <ConclusionCard
              key={conclusion.key}
              conclusion={conclusion}
              group={report.groups.find((group) => group.key === conclusion.groupKey)}
              currency={report.currencyCode}
            />
          ))}
        </section>

        <section className="comparisonSection" data-report-section="period-comparison">
          <SectionHeading
            title="Cifrele importante, comparate"
            description="Perioada aleasă este comparată cu perioada anterioară și cu aceeași perioadă din anul trecut."
          />
          <div className="comparisonScroll" data-horizontal-scroll="comparison" tabIndex={0}>
            <table aria-label="Comparația perioadelor" className="comparisonTable">
              <thead>
                <tr>
                  {[
                    "Perioadă",
                    "Buget",
                    "Volum vanzari",
                    "Nr. vanzari",
                    "CPA",
                    "ROAS",
                    "Profit / Pierdere",
                  ].map((label) => (
                    <th key={label} scope="col">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <PeriodRow row={report.periods.selected} currency={report.currencyCode} />
                <PeriodRow row={report.periods.previous} currency={report.currencyCode} />
                <PeriodRow row={report.periods.previousYear} currency={report.currencyCode} />
              </tbody>
            </table>
          </div>
        </section>

        <section className="productActions" data-report-section="product-actions">
          <SectionHeading
            title="Produsele, grupate după ce trebuie să faci"
            description="Fiecare produs apare o singură dată, în categoria indicată de datele perioadei selectate."
          />
          {report.productPopulationStatus === "PARTIAL" ? (
            <p className="partialNotice" role="status">
              Date parțiale: sumele de mai jos descriu numai produsele măsurate,
              nu întregul cont.
            </p>
          ) : null}
          <div
            className="actionTabs"
            role="tablist"
            aria-label="Acțiuni pentru produse"
            data-horizontal-scroll="tabs"
          >
            {report.groups.map((group, index) => {
              const selected = group.key === activeGroup.key;
              const id = groupDomId(group.key);
              const validCount =
                group.totals.productCount.status === "AVAILABLE"
                  ? group.totals.productCount.value
                  : 0;
              const quarantinedCount = group.quarantinedRows.length;
              return (
                <button
                  key={group.key}
                  type="button"
                  role="tab"
                  id={`product-tab-${id}`}
                  aria-selected={selected}
                  aria-controls={`product-panel-${id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveGroupKey(group.key)}
                  onKeyDown={(event) => selectTabFromKeyboard(event, index)}
                >
                  <span>{GROUP_PRESENTATION[group.key].tabLabel}</span>
                  <b>{validCount}</b>
                  {quarantinedCount ? (
                    <small>{quarantinedCount} indisponibil</small>
                  ) : null}
                </button>
              );
            })}
          </div>
          <GroupPanel group={activeGroup} report={report} />
        </section>
      </main>
      <style>{dashboardCss}</style>
    </div>
  );
}

function targetStatus(
  current: ReportMetric<number>,
  target: ReportMetric<number>,
  direction: "minimum" | "maximum",
): "warning" | "positive" | "neutral" | "unavailable" {
  if (current.status === "UNAVAILABLE" || target.status === "UNAVAILABLE") {
    return current.status === "UNAVAILABLE" ? "unavailable" : "neutral";
  }
  const missesTarget =
    direction === "minimum"
      ? current.value < target.value
      : current.value > target.value;
  return missesTarget ? "warning" : "positive";
}

function TargetTile({
  label,
  metric,
  format,
  status,
}: {
  label: string;
  metric: ReportMetric<number>;
  format: (value: number) => string;
  status: "warning" | "positive" | "neutral" | "unavailable";
}) {
  return (
    <div className="targetTile" data-target-tile data-status={status}>
      <small>{label}</small>
      <strong>
        {metric.status === "AVAILABLE" ? format(metric.value) : "Indisponibil"}
      </strong>
      <span>
        {status === "warning"
          ? "În afara țintei"
          : status === "positive"
            ? "În țintă"
            : status === "unavailable"
              ? "Indisponibil"
              : "Ținta nu este disponibilă"}
      </span>
    </div>
  );
}

function ConclusionCard({
  conclusion,
  group,
  currency,
}: {
  conclusion: GoogleAdsReportV2Conclusion;
  group?: GoogleAdsReportV2Group;
  currency: ReportMetric<string>;
}) {
  const presentation = CONCLUSION_PRESENTATION[conclusion.key];
  const count =
    group?.totals.productCount.status === "AVAILABLE"
      ? group.totals.productCount.value
      : null;
  const isCount = conclusion.key === "NOT_PROMOTED_PRODUCTS";
  const metric =
    conclusion.metric.status === "AVAILABLE"
      ? isCount
        ? `${formatNumber(conclusion.metric.value)} produse`
        : formatMoney(conclusion.metric.value, currency)
      : "Indisponibil";
  return (
    <article
      className={`conclusionCard ${presentation.tone}`}
      data-testid={`conclusion-${conclusion.key}`}
      data-raw-value={metricRawValue(conclusion.metric)}
    >
      <span className="evidenceLabel">
        {conclusion.evidenceLabel === "SIMULATED"
          ? "Simulare"
          : conclusion.evidenceLabel === "MEASURED"
            ? "Măsurat"
            : "Indisponibil"}
      </span>
      <h2>{presentation.label}</h2>
      <strong className="conclusionValue">{metric}</strong>
      <p>
        {count === null ? "Număr indisponibil" : `${formatNumber(count)} produse`} ·{" "}
        {conclusion.explanation}
      </p>
      {conclusion.totalScope === "PARTIAL" ? (
        <small>Date parțiale, numai pentru produsele măsurate.</small>
      ) : null}
    </article>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="sectionHeading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function PeriodRow({
  row,
  currency,
}: {
  row: ReportPeriodRow;
  currency: ReportMetric<string>;
}) {
  const presentation = PERIOD_PRESENTATION[row.key];
  if (row.status === "UNAVAILABLE") {
    return (
      <tr>
        <td><strong>{presentation.unavailableLabel}</strong><span>Indisponibil</span></td>
        {Array.from({ length: 6 }, (_, index) => (
          <td key={index}><span>Indisponibil</span></td>
        ))}
      </tr>
    );
  }
  return (
    <tr className={row.key === "SELECTED" ? "selectedPeriod" : undefined}>
      <td>
        <strong>{formatDateRange(row.range.from, row.range.to)}</strong>
        <span>{presentation.label}</span>
      </td>
      <td>{formatMetric(row.budget, (value) => formatMoney(value, currency))}</td>
      <td>{formatMetric(row.salesVolume, (value) => formatMoney(value, currency))}</td>
      <td>{formatMetric(row.numberOfSales, (value) => formatNumber(value, 2))}</td>
      <td>{formatMetric(row.cpa, (value) => formatMoney(value, currency))}</td>
      <td>{formatMetric(row.roas, formatRatio)}</td>
      <td>{formatProfitOrLoss(row.profitOrLoss, currency)}</td>
    </tr>
  );
}

function formatMetric(
  metric: ReportMetric<number>,
  format: (value: number) => string,
): string {
  return metric.status === "AVAILABLE" ? format(metric.value) : "Indisponibil";
}

function formatProfitOrLoss(
  metric: ReportMetric<ProfitOrLossValue>,
  currency: ReportMetric<string>,
): ReactElement | string {
  if (metric.status === "UNAVAILABLE") return "Indisponibil";
  const label =
    metric.value.outcome === "LOSS"
      ? "Pierdere"
      : metric.value.outcome === "PROFIT"
        ? "Profit"
        : "La prag";
  const tone = metric.value.outcome === "LOSS" ? "lossText" : "profitText";
  return (
    <span className={tone}>
      <strong>{label}</strong>
      <small>{formatMoney(Math.abs(metric.value.displayAmount), currency)}</small>
    </span>
  );
}

function GroupPanel({
  group,
  report,
}: {
  group: GoogleAdsReportV2Group;
  report: GoogleAdsReportV2ViewModel;
}) {
  const presentation = GROUP_PRESENTATION[group.key];
  const claim = groupClaim(group);
  const count =
    group.totals.productCount.status === "AVAILABLE"
      ? group.totals.productCount.value
      : 0;
  const domId = groupDomId(group.key);
  return (
    <div
      className={`groupPanel ${presentation.tone}`}
      role="tabpanel"
      id={`product-panel-${domId}`}
      aria-labelledby={`product-tab-${domId}`}
    >
      <div className="groupSummary">
        <div>
          <span className="groupKicker">{presentation.tabLabel}</span>
          <h3>{group.title}</h3>
          <p>{group.explanation}</p>
          <div className="supportFacts">
            <span>{formatNumber(count)} produse valide</span>
            <span>
              Buget măsurat: {formatMetric(group.totals.spend, (value) =>
                formatMoney(value, report.currencyCode),
              )}
            </span>
            {group.benchmark.status === "AVAILABLE" ? (
              <span>
                Media contului: {formatNumber(group.benchmark.value, 1)} clickuri
                pentru o vânzare
              </span>
            ) : null}
            {group.quarantinedRows.length ? (
              <span>{group.quarantinedRows.length} cu clasificare indisponibilă</span>
            ) : null}
          </div>
        </div>
        <div
          className="groupClaim"
          data-testid={`group-claim-${group.key}`}
          data-raw-value={metricRawValue(claim.metric)}
        >
          <small>{presentation.metricLabel}</small>
          <strong>{formatGroupClaim(claim.metric, claim.kind, report.currencyCode)}</strong>
          <span>{claim.kind === "simulation" ? "Simulare" : "Măsurat"}</span>
        </div>
      </div>
      {claim.kind === "simulation" ? (
        <p className="simulationNotice">
          Simularea folosește datele măsurate ale perioadei și nu este o garanție
          pentru vânzări viitoare.
        </p>
      ) : null}
      <div
        className="productTableScroll"
        data-horizontal-scroll="products"
        tabIndex={0}
      >
        <table aria-label={`Produse: ${presentation.tabLabel}`} className="productTable">
          <thead>
            <tr>
              {[
                "Produs",
                "Clickuri",
                "Cost",
                "Nr. vanzari",
                "Clickuri / vanzare",
                "CPA",
                "Volum vanzari",
                "ROAS",
                presentation.resultHeader,
              ].map((label) => (
                <th key={label} scope="col">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <ProductRow
                key={row.productId}
                row={row}
                currency={report.currencyCode}
              />
            ))}
          </tbody>
        </table>
        {group.rows.length === 0 ? (
          <div className="emptyState">
            <strong>{group.emptyState}</strong>
            <span>Categoria rămâne vizibilă și va primi produse când există date.</span>
          </div>
        ) : null}
      </div>
      <footer className="groupFooter">
        Toate valorile sunt pentru perioada selectată.
        {group.totalScope === "PARTIAL" ? " Totalurile folosesc date parțiale." : ""}
      </footer>
    </div>
  );
}

function groupClaim(group: GoogleAdsReportV2Group): {
  metric: ReportMetric<number>;
  kind: "money" | "count" | "simulation";
} {
  if (group.key === "LOSS_MAKER") {
    return { metric: group.totals.productLoss, kind: "money" };
  }
  if (group.key === "NOT_PROMOTED") {
    return { metric: group.totals.productCount, kind: "count" };
  }
  if (group.key === "UNDERPROMOTED_POTENTIAL") {
    return { metric: group.totals.missedSalesVolume, kind: "simulation" };
  }
  return { metric: group.totals.profitOrLoss, kind: "money" };
}

function formatGroupClaim(
  metric: ReportMetric<number>,
  kind: "money" | "count" | "simulation",
  currency: ReportMetric<string>,
): string {
  if (metric.status === "UNAVAILABLE") return "Indisponibil";
  if (kind === "count") return `${formatNumber(metric.value)} produse`;
  return formatMoney(Math.abs(metric.value), currency);
}

function ProductRow({
  row,
  currency,
}: {
  row: GoogleAdsReportV2ProductRow;
  currency: ReportMetric<string>;
}) {
  const initials = row.title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return (
    <tr className={row.classificationStatus === "QUARANTINED" ? "quarantined" : undefined}>
      <td data-product-id={row.productId}>
        <div className="productIdentity">
          <span aria-hidden="true">{initials || "P"}</span>
          <div><strong>{row.title}</strong><small>ID produs: {row.productId}</small></div>
        </div>
      </td>
      <td>{formatNumber(row.clicks, 2)}</td>
      <td>{formatMoney(row.cost, currency)}</td>
      <td>{formatNumber(row.conversions, 2)}</td>
      <td>{formatMetric(row.clicksPerSale, (value) => formatNumber(value, 1))}</td>
      <td>{formatMetric(row.cpa, (value) => formatMoney(value, currency))}</td>
      <td>{formatMoney(row.conversionValue, currency)}</td>
      <td>{formatMetric(row.roas, formatRatio)}</td>
      <td><ProductResult row={row} currency={currency} /></td>
    </tr>
  );
}

function ProductResult({
  row,
  currency,
}: {
  row: GoogleAdsReportV2ProductRow;
  currency: ReportMetric<string>;
}) {
  if (row.classificationStatus === "QUARANTINED") {
    return (
      <span className="unavailableResult">
        <strong>Indisponibil</strong>
        <small>{row.classificationText}</small>
      </span>
    );
  }
  if (row.groupKey === "NOT_PROMOTED") {
    return <span className="neutralResult"><strong>Sub prag</strong><small>Măsurat</small></span>;
  }
  if (row.groupKey === "LOSS_MAKER") {
    return row.productLoss.status === "AVAILABLE" ? (
      <span className="lossText"><strong>Pierdere</strong><small>{formatMoney(row.productLoss.value, currency)}</small></span>
    ) : "Indisponibil";
  }
  if (row.financialResult.status === "UNAVAILABLE") return "Indisponibil";
  const isProfit = row.financialResult.value.outcome !== "LOSS";
  return (
    <span className={isProfit ? "profitText" : "lossText"}>
      <strong>{isProfit ? "Profit" : "Pierdere"}</strong>
      <small>{formatMoney(Math.abs(row.financialResult.value.displayAmount), currency)}</small>
    </span>
  );
}

const dashboardCss = `
.reportV2,.reportContent,.conclusionGrid,.comparisonSection,.productActions{min-width:0}
.reportV2{--ink:#101833;--muted:#66738c;--line:#e1e6ef;--surface:#fbfcfe;--surface-alt:#f5f7fb;--navy:#191d61;--blue:#2b4187;--cyan:#087c9c;--red:#cf3442;--red-soft:#fff2f3;--amber:#a76508;--amber-soft:#fff7e8;--green:#137755;--green-soft:#eaf8f2;min-height:100vh;background:var(--surface);color:var(--ink);font-family:var(--font-inter),sans-serif;font-size:14px;line-height:1.5}.reportV2 *{box-sizing:border-box}.brandHeader{display:flex;align-items:center;gap:24px;min-height:72px;padding:14px clamp(18px,4vw,52px);border-bottom:1px solid var(--line);background:#fefeff}.brandIdentity{display:flex;align-items:center;gap:11px;font-family:var(--font-sora),sans-serif;letter-spacing:.12em}.brandMark{display:grid;width:34px;height:34px;place-items:center;border-radius:10px;background:linear-gradient(135deg,#4c46c7,#13a7c5);color:#fdfcff;font-weight:800}.reportPeriod{display:flex;align-items:center;gap:8px;margin-left:auto;padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface-alt);color:var(--muted);font-size:12px}.reportPeriod b{color:var(--ink)}.periodForm{display:flex;align-items:center;gap:8px}.periodForm label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.periodForm select,.periodForm button{min-height:38px;border:1px solid var(--line);border-radius:9px;background:#fefeff;color:var(--ink);font:inherit}.periodForm select{max-width:220px;padding:0 10px}.periodForm button{padding:0 13px;font-weight:700}.demoBadge{padding:7px 10px;border-radius:7px;background:var(--amber-soft);color:var(--amber);font-size:11px;font-weight:800}.accountSummary{padding:42px clamp(18px,4vw,52px) 36px;background:linear-gradient(120deg,var(--navy),var(--blue) 58%,var(--cyan));color:#fdfcff}.heroCopy>span{color:#9be6ec;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.heroCopy h1{max-width:900px;margin:12px 0 10px;font-family:var(--font-sora),sans-serif;font-size:clamp(30px,4.2vw,48px);line-height:1.08;letter-spacing:-.035em}.heroCopy p{max-width:760px;margin:0;color:#d4dbef;font-size:16px}.targetGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:28px;overflow:hidden;border:1px solid rgba(255,255,255,.24);border-radius:15px;background:rgba(255,255,255,.07)}.targetTile{min-width:0;padding:16px 18px;border-inline-start:1px solid rgba(255,255,255,.18)}.targetTile:first-child{border-inline-start:0}.targetTile small,.targetTile span{display:block}.targetTile small{color:#c4cce4;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.targetTile strong{display:block;margin-top:6px;font-family:var(--font-sora),sans-serif;font-size:22px;overflow-wrap:anywhere}.targetTile span{margin-top:2px;color:#d4dbef;font-size:10px}.targetTile[data-status=warning] strong{color:#ff9da4}.targetTile[data-status=positive] strong{color:#7be9c3}.targetTile[data-status=unavailable] strong{color:#f5ca77}.reportContent{display:grid;gap:34px;padding:32px clamp(14px,4vw,52px) 56px}.conclusionGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.conclusionCard{display:flex;min-width:0;flex-direction:column;gap:7px;padding:22px;border:1px solid var(--line);border-radius:15px;background:#fefeff}.conclusionCard.loss{border-color:#f4c8cc;background:var(--red-soft)}.conclusionCard.opportunity{border-color:#eed7ae;background:var(--amber-soft)}.conclusionCard h2{margin:0;font-family:var(--font-sora),sans-serif;font-size:19px}.conclusionValue{font-family:var(--font-sora),sans-serif;font-size:27px;line-height:1.15;overflow-wrap:anywhere}.conclusionCard.loss .conclusionValue{color:var(--red)}.conclusionCard.opportunity .conclusionValue{color:var(--amber)}.conclusionCard p{margin:0;color:var(--muted);font-size:13px}.conclusionCard>small{color:var(--amber);font-weight:700}.evidenceLabel{width:max-content;padding:4px 7px;border-radius:6px;background:#eef1f6;color:#59657b;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.loss .evidenceLabel{background:#ffe3e5;color:var(--red)}.opportunity .evidenceLabel{background:#fce8c4;color:var(--amber)}.sectionHeading h2{margin:0;font-family:var(--font-sora),sans-serif;font-size:22px}.sectionHeading p{max-width:70ch;margin:5px 0 13px;color:var(--muted);font-size:13px}.comparisonScroll,.productTableScroll{overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fefeff}.comparisonScroll:focus-visible,.productTableScroll:focus-visible{outline:3px solid #8cb6ee;outline-offset:3px}.comparisonTable,.productTable{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.comparisonTable{min-width:820px}.comparisonTable th,.comparisonTable td,.productTable th,.productTable td{padding:12px 14px;border-bottom:1px solid #e9ecf2;text-align:right;white-space:nowrap}.comparisonTable th,.productTable th{background:#f4f6fa;color:#69768e;font-size:10px;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.comparisonTable th:first-child,.comparisonTable td:first-child,.productTable th:first-child,.productTable td:first-child{text-align:left}.comparisonTable td:first-child strong,.comparisonTable td:first-child span{display:block}.comparisonTable td:first-child span{margin-top:2px;color:var(--muted);font-size:10px}.comparisonTable .selectedPeriod{background:#fbfcff}.lossText,.profitText,.unavailableResult,.neutralResult{display:inline-flex;flex-direction:column;align-items:flex-end;gap:1px}.lossText{color:var(--red)}.profitText{color:var(--green)}.neutralResult{color:var(--muted)}.unavailableResult{color:var(--amber)}.lossText small,.profitText small,.unavailableResult small,.neutralResult small{font-size:10px}.productActions{min-width:0}.partialNotice,.simulationNotice{margin:0 0 12px;padding:10px 12px;border:1px solid #ecd7ae;border-radius:10px;background:var(--amber-soft);color:#76510f;font-size:12px}.actionTabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin}.actionTabs button{display:flex;align-items:center;gap:7px;flex:0 0 auto;min-height:44px;padding:9px 13px;border:1px solid var(--line);border-radius:11px 11px 0 0;background:#f5f7fb;color:#4c5871;font:inherit;font-weight:750;cursor:pointer}.actionTabs button b{display:grid;min-width:22px;height:22px;place-items:center;border-radius:999px;background:#e8ebf2;font-size:11px}.actionTabs button small{font-size:9px;color:var(--amber)}.actionTabs button[aria-selected=true]{border-color:#dd606a;background:#fefeff;color:#bd2532;box-shadow:inset 0 -3px #d93846}.actionTabs button:focus-visible{position:relative;z-index:2;outline:3px solid #8cb6ee;outline-offset:2px}.groupPanel{overflow:hidden;border:1px solid var(--line);border-radius:0 15px 15px 15px;background:#fefeff}.groupSummary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:center;padding:21px 22px;border-bottom:1px solid #e9ecf2}.groupKicker{color:var(--red);font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.groupPanel.opportunity .groupKicker{color:var(--amber)}.groupPanel.profit .groupKicker{color:var(--green)}.groupSummary h3{margin:3px 0 4px;font-family:var(--font-sora),sans-serif;font-size:21px}.groupSummary p{max-width:70ch;margin:0;color:var(--muted);font-size:12px}.supportFacts{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.supportFacts span{padding:5px 8px;border-radius:7px;background:#f1f3f7;color:#56637b;font-size:10px;font-weight:750}.groupClaim{text-align:right}.groupClaim small,.groupClaim span{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.groupClaim strong{display:block;max-width:300px;margin:3px 0;font-family:var(--font-sora),sans-serif;font-size:25px;overflow-wrap:anywhere}.groupPanel.loss .groupClaim strong{color:var(--red)}.groupPanel.opportunity .groupClaim strong{color:var(--amber)}.groupPanel.profit .groupClaim strong{color:var(--green)}.groupPanel .simulationNotice{margin:14px 22px}.productTableScroll{border:0;border-radius:0}.productTable{min-width:1060px}.productTable tr:last-child td{border-bottom:0}.productTable tbody tr:hover{background:#f8faff}.productTable tbody tr.quarantined{background:#fffaf0}.productIdentity{display:flex;align-items:center;gap:9px;min-width:230px}.productIdentity>span{display:grid;width:32px;height:32px;flex:0 0 32px;place-items:center;border:1px solid #dfe4ed;border-radius:8px;background:#f4f6fa;color:#504bc0;font-size:9px;font-weight:850}.productIdentity strong,.productIdentity small{display:block;max-width:260px;overflow:hidden;text-overflow:ellipsis}.productIdentity small{color:#8b96aa;font-size:9px}.emptyState{display:grid;gap:5px;padding:38px 22px;text-align:center}.emptyState span{color:var(--muted);font-size:12px}.groupFooter{padding:12px 22px;border-top:1px solid #e9ecf2;background:#f7f8fb;color:var(--muted);font-size:11px}@media(max-width:900px){.brandHeader{align-items:flex-start;flex-wrap:wrap}.reportPeriod{margin-left:auto}.periodForm{width:100%;order:3}.periodForm select{flex:1}.targetGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.targetTile:nth-child(3){border-top:1px solid rgba(255,255,255,.18);border-inline-start:0}.targetTile:nth-child(4){border-top:1px solid rgba(255,255,255,.18)}.conclusionGrid{grid-template-columns:1fr}.groupSummary{grid-template-columns:1fr}.groupClaim{text-align:left}.lossText,.profitText,.unavailableResult,.neutralResult{align-items:flex-start}}@media(max-width:540px){.brandHeader{gap:12px;padding:13px 14px}.brandIdentity strong{font-size:13px}.reportPeriod{display:grid;gap:0;padding:7px 9px;font-size:10px}.demoBadge{width:100%;text-align:center}.accountSummary{padding:30px 18px}.heroCopy h1{font-size:30px}.heroCopy p{font-size:14px}.targetTile{padding:14px 12px}.targetTile strong{font-size:17px}.reportContent{gap:28px;padding:22px 14px 40px}.conclusionCard{padding:18px}.conclusionValue{font-size:23px}.sectionHeading h2{font-size:20px}.groupSummary{padding:18px}.groupClaim strong{font-size:22px}.actionTabs{margin-inline:-14px;padding-inline:14px}.productTableScroll{scrollbar-width:thin}}
`;
