import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { HoursByServiceArea } from "@/lib/report-actions";

import { HoursChart } from "./hours-chart";

function area(name: string, totalHours: number): HoursByServiceArea {
  return {
    serviceAreaId: name.toLowerCase().replace(/\W+/g, "-"),
    serviceAreaName: name,
    totalHours,
    totalShifts: 0,
    uniqueVolunteers: 0,
    attendanceRate: 0,
  };
}

// The dev seed's five areas, in the alphabetical order the report action
// returns them - long enough names that a column chart's x-axis drops some.
const SEED = [
  area("Clothing & Essentials", 0),
  area("Community Garden", 4),
  area("Events & Fundraising", 0),
  area("Kitchen & Meals", 11.25),
  area("Outreach & Advocacy", 0),
];

function rows() {
  return screen.getAllByRole("listitem");
}

describe("HoursChart", () => {
  it("labels every service area, including ones with no hours", () => {
    render(<HoursChart data={SEED} />);
    expect(rows()).toHaveLength(5);
    for (const { serviceAreaName } of SEED) {
      expect(screen.getByText(serviceAreaName)).toBeInTheDocument();
    }
  });

  it("ranks the busiest area first, keeps ties alphabetical, and gives each row its own hours", () => {
    render(<HoursChart data={SEED} />);
    expect(rows().map((row) => row.textContent)).toEqual([
      "Kitchen & Meals11.3h",
      "Community Garden4h",
      "Clothing & Essentials0h",
      "Events & Fundraising0h",
      "Outreach & Advocacy0h",
    ]);
  });

  it("scales bars against the busiest area", () => {
    const { container } = render(<HoursChart data={SEED} />);
    const fills = [...container.querySelectorAll("[aria-hidden] > div")].map(
      (fill) => (fill as HTMLElement).style.width
    );
    expect(fills).toEqual(["100%", `${(4 / 11.25) * 100}%`, "0%", "0%", "0%"]);
  });

  it("draws empty wells rather than dividing by zero when nothing was worked", () => {
    const { container } = render(
      <HoursChart data={[area("Kitchen & Meals", 0), area("Community Garden", 0)]} />
    );
    const fills = [...container.querySelectorAll("[aria-hidden] > div")].map(
      (fill) => (fill as HTMLElement).style.width
    );
    expect(fills).toEqual(["0%", "0%"]);
  });
});
