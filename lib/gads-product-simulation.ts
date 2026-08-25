export const CSS_CPC_REDUCTION_PCT = 20;
export const DIMINISHING_RETURN_RATE = 0.05;
const MIN_QUALIFIED_PURCHASES = 2;
const MAX_ROWS = 20;

export type SimulationProductInput = {
  productId: string;
  title: string;
  cost: number;
  conversionValue: number;
  conversions: number;
  clicks: number;
  impressions: number;
};

export type ProductAnalysisRow = SimulationProductInput & {
  monthlyCost: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  roas: number;
  cpa: number | null;
  monthlyMoneyAtRisk: number;
  estimatedSalesOpportunity: number;
};

export type ProductAnalysis = {
  breakEvenRoas: number;
  months: number;
  currentMonthlySpend: number;
  lossProductMonthlyCap: number;
  economicBudgetLimit: number;
  losses: ProductAnalysisRow[];
  opportunities: ProductAnalysisRow[];
};

export type SimulatedProductRow = ProductAnalysisRow & {
  strategy: "SCALE" | "CAP";
  simulatedCost: number;
  simulatedRevenue: number;
  simulatedOrders: number;
  simulatedCpa: number | null;
  simulatedRoas: number | null;
};

export type BudgetSimulation = {
  budget: number;
  expectedRevenue: number;
  expectedOrders: number;
  expectedRoas: number | null;
  cssCpcReductionPct: number;
  products: SimulatedProductRow[];
};

function rowFor(product: SimulationProductInput, months: number, breakEvenRoas: number): ProductAnalysisRow {
  const monthlyCost = product.cost / months;
  const monthlyRevenue = product.conversionValue / months;
  const monthlyOrders = product.conversions / months;
  const roas = product.cost > 0 ? product.conversionValue / product.cost : 0;
  const cpa = product.conversions > 0 ? product.cost / product.conversions : null;
  return {
    ...product,
    monthlyCost,
    monthlyRevenue,
    monthlyOrders,
    roas,
    cpa,
    monthlyMoneyAtRisk: Math.max(0, monthlyCost - monthlyRevenue / breakEvenRoas),
    estimatedSalesOpportunity: monthlyRevenue * Math.max(0, roas / breakEvenRoas - 1),
  };
}

function simulateRaw(analysis: Omit<ProductAnalysis, "economicBudgetLimit">, requestedBudget: number): BudgetSimulation {
  const budget = Math.max(0, requestedBudget);
  if (budget === 0) {
    return {
      budget: 0,
      expectedRevenue: 0,
      expectedOrders: 0,
      expectedRoas: null,
      cssCpcReductionPct: CSS_CPC_REDUCTION_PCT,
      products: [...analysis.opportunities.map((row) => simulatedZero(row, "SCALE")), ...analysis.losses.map((row) => simulatedZero(row, "CAP"))],
    };
  }

  const cappedLossSpend = Math.min(analysis.lossProductMonthlyCap, budget * 0.05);
  const scalableBudget = Math.max(0, budget - cappedLossSpend);
  const opportunityWeight = analysis.opportunities.reduce((sum, row) => sum + row.estimatedSalesOpportunity, 0);
  const lossWeight = analysis.losses.reduce((sum, row) => sum + row.monthlyCost, 0);

  const scaled = analysis.opportunities.map((row) => {
    const simulatedCost = opportunityWeight > 0 ? scalableBudget * row.estimatedSalesOpportunity / opportunityWeight : 0;
    const baselineCost = Math.max(row.monthlyCost, 1);
    const scaleRatio = simulatedCost / baselineCost;
    const cssAdjustedRoas = row.roas / (1 - CSS_CPC_REDUCTION_PCT / 100);
    const diminishingRoas = cssAdjustedRoas / (1 + DIMINISHING_RETURN_RATE * Math.max(0, scaleRatio - 1));
    const simulatedRevenue = simulatedCost * diminishingRoas;
    const orderValue = row.monthlyOrders > 0 ? row.monthlyRevenue / row.monthlyOrders : 0;
    const simulatedOrders = orderValue > 0 ? simulatedRevenue / orderValue : 0;
    return simulatedRow(row, "SCALE", simulatedCost, simulatedRevenue, simulatedOrders);
  });

  const capped = analysis.losses.map((row) => {
    const simulatedCost = lossWeight > 0 ? cappedLossSpend * row.monthlyCost / lossWeight : 0;
    const simulatedRevenue = simulatedCost * row.roas;
    const orderValue = row.monthlyOrders > 0 ? row.monthlyRevenue / row.monthlyOrders : 0;
    const simulatedOrders = orderValue > 0 ? simulatedRevenue / orderValue : 0;
    return simulatedRow(row, "CAP", simulatedCost, simulatedRevenue, simulatedOrders);
  });

  const products = [...scaled, ...capped];
  const expectedRevenue = products.reduce((sum, row) => sum + row.simulatedRevenue, 0);
  const expectedOrders = products.reduce((sum, row) => sum + row.simulatedOrders, 0);
  return {
    budget,
    expectedRevenue,
    expectedOrders,
    expectedRoas: budget > 0 ? expectedRevenue / budget : null,
    cssCpcReductionPct: CSS_CPC_REDUCTION_PCT,
    products,
  };
}

