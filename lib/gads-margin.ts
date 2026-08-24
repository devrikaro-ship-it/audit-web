export const GROSS_MARGIN_ERROR = "marja trebuie sa fie intre 1 si 99 la suta";
export const GROSS_MARGIN_MIN = 1;
export const GROSS_MARGIN_MAX = 99;
export const GROSS_MARGIN_STEP = 0.1;

export function parseGrossMargin(value: unknown): number | null {
  const normalized = typeof value === "string" ? value.trim() : value;
  const candidate = typeof normalized === "string" && /^\d+(?:[.,]\d+)?$/.test(normalized)
    ? Number(normalized.replace(",", "."))
    : normalized;
  return typeof candidate === "number" && Number.isFinite(candidate) && candidate >= GROSS_MARGIN_MIN && candidate <= GROSS_MARGIN_MAX
    ? candidate
    : null;
}

export function requireGrossMargin(value: unknown): number {
  const margin = parseGrossMargin(value);
  if (margin === null) throw new RangeError(GROSS_MARGIN_ERROR);
  return margin;
}
