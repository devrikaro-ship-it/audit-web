export type ReportDateRange = {
  from: string;
  to: string;
};

export type ReportPeriodRanges = {
  selected: ReportDateRange;
  previous: ReportDateRange;
  previousYear: ReportDateRange;
};

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(value: string): Date {
  const match = ISO_DATE.exec(value);
  if (!match) throw new RangeError("Invalid report date range");
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new RangeError("Invalid report date range");
  }
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDate(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function previousCalendarYear(date: Date): Date {
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function comparisonRanges(selected: ReportDateRange): ReportPeriodRanges {
  const selectedFrom = parseDate(selected.from);
  const selectedTo = parseDate(selected.to);
  if (selectedFrom.getTime() > selectedTo.getTime()) {
    throw new RangeError("Invalid report date range");
  }

  const inclusiveDays = (selectedTo.getTime() - selectedFrom.getTime()) / DAY_MS + 1;
  const previousTo = shiftDate(selectedFrom, -1);
  const previousFrom = shiftDate(previousTo, -(inclusiveDays - 1));

  return {
    selected: { from: formatDate(selectedFrom), to: formatDate(selectedTo) },
    previous: { from: formatDate(previousFrom), to: formatDate(previousTo) },
    previousYear: {
      from: formatDate(previousCalendarYear(selectedFrom)),
      to: formatDate(previousCalendarYear(selectedTo)),
    },
  };
}
