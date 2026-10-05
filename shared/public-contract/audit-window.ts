// The audit's evidence window and its labels: pure values shared by the queries and the report.

/** The primary evidence window contains the latest 365 account-calendar dates. */
export const WINDOW_DAYS = 365;

export function formatAuditWindowLabel(days: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "day",
    unitDisplay: "long",
  }).format(days);
}

/** Legacy Romanian label retained for the excluded collaboration page. */
export const AUDIT_WINDOW_LABEL = `${WINDOW_DAYS} de zile`;

/** English label for public reporting surfaces. */
export const AUDIT_WINDOW_LABEL_ENGLISH = formatAuditWindowLabel(WINDOW_DAYS);

/**
 * Supported catalog-map windows. Short windows answer whether a product sold recently;
 * the 365-day window serves the audit.
 */
export const FERESTRE = [
  { zile: 30, eticheta: "30 days" },
  { zile: 90, eticheta: "3 months" },
  { zile: 180, eticheta: "6 months" },
  { zile: WINDOW_DAYS, eticheta: AUDIT_WINDOW_LABEL_ENGLISH },
] as const;
