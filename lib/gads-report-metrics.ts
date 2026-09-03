import type { ReportDateRange } from "./gads-report-periods";
import type { ProductPerformanceLabel, ReportProductInput } from "./gads-product-classification";

export type V2ProductLabel =
  | "LOSS_MAKER"
  | "NOT_PROMOTED"
  | "UNDERPROMOTED_POTENTIAL"
  | "PERFORMER";

export type ReportMetric<T> =
  | { status: "AVAILABLE"; value: T }
  | { status: "UNAVAILABLE"; reason: string };

export type ReportPeriodInput = {
  range: ReportDateRange;
  spend: number;
  salesVolume: number;
  numberOfSales: number;
};

export type ReportProductInputV2 = ReportProductInput & {
  sourceLabel?: V2ProductLabel | "INSUFFICIENT_DATA";
};

export type ProductPopulationStatus = "COMPLETE" | "PARTIAL";
export type PeriodKey = "SELECTED" | "PREVIOUS" | "PREVIOUS_YEAR";
export type EvidenceLabel = "MEASURED" | "SIMULATED" | "UNAVAILABLE";

export type PeriodFormulaResult = {
  roas: number | null;
  cpa: number | null;
  profitOrLoss: number | null;
  displayAmount: number | null;
};

export type ProfitOrLossValue = {
  raw: number;
  displayAmount: number;
  outcome: "PROFIT" | "LOSS" | "BREAK_EVEN";
};

export type AvailablePeriodRow = {
  status: "AVAILABLE";
  key: PeriodKey;
  range: ReportDateRange;
  budget: ReportMetric<number>;
  salesVolume: ReportMetric<number>;
  numberOfSales: ReportMetric<number>;
  cpa: ReportMetric<number>;
  roas: ReportMetric<number>;
  profitOrLoss: ReportMetric<ProfitOrLossValue>;
  evidenceLabel: "MEASURED";
};

export type UnavailablePeriodRow = {
  status: "UNAVAILABLE";
  key: PeriodKey;
  reason: string;
};

export type ReportPeriodRow = AvailablePeriodRow | UnavailablePeriodRow;

export type ClassificationDiagnostic = {
  productId: string;
  sourceLabel: ProductPerformanceLabel | null;
  assignedGroupKey: V2ProductLabel;
  reason: string;
};

export type ProductFinancialResult = {
  raw: number;
  displayAmount: number;
  outcome: "PROFIT" | "LOSS" | "BREAK_EVEN";
};

export type GoogleAdsReportV2ProductRow = ReportProductInputV2 & {
  groupKey: V2ProductLabel;
  classificationStatus: "VALID" | "QUARANTINED";
  classificationText: string;
  roas: ReportMetric<number>;
  cpa: ReportMetric<number>;
  clicksPerSale: ReportMetric<number>;
  financialResult: ReportMetric<ProductFinancialResult>;
  productLoss: ReportMetric<number>;
  evidenceLabel: "MEASURED" | "UNAVAILABLE";
};

export type ReportGroupTotals = {
  productCount: ReportMetric<number>;
  quarantinedProductCount: ReportMetric<number>;
  spend: ReportMetric<number>;
  salesVolume: ReportMetric<number>;
  numberOfSales: ReportMetric<number>;
  productLoss: ReportMetric<number>;
  profitOrLoss: ReportMetric<number>;
  weightedOpportunityRoas: ReportMetric<number>;
  missedSalesVolume: ReportMetric<number>;
};

export type GoogleAdsReportV2Group = {
  key: V2ProductLabel;
  title: string;
  explanation: string;
  emptyState: string;
  rows: GoogleAdsReportV2ProductRow[];
  validRows: GoogleAdsReportV2ProductRow[];
  quarantinedRows: GoogleAdsReportV2ProductRow[];
  totals: ReportGroupTotals;
  benchmark: ReportMetric<number>;
  totalScope: ProductPopulationStatus;
};

export type GoogleAdsReportV2Conclusion = {
  key: "MEASURED_PRODUCT_LOSS" | "SIMULATED_MISSED_SALES" | "NOT_PROMOTED_PRODUCTS";
  groupKey: V2ProductLabel;
  title: string;
  explanation: string;
  metric: ReportMetric<number>;
  evidenceLabel: EvidenceLabel;
  totalScope: ProductPopulationStatus;
};

