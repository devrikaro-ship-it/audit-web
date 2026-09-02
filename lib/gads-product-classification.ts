export type ReportProductInput = {
  productId: string;
  title: string;
  cost: number;
  conversionValue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  catalogEligible?: boolean;
};

export type ProductPerformanceLabel = "LOSS_MAKER" | "NOT_PROMOTED" | "UNDERPROMOTED_POTENTIAL" | "PERFORMER" | "INSUFFICIENT_DATA";

export type ClassifiedReportProduct = ReportProductInput & {
  label: ProductPerformanceLabel;
  roas: number;
  cpa: number | null;
  conversionRate: number | null;
  clicksPerSale: number | null;
  profitabilityGap: number;
  financialImpact: number | null;
  financialImpactKind: "MEASURED_RISK" | "ESTIMATED_OPPORTUNITY" | null;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function classifyReportProducts(products: ReportProductInput[], breakEvenRoas: number, evidenceScale = 1): ClassifiedReportProduct[] {
  const clicksPerSaleBenchmark = median(products
    .filter((row) => row.cost > 0 && row.conversions * evidenceScale >= 2 && row.conversionValue / row.cost >= breakEvenRoas)
    .map((row) => row.clicks / row.conversions)
    .filter(Number.isFinite));

  const priority: Record<ProductPerformanceLabel, number> = { LOSS_MAKER: 0, NOT_PROMOTED: 1, UNDERPROMOTED_POTENTIAL: 2, PERFORMER: 3, INSUFFICIENT_DATA: 4 };
  return products.map((row) => {
    const roas = row.cost > 0 ? row.conversionValue / row.cost : 0;
    const clicksPerSale = row.conversions > 0 ? row.clicks / row.conversions : null;
    let label: ProductPerformanceLabel;
    if (row.cost > 0 && roas < breakEvenRoas) label = "LOSS_MAKER";
    else if (row.catalogEligible === true && row.impressions === 0) label = "NOT_PROMOTED";
    else if (row.cost > 0 && roas >= breakEvenRoas && clicksPerSaleBenchmark !== null && row.clicks < clicksPerSaleBenchmark) label = "UNDERPROMOTED_POTENTIAL";
    else if (row.cost > 0 && roas >= breakEvenRoas) label = "PERFORMER";
    else label = "INSUFFICIENT_DATA";
    const measuredRisk = label === "LOSS_MAKER" ? Math.max(0, row.cost - row.conversionValue / breakEvenRoas) : null;
    const estimatedOpportunity = label === "UNDERPROMOTED_POTENTIAL" && clicksPerSaleBenchmark !== null && row.conversions > 0
      ? Math.max(0, (clicksPerSaleBenchmark - row.clicks) / clicksPerSaleBenchmark) * (row.conversionValue / row.conversions)
      : null;
    const financialImpactKind: ClassifiedReportProduct["financialImpactKind"] = measuredRisk !== null
      ? "MEASURED_RISK"
      : estimatedOpportunity !== null ? "ESTIMATED_OPPORTUNITY" : null;
    return {
      ...row, label, roas,
      cpa: row.conversions > 0 ? row.cost / row.conversions : null,
      conversionRate: row.clicks > 0 ? row.conversions / row.clicks : null,
      clicksPerSale,
      profitabilityGap: roas - breakEvenRoas,
      financialImpact: measuredRisk ?? estimatedOpportunity,
      financialImpactKind,
    };
  }).sort((left, right) => priority[left.label] - priority[right.label] || right.cost - left.cost);
}
