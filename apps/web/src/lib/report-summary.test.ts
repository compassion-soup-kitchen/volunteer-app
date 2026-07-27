import { describe, expect, it } from "vitest";

import {
  buildMonthlySummaryCsv,
  monthlySummaryFileName,
  type MonthlySummary,
} from "./report-summary";

const summary: MonthlySummary = {
  fromDate: "2026-07-01",
  toDate: "2026-07-31",
  serviceAreaName: null,
  newVolunteers: 7,
  inductionsCompleted: 5,
  volunteersAttended: 23,
  totalHours: 184.5,
  totalShifts: 42,
  attendanceRate: 91,
  byArea: [
    {
      serviceAreaName: "Kitchen & Meals",
      volunteersAttended: 18,
      shifts: 24,
      hours: 96,
      attendanceRate: 94,
    },
    {
      serviceAreaName: "Community Garden",
      volunteersAttended: 6,
      shifts: 8,
      hours: 32.5,
      attendanceRate: 88,
    },
  ],
};

/** Parses a CSV cell back out, for asserting on values rather than quoting. */
function cellsOf(line: string): string[] {
  return (line.match(/"(?:[^"]|"")*"/g) ?? []).map((cell) =>
    cell.slice(1, -1).replace(/""/g, '"')
  );
}

describe("buildMonthlySummaryCsv", () => {
  const lines = buildMonthlySummaryCsv(summary).split("\n");

  it("carries every figure Sam asked for", () => {
    const csv = buildMonthlySummaryCsv(summary);
    expect(csv).toContain("New volunteers");
    expect(csv).toContain("Inductions completed");
    expect(csv).toContain("Volunteers who attended");
    expect(csv).toContain("Total hours");
  });

  it("states the reporting period", () => {
    expect(cellsOf(lines[1])).toEqual([
      "Period",
      "2026-07-01 to 2026-07-31",
    ]);
  });

  it("says all areas when no service area is filtered", () => {
    expect(cellsOf(lines[2])).toEqual(["Service area", "All service areas"]);
  });

  it("names the service area when one is filtered", () => {
    const filtered = buildMonthlySummaryCsv({
      ...summary,
      serviceAreaName: "Kitchen & Meals",
    });
    expect(filtered).toContain("Kitchen & Meals");
  });

  it("puts each service area on its own row", () => {
    const csv = buildMonthlySummaryCsv(summary);
    const kitchen = csv
      .split("\n")
      .find((line) => line.startsWith('"Kitchen & Meals"'));
    expect(cellsOf(kitchen!)).toEqual([
      "Kitchen & Meals",
      "18",
      "24",
      "96",
      "94",
    ]);
  });

  it("notes when there was no activity at all", () => {
    const csv = buildMonthlySummaryCsv({ ...summary, byArea: [] });
    expect(csv).toContain("No shift activity in this period");
  });

  it("describes an unbounded period as all time", () => {
    const csv = buildMonthlySummaryCsv({
      ...summary,
      fromDate: null,
      toDate: null,
    });
    expect(csv).toContain("All time");
  });

  it("describes a half-open period", () => {
    expect(
      buildMonthlySummaryCsv({ ...summary, toDate: null })
    ).toContain("From 2026-07-01");
    expect(
      buildMonthlySummaryCsv({ ...summary, fromDate: null })
    ).toContain("Up to 2026-07-31");
  });

  // A service area named with a comma would otherwise split into two columns.
  it("escapes commas and quotes in area names", () => {
    const csv = buildMonthlySummaryCsv({
      ...summary,
      byArea: [
        {
          serviceAreaName: 'Outreach, "street" team',
          volunteersAttended: 3,
          shifts: 4,
          hours: 12,
          attendanceRate: 100,
        },
      ],
    });
    const row = csv.split("\n").find((line) => line.includes("Outreach"));
    expect(cellsOf(row!)[0]).toBe('Outreach, "street" team');
  });

  it("keeps the overview and the breakdown in separate sections", () => {
    const csv = buildMonthlySummaryCsv(summary);
    expect(csv.indexOf('"Overview"')).toBeLessThan(
      csv.indexOf('"By service area"')
    );
    expect(csv).toContain("\n\n");
  });
});

describe("monthlySummaryFileName", () => {
  it("names the file after the period", () => {
    expect(monthlySummaryFileName(summary)).toBe(
      "volunteer-summary-2026-07-01-to-2026-07-31.csv"
    );
  });

  it("handles an unbounded period", () => {
    expect(
      monthlySummaryFileName({ ...summary, fromDate: null, toDate: null })
    ).toBe("volunteer-summary-all-time.csv");
  });

  it("handles a half-open period", () => {
    expect(monthlySummaryFileName({ ...summary, toDate: null })).toBe(
      "volunteer-summary-from-2026-07-01.csv"
    );
  });
});