export type GoogleAdsReportV2Input = {
  currencyCode?: string;
  minimumRoasTarget?: number | null;
  maximumCpaTarget?: number | null;
  periods: {
    selected: ReportPeriodInput;
    previous: ReportPeriodInput | null;
    previousYear: ReportPeriodInput | null;
  };
  products: ReportProductInputV2[];
  productPopulationStatus: ProductPopulationStatus;
};

export type GoogleAdsReportV2ViewModel = {
  currencyCode: ReportMetric<string>;
  periods: {
    selected: ReportPeriodRow;
    previous: ReportPeriodRow;
    previousYear: ReportPeriodRow;
  };
  targets: {
    currentRoas: ReportMetric<number>;
    minimumRoas: ReportMetric<number>;
    currentCpa: ReportMetric<number>;
    maximumCpa: ReportMetric<number>;
  };
  accountHeadline: string;
  averageClicksPerSale: ReportMetric<number>;
  conclusions: GoogleAdsReportV2Conclusion[];
  groups: GoogleAdsReportV2Group[];
  classificationDiagnostics: ClassificationDiagnostic[];
  productPopulationStatus: ProductPopulationStatus;
};

type CorePeriodValues = Pick<ReportPeriodInput, "spend" | "salesVolume" | "numberOfSales">;

type ProductLossInput = {
  spend: number;
  salesVolume: number;
};

type MissedSalesVolumeInput = {
  lossProductSpend: number;
  opportunitySpend: number;
  opportunitySalesVolume: number;
};

const unavailable = <T>(reason: string): ReportMetric<T> => ({ status: "UNAVAILABLE", reason });
const available = <T>(value: T): ReportMetric<T> => ({ status: "AVAILABLE", value });

function roundedDisplayAmount(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function positiveTarget(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function requireMeasuredNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`Invalid ${field}`);
  }
}

function validatePeriod(input: ReportPeriodInput): void {
  requireMeasuredNumber(input.spend, "period spend");
  requireMeasuredNumber(input.salesVolume, "period sales volume");
  requireMeasuredNumber(input.numberOfSales, "period number of sales");
}

function validateProduct(input: ReportProductInputV2): void {
  requireMeasuredNumber(input.cost, "product spend");
  requireMeasuredNumber(input.conversionValue, "product sales volume");
  requireMeasuredNumber(input.conversions, "product number of sales");
  requireMeasuredNumber(input.clicks, "product clicks");
  requireMeasuredNumber(input.impressions, "product impressions");
}

export function averageClicksPerSale(input: { clicks: number; numberOfSales: number }): number | null {
  return input.numberOfSales > 0 ? input.clicks / input.numberOfSales : null;
}

export function periodResult(
  input: CorePeriodValues,
  minimumRoasTarget: number | null | undefined,
): PeriodFormulaResult {
  const target = positiveTarget(minimumRoasTarget);
  const roas = input.spend > 0 ? input.salesVolume / input.spend : null;
  const cpa = input.numberOfSales > 0 ? input.spend / input.numberOfSales : null;
  const profitOrLoss = target === null ? null : input.salesVolume / target - input.spend;
  return {
    roas,
    cpa,
    profitOrLoss,
    displayAmount: profitOrLoss === null ? null : roundedDisplayAmount(profitOrLoss),
  };
}

export function productLoss(
  input: ProductLossInput,
  minimumRoasTarget: number | null | undefined,
): number | null {
  const target = positiveTarget(minimumRoasTarget);
  return target === null ? null : input.spend - input.salesVolume / target;
}

export function missedSalesVolume(input: MissedSalesVolumeInput): number | null {
  const weightedOpportunityRoas = input.opportunitySpend > 0
    ? input.opportunitySalesVolume / input.opportunitySpend
    : null;
  return weightedOpportunityRoas === null
    ? null
    : input.lossProductSpend * weightedOpportunityRoas;
}

function financialValue(raw: number): ProfitOrLossValue {
  return {
    raw,
    displayAmount: roundedDisplayAmount(raw),
    outcome: raw < 0 ? "LOSS" : raw > 0 ? "PROFIT" : "BREAK_EVEN",
  };
}