function simulatedZero(row: ProductAnalysisRow, strategy: "SCALE" | "CAP"): SimulatedProductRow {
  return simulatedRow(row, strategy, 0, 0, 0);
}

function simulatedRow(
  row: ProductAnalysisRow,
  strategy: "SCALE" | "CAP",
  simulatedCost: number,
  simulatedRevenue: number,
  simulatedOrders: number
): SimulatedProductRow {
  return {
    ...row,
    strategy,
    simulatedCost,
    simulatedRevenue,
    simulatedOrders,
    simulatedCpa: simulatedOrders > 0 ? simulatedCost / simulatedOrders : null,
    simulatedRoas: simulatedCost > 0 ? simulatedRevenue / simulatedCost : null,
  };
}

function findEconomicLimit(analysis: Omit<ProductAnalysis, "economicBudgetLimit">): number {
  if (!analysis.opportunities.length || analysis.currentMonthlySpend <= 0) return 0;
  const isWithinBreakEven = (budget: number) => {
    const simulation = simulateRaw(analysis, budget);
    return (
      (simulation.expectedRoas ?? 0) >= analysis.breakEvenRoas &&
      simulation.products
        .filter((row) => row.strategy === "SCALE" && row.simulatedCost > 0)
        .every((row) => (row.simulatedRoas ?? 0) >= analysis.breakEvenRoas)
    );
  };
  let good = 1;
  if (!isWithinBreakEven(good)) return 0;
  let bad = Math.max(2, analysis.currentMonthlySpend);
  while (isWithinBreakEven(bad) && bad < analysis.currentMonthlySpend * 100) {
    good = bad;
    bad *= 2;
  }
  for (let index = 0; index < 40; index++) {
    const midpoint = (good + bad) / 2;
    if (isWithinBreakEven(midpoint)) good = midpoint;
    else bad = midpoint;
  }
  return Math.floor(good);
}

export function analyzeProducts(
  products: SimulationProductInput[],
  options: { breakEvenRoas: number; months: number }
): ProductAnalysis {
  if (!Number.isFinite(options.breakEvenRoas) || options.breakEvenRoas <= 0) throw new RangeError("Invalid break-even ROAS");
  if (!Number.isFinite(options.months) || options.months <= 0) throw new RangeError("Invalid evidence window");
  const rows = products.map((product) => rowFor(product, options.months, options.breakEvenRoas));
  const losses = rows
    .filter((row) => row.monthlyCost > 0 && row.roas < options.breakEvenRoas)
    .sort((left, right) => right.monthlyCost - left.monthlyCost)
    .slice(0, MAX_ROWS);
  const opportunities = rows
    .filter((row) => row.conversions >= MIN_QUALIFIED_PURCHASES && row.roas > options.breakEvenRoas)
    .sort((left, right) => right.estimatedSalesOpportunity - left.estimatedSalesOpportunity)
    .slice(0, MAX_ROWS);
  const base = {
    breakEvenRoas: options.breakEvenRoas,
    months: options.months,
    currentMonthlySpend: rows.reduce((sum, row) => sum + row.monthlyCost, 0),
    lossProductMonthlyCap: losses.reduce((sum, row) => sum + row.monthlyCost, 0) * 0.1,
    losses,
    opportunities,
  };
  return { ...base, economicBudgetLimit: findEconomicLimit(base) };
}

export function simulateOptimizedBudget(analysis: ProductAnalysis, requestedBudget: number): BudgetSimulation {
  return simulateRaw(analysis, Math.min(Math.max(0, requestedBudget), analysis.economicBudgetLimit));
}
