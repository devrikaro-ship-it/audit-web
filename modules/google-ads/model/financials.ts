export const OPERATING_COST_PCT = 20;

export type BreakEvenInput = {
  averageOrderValue: number;
  goodsCost: number;
};

export type BreakEvenFinancials = {
  averageOrderValue: number;
  goodsCost: number;
  grossMarginPct: number;
  operatingCostPct: number;
  operatingCost: number;
  breakEvenCpa: number;
  breakEvenRoas: number;
};

export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenFinancials {
  const { averageOrderValue, goodsCost } = input;
  if (!Number.isFinite(averageOrderValue) || averageOrderValue <= 0) {
    throw new RangeError("Average order value must be greater than zero");
  }
  if (!Number.isFinite(goodsCost) || goodsCost < 0 || goodsCost > averageOrderValue) {
    throw new RangeError("Goods cost must be between zero and average order value");
  }

  const operatingCost = averageOrderValue * (OPERATING_COST_PCT / 100);
  const breakEvenCpa = averageOrderValue - goodsCost - operatingCost;
  if (breakEvenCpa <= 0) {
    throw new RangeError("No contribution remains available for advertising");
  }

  return {
    averageOrderValue,
    goodsCost,
    grossMarginPct: ((averageOrderValue - goodsCost) / averageOrderValue) * 100,
    operatingCostPct: OPERATING_COST_PCT,
    operatingCost,
    breakEvenCpa,
    breakEvenRoas: averageOrderValue / breakEvenCpa,
  };
}