function availablePeriodRow(
  key: PeriodKey,
  input: ReportPeriodInput,
  minimumRoasTarget: number | null,
): AvailablePeriodRow {
  validatePeriod(input);
  const result = periodResult(input, minimumRoasTarget);
  return {
    status: "AVAILABLE",
    key,
    range: input.range,
    budget: available(input.spend),
    salesVolume: available(input.salesVolume),
    numberOfSales: available(input.numberOfSales),
    cpa: result.cpa === null ? unavailable("CPA is unavailable when the number of sales is zero") : available(result.cpa),
    roas: result.roas === null ? unavailable("ROAS is unavailable when spend is zero") : available(result.roas),
    profitOrLoss: result.profitOrLoss === null
      ? unavailable("Profitability is unavailable without a minimum ROAS target")
      : available(financialValue(result.profitOrLoss)),
    evidenceLabel: "MEASURED",
  };
}

function unavailablePeriodRow(key: PeriodKey): UnavailablePeriodRow {
  return { status: "UNAVAILABLE", key, reason: "Comparison period data is unavailable" };
}

function classificationGroup(
  product: ReportProductInputV2,
  minimumRoasTarget: number | null,
  clicksPerSaleBenchmark: number | null,
): V2ProductLabel {
  if (product.sourceLabel && product.sourceLabel !== "INSUFFICIENT_DATA") {
    return product.sourceLabel;
  }
  if (product.sourceLabel === "INSUFFICIENT_DATA") return "NOT_PROMOTED";
  const result = periodResult({
    spend: product.cost,
    salesVolume: product.conversionValue,
    numberOfSales: product.conversions,
  }, minimumRoasTarget);
  if (product.conversions === 0 && clicksPerSaleBenchmark !== null && product.clicks < clicksPerSaleBenchmark) {
    return "NOT_PROMOTED";
  }
  if (result.profitOrLoss !== null && product.cost > 0 && result.profitOrLoss < 0) return "LOSS_MAKER";
  if (
    result.roas !== null
    && minimumRoasTarget !== null
    && product.conversions >= 1
    && result.roas >= minimumRoasTarget
    && clicksPerSaleBenchmark !== null
    && product.clicks < clicksPerSaleBenchmark
  ) {
    return "UNDERPROMOTED_POTENTIAL";
  }
  if (result.profitOrLoss !== null && product.cost > 0 && product.conversions > 0 && result.profitOrLoss >= 0) {
    return "PERFORMER";
  }
  return "NOT_PROMOTED";
}

function classificationReason(
  product: ReportProductInputV2,
  groupKey: V2ProductLabel,
  minimumRoasTarget: number | null,
  clicksPerSaleBenchmark: number | null,
): string | null {
  if (!product.sourceLabel) return "Source classification is missing";
  if (product.sourceLabel === "INSUFFICIENT_DATA") return "Legacy insufficient-data classification has no V2 business claim";

  const result = periodResult({
    spend: product.cost,
    salesVolume: product.conversionValue,
    numberOfSales: product.conversions,
  }, minimumRoasTarget);
  if (groupKey === "UNDERPROMOTED_POTENTIAL") {
    if (minimumRoasTarget === null) return "Opportunity classification requires a minimum ROAS target";
    if (product.conversions < 1) return "Opportunity classification requires at least one sale";
    if (result.roas === null || result.roas < minimumRoasTarget) {
      return "Opportunity classification requires ROAS at or above target";
    }
    return null;
  }
  if (groupKey === "NOT_PROMOTED") {
    if (product.conversions !== 0) return "Insufficient-promotion classification requires zero sales";
    if (clicksPerSaleBenchmark === null) return "Insufficient-promotion classification requires an account benchmark";
    if (product.clicks >= clicksPerSaleBenchmark) {
      return "Insufficient-promotion classification requires clicks below the account benchmark";
    }
    return null;
  }
  if (groupKey === "LOSS_MAKER") {
    if (minimumRoasTarget === null) return "Loss classification requires a minimum ROAS target";
    if (product.cost <= 0) return "Loss classification requires measurable spend";
    if (result.profitOrLoss === null || result.profitOrLoss >= 0) {
      return "Loss classification requires a negative financial result";
    }
    return null;
  }
  if (minimumRoasTarget === null) return "Profitable classification requires a minimum ROAS target";
  if (product.cost <= 0 || product.conversions <= 0) {
    return "Profitable classification requires enough measured evidence";
  }
  if (result.profitOrLoss === null || result.profitOrLoss < 0) {
    return "Profitable classification requires a non-negative financial result";
  }
  return null;
}

