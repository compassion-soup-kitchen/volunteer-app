/**
 * The monthly summary export — the numbers the kitchen puts in its board
 * reporting, laid out to mirror the reports dashboard.
 *
 * The shaping and CSV rendering are pure so they can be tested without a
 * database; report-actions.ts does the querying.
 */

/** The key of the seeded induction training type — see training-types.ts. */
export const INDUCTION_TYPE_KEY = "INDUCTION";

export type MonthlySummaryArea = {
  serviceAreaName: string;
  /** Distinct volunteers who attended at least one shift in this area. */
  volunteersAttended: number;
  shifts: number;
  hours: number;
  attendanceRate: number;
};

export type MonthlySummary = {
  /** Inclusive period, as `YYYY-MM-DD`, or null when unbounded. */
  fromDate: string | null;
  toDate: string | null;
  serviceAreaName: string | null;
  newVolunteers: number;
  inductionsCompleted: number;
  volunteersAttended: number;
  totalHours: number;
  totalShifts: number;
  attendanceRate: number;
  byArea: MonthlySummaryArea[];
};

/** Wraps a cell so commas, quotes and newlines survive the round trip. */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

function formatPeriod(from: string | null, to: string | null): string {
  if (!from && !to) return "All time";
  if (from && to) return `${from} to ${to}`;
  return from ? `From ${from}` : `Up to ${to}`;
}

/**
 * Renders the summary as one CSV.
 *
 * Sectioned rather than a single flat table: the overview is a handful of
 * headline figures and the per-area breakdown is a real table, and forcing
 * both into one header row would make neither readable in a spreadsheet.
 */
export function buildMonthlySummaryCsv(summary: MonthlySummary): string {
  const lines: string[] = [];

  lines.push(csvRow(["Te Pūaroha — Volunteer summary"]));
  lines.push(csvRow(["Period", formatPeriod(summary.fromDate, summary.toDate)]));
  lines.push(
    csvRow(["Service area", summary.serviceAreaName ?? "All service areas"])
  );
  lines.push("");

  lines.push(csvRow(["Overview"]));
  lines.push(csvRow(["Metric", "Value"]));
  lines.push(csvRow(["New volunteers", summary.newVolunteers]));
  lines.push(csvRow(["Inductions completed", summary.inductionsCompleted]));
  lines.push(csvRow(["Volunteers who attended", summary.volunteersAttended]));
  lines.push(csvRow(["Shifts run", summary.totalShifts]));
  lines.push(csvRow(["Total hours", summary.totalHours]));
  lines.push(csvRow(["Attendance rate (%)", summary.attendanceRate]));
  lines.push("");

  lines.push(csvRow(["By service area"]));
  lines.push(
    csvRow([
      "Service area",
      "Volunteers attended",
      "Shifts run",
      "Total hours",
      "Attendance rate (%)",
    ])
  );

  if (summary.byArea.length === 0) {
    lines.push(csvRow(["No shift activity in this period"]));
  } else {
    for (const area of summary.byArea) {
      lines.push(
        csvRow([
          area.serviceAreaName,
          area.volunteersAttended,
          area.shifts,
          area.hours,
          area.attendanceRate,
        ])
      );
    }
  }

  return lines.join("\n");
}

/** `volunteer-summary-2026-07-01-to-2026-07-31.csv` */
export function monthlySummaryFileName(summary: MonthlySummary): string {
  const { fromDate, toDate } = summary;
  if (fromDate && toDate) {
    return `volunteer-summary-${fromDate}-to-${toDate}.csv`;
  }
  if (fromDate) return `volunteer-summary-from-${fromDate}.csv`;
  if (toDate) return `volunteer-summary-to-${toDate}.csv`;
  return "volunteer-summary-all-time.csv";
}
