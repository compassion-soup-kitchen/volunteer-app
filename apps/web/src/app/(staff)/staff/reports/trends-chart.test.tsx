import { describe, expect, it } from "vitest";

import type { MonthlyTrend } from "@/lib/report-actions";

import { summarizeTrends } from "./trends-chart";

function month(label: string, hours: number, uniqueVolunteers: number): MonthlyTrend {
  return { month: label, label, hours, shifts: 0, uniqueVolunteers };
}

describe("summarizeTrends", () => {
  it("gives each measure's low, high and latest month, with units", () => {
    expect(
      summarizeTrends([
        month("Aug 2026", 12.25, 3),
        month("Sep 2026", 40, 6),
        month("Oct 2026", 8, 1),
      ])
    ).toBe(
      "Monthly trends, Aug 2026 to Oct 2026. " +
        "Hours given: lowest 8h in Oct 2026, highest 40h in Sep 2026, latest 8h in Oct 2026. " +
        "Volunteers who came: lowest 1 person in Oct 2026, highest 6 people in Sep 2026, latest 1 person in Oct 2026."
    );
  });

  it("keeps the first month on a tie, so the earliest low or high is named", () => {
    expect(summarizeTrends([month("Sep 2026", 5, 2), month("Oct 2026", 5, 2)])).toContain(
      "lowest 5h in Sep 2026, highest 5h in Sep 2026"
    );
  });

  it("just states the figures for a single month", () => {
    expect(summarizeTrends([month("Oct 2026", 3.5, 2)])).toBe(
      "Monthly trends, Oct 2026. Hours given: 3.5h in Oct 2026. Volunteers who came: 2 people in Oct 2026."
    );
  });

  it("says so when there's nothing to show", () => {
    expect(summarizeTrends([])).toBe("No months to show.");
  });
});