function productRow(
  product: ReportProductInputV2,
  groupKey: V2ProductLabel,
  reason: string | null,
  minimumRoasTarget: number | null,
): GoogleAdsReportV2ProductRow {
  const result = periodResult({
    spend: product.cost,
    salesVolume: product.conversionValue,
    numberOfSales: product.conversions,
  }, minimumRoasTarget);
  const loss = productLoss({ spend: product.cost, salesVolume: product.conversionValue }, minimumRoasTarget);
  const clicksPerSale = averageClicksPerSale({ clicks: product.clicks, numberOfSales: product.conversions });
  return {
    ...product,
    groupKey,
    classificationStatus: reason === null ? "VALID" : "QUARANTINED",
    classificationText: reason === null ? "Clasificare valida" : "Clasificare indisponibilă",
    roas: result.roas === null ? unavailable("ROAS is unavailable when spend is zero") : available(result.roas),
    cpa: result.cpa === null ? unavailable("CPA is unavailable when the number of sales is zero") : available(result.cpa),
    clicksPerSale: clicksPerSale === null
      ? unavailable("Clicks per sale is unavailable when the number of sales is zero")
      : available(clicksPerSale),
    financialResult: result.profitOrLoss === null
      ? unavailable("Profitability is unavailable without a minimum ROAS target")
      : available(financialValue(result.profitOrLoss)),
    productLoss: loss === null
      ? unavailable("Product loss is unavailable without a minimum ROAS target")
      : available(Math.max(0, loss)),
    evidenceLabel: result.profitOrLoss === null ? "UNAVAILABLE" : "MEASURED",
  };
}

const GROUP_CONTENT: Record<V2ProductLabel, Pick<GoogleAdsReportV2Group, "title" | "explanation" | "emptyState">> = {
  LOSS_MAKER: {
    title: "Produse care consuma buget",
    explanation: "Aceste produse au cheltuiala masurata si un rezultat financiar sub pragul minim.",
    emptyState: "Niciun produs valid nu consuma buget peste rezultatul permis de tinta.",
  },
  NOT_PROMOTED: {
    title: "Produse care nu au primit suficienta promovare",
    explanation: "Aceste produse nu au vanzari si au mai putine clicuri decat media necesara unei vanzari.",
    emptyState: "Niciun produs valid nu se afla sub pragul de trafic necesar unei vanzari.",
  },
  UNDERPROMOTED_POTENTIAL: {
    title: "Produse cu potential",
    explanation: "Aceste produse au vanzari si un ROAS cel putin egal cu tinta.",
    emptyState: "Niciun produs valid cu potential nu este disponibil in perioada selectata.",
  },
  PERFORMER: {
    title: "Produse profitabile",
    explanation: "Aceste produse au suficiente date si un rezultat financiar cel putin egal cu zero.",
    emptyState: "Niciun produs valid nu a depasit pragul minim de profitabilitate.",
  },
};

function sum(rows: GoogleAdsReportV2ProductRow[], select: (row: GoogleAdsReportV2ProductRow) => number): number {
  return rows.reduce((total, row) => total + select(row), 0);
}

function groupTotals(
  key: V2ProductLabel,
  validRows: GoogleAdsReportV2ProductRow[],
  quarantinedRows: GoogleAdsReportV2ProductRow[],
  minimumRoasTarget: number | null,
): ReportGroupTotals {
  const spend = sum(validRows, (row) => row.cost);
  const salesVolume = sum(validRows, (row) => row.conversionValue);
  const numberOfSales = sum(validRows, (row) => row.conversions);
  const rawProfitOrLoss = minimumRoasTarget === null
    ? null
    : sum(validRows, (row) => row.conversionValue / minimumRoasTarget - row.cost);
  const loss = minimumRoasTarget === null
    ? null
    : sum(validRows, (row) => Math.max(0, row.cost - row.conversionValue / minimumRoasTarget));
  const weightedRoas = key === "UNDERPROMOTED_POTENTIAL" && spend > 0 ? salesVolume / spend : null;
  return {
    productCount: available(validRows.length),
    quarantinedProductCount: available(quarantinedRows.length),
    spend: available(spend),
    salesVolume: available(salesVolume),
    numberOfSales: available(numberOfSales),
    productLoss: loss === null ? unavailable("Product loss is unavailable without a minimum ROAS target") : available(loss),
    profitOrLoss: rawProfitOrLoss === null
      ? unavailable("Profitability is unavailable without a minimum ROAS target")
      : available(rawProfitOrLoss),
    weightedOpportunityRoas: weightedRoas === null
      ? unavailable("Weighted opportunity ROAS is unavailable without measured opportunity spend")
      : available(weightedRoas),
    missedSalesVolume: unavailable("Missed sales volume requires loss and opportunity groups"),
  };
}

function headline(selected: ReportPeriodRow): string {
  if (selected.status === "UNAVAILABLE" || selected.profitOrLoss.status === "UNAVAILABLE") {
    return "Rezultatul de profitabilitate este indisponibil fara tinta minima ROAS.";
  }
  if (selected.profitOrLoss.value.outcome === "LOSS") {
    return "Contul este sub pragul minim de profitabilitate in perioada selectata.";
  }
  if (selected.profitOrLoss.value.outcome === "PROFIT") {
    return "Contul este peste pragul minim de profitabilitate in perioada selectata.";
  }
  return "Contul este exact la pragul minim de profitabilitate in perioada selectata.";
}

export function buildGoogleAdsReportV2(input: GoogleAdsReportV2Input): GoogleAdsReportV2ViewModel {
  const minimumRoasTarget = positiveTarget(input.minimumRoasTarget);
  const maximumCpaTarget = positiveTarget(input.maximumCpaTarget);
  validatePeriod(input.periods.selected);
  if (input.periods.previous) validatePeriod(input.periods.previous);
  if (input.periods.previousYear) validatePeriod(input.periods.previousYear);
  input.products.forEach(validateProduct);

  const totalClicks = input.products.reduce((total, product) => total + product.clicks, 0);
  const totalSales = input.products.reduce((total, product) => total + product.conversions, 0);
  const benchmarkValue = averageClicksPerSale({ clicks: totalClicks, numberOfSales: totalSales });
  const benchmark = benchmarkValue === null
    ? unavailable<number>("Average clicks per sale is unavailable when the number of sales is zero")
    : available(benchmarkValue);

  const diagnostics: ClassificationDiagnostic[] = [];
  const rows = input.products.map((product) => {
    const groupKey = classificationGroup(product, minimumRoasTarget, benchmarkValue);
    const reason = classificationReason(product, groupKey, minimumRoasTarget, benchmarkValue);
    if (reason !== null) {
      diagnostics.push({
        productId: product.productId,
        sourceLabel: product.sourceLabel ?? null,
        assignedGroupKey: groupKey,
        reason,
      });
    }
    return productRow(product, groupKey, reason, minimumRoasTarget);
  });

  const groupOrder: V2ProductLabel[] = [
    "LOSS_MAKER",
    "NOT_PROMOTED",
    "UNDERPROMOTED_POTENTIAL",
    "PERFORMER",
  ];
  const groups = groupOrder.map((key): GoogleAdsReportV2Group => {
    const groupRows = rows.filter((row) => row.groupKey === key);
    const validRows = groupRows.filter((row) => row.classificationStatus === "VALID");
    const quarantinedRows = groupRows.filter((row) => row.classificationStatus === "QUARANTINED");
    return {
      key,
      ...GROUP_CONTENT[key],
      rows: groupRows,
      validRows,
      quarantinedRows,
      totals: groupTotals(key, validRows, quarantinedRows, minimumRoasTarget),
      benchmark: key === "NOT_PROMOTED" || key === "UNDERPROMOTED_POTENTIAL"
        ? benchmark
        : unavailable("Clicks-per-sale benchmark does not apply to this group"),
      totalScope: input.productPopulationStatus,
    };
  });

  const lossGroup = groups[0];
  const notPromotedGroup = groups[1];
  const opportunityGroup = groups[2];
  const simulatedMissedSales = missedSalesVolume({
    lossProductSpend: lossGroup.totals.spend.status === "AVAILABLE" ? lossGroup.totals.spend.value : 0,
    opportunitySpend: opportunityGroup.totals.spend.status === "AVAILABLE" ? opportunityGroup.totals.spend.value : 0,
    opportunitySalesVolume: opportunityGroup.totals.salesVolume.status === "AVAILABLE"
      ? opportunityGroup.totals.salesVolume.value
      : 0,
  });
  opportunityGroup.totals.missedSalesVolume = simulatedMissedSales === null || minimumRoasTarget === null
    ? unavailable("Missed sales volume is unavailable without measured loss and opportunity inputs")
    : available(simulatedMissedSales);

  const selected = availablePeriodRow("SELECTED", input.periods.selected, minimumRoasTarget);
  const selectedFormula = periodResult(input.periods.selected, minimumRoasTarget);
  const conclusions: GoogleAdsReportV2Conclusion[] = [
    {
      key: "MEASURED_PRODUCT_LOSS",
      groupKey: "LOSS_MAKER",
      title: "Pierdere masurata pe produse",
      explanation: "Suma pierderilor produselor valide sub tinta minima ROAS.",
      metric: lossGroup.totals.productLoss,
      evidenceLabel: lossGroup.totals.productLoss.status === "AVAILABLE" ? "MEASURED" : "UNAVAILABLE",
      totalScope: input.productPopulationStatus,
    },
    {
      key: "SIMULATED_MISSED_SALES",
      groupKey: "UNDERPROMOTED_POTENTIAL",
      title: "Volum de vanzari ratat",
      explanation: "Simulare bazata pe bugetul produselor in pierdere si ROAS-ul ponderat al oportunitatilor.",
      metric: opportunityGroup.totals.missedSalesVolume,
      evidenceLabel: opportunityGroup.totals.missedSalesVolume.status === "AVAILABLE" ? "SIMULATED" : "UNAVAILABLE",
      totalScope: input.productPopulationStatus,
    },
    {
      key: "NOT_PROMOTED_PRODUCTS",
      groupKey: "NOT_PROMOTED",
      title: "Produse fara suficienta promovare",
      explanation: "Numarul produselor valide fara vanzari si sub benchmark-ul de trafic al contului.",
      metric: notPromotedGroup.totals.productCount,
      evidenceLabel: "MEASURED",
      totalScope: input.productPopulationStatus,
    },
  ];

  return {
    currencyCode: input.currencyCode ? available(input.currencyCode) : unavailable("Account currency is unavailable"),
    periods: {
      selected,
      previous: input.periods.previous
        ? availablePeriodRow("PREVIOUS", input.periods.previous, minimumRoasTarget)
        : unavailablePeriodRow("PREVIOUS"),
      previousYear: input.periods.previousYear
        ? availablePeriodRow("PREVIOUS_YEAR", input.periods.previousYear, minimumRoasTarget)
        : unavailablePeriodRow("PREVIOUS_YEAR"),
    },
    targets: {
      currentRoas: selectedFormula.roas === null
        ? unavailable("Current ROAS is unavailable when spend is zero")
        : available(selectedFormula.roas),
      minimumRoas: minimumRoasTarget === null
        ? unavailable("Minimum ROAS target is unavailable")
        : available(minimumRoasTarget),
      currentCpa: selectedFormula.cpa === null
        ? unavailable("Current CPA is unavailable when the number of sales is zero")
        : available(selectedFormula.cpa),
      maximumCpa: maximumCpaTarget === null
        ? unavailable("Maximum CPA target is unavailable")
        : available(maximumCpaTarget),
    },
    accountHeadline: headline(selected),
    averageClicksPerSale: benchmark,
    conclusions,
    groups,
    classificationDiagnostics: diagnostics,
    productPopulationStatus: input.productPopulationStatus,
  };
}
