import { describe, expect, it } from "vitest";
import { parseDateOnly } from "@/lib/date-only";
import {
  easterSunday,
  nzPublicHolidays,
  nzPublicHolidaysBetween,
} from "./nz-public-holidays";

function asMap(year: number): Record<string, string> {
  return Object.fromEntries(
    nzPublicHolidays(year).map((holiday) => [holiday.name, holiday.date])
  );
}

describe("nzPublicHolidays", () => {
  it("matches the published 2026 calendar", () => {
    expect(nzPublicHolidays(2026)).toEqual([
      { date: "2026-01-01", name: "New Year's Day" },
      { date: "2026-01-02", name: "Day after New Year's Day" },
      { date: "2026-01-19", name: "Wellington Anniversary Day" },
      { date: "2026-02-06", name: "Waitangi Day" },
      { date: "2026-04-03", name: "Good Friday" },
      { date: "2026-04-06", name: "Easter Monday" },
      { date: "2026-04-27", name: "Anzac Day (observed)" },
      { date: "2026-06-01", name: "King's Birthday" },
      { date: "2026-07-10", name: "Matariki" },
      { date: "2026-10-26", name: "Labour Day" },
      { date: "2026-12-25", name: "Christmas Day" },
      { date: "2026-12-28", name: "Boxing Day (observed)" },
    ]);
  });

  it("moves both of a Saturday-Sunday pair to Monday and Tuesday", () => {
    // Christmas 2027 is a Saturday, New Year's Day 2028 too.
    const days = asMap(2027);
    expect(days["Christmas Day (observed)"]).toBe("2027-12-27");
    expect(days["Boxing Day (observed)"]).toBe("2027-12-28");
  });

  it("keeps a Monday Boxing Day and moves a Sunday Christmas to Tuesday", () => {
    const days = asMap(2022);
    expect(days["Boxing Day"]).toBe("2022-12-26");
    expect(days["Christmas Day (observed)"]).toBe("2022-12-27");
  });

  it("moves a Saturday day-after-New-Year to the Monday", () => {
    const days = asMap(2027);
    expect(days["New Year's Day"]).toBe("2027-01-01");
    expect(days["Day after New Year's Day (observed)"]).toBe("2027-01-04");
  });

  it("puts Wellington Anniversary on the Monday nearest 22 January", () => {
    // Thursday 22nd goes back; Friday 22nd goes forward.
    expect(asMap(2026)["Wellington Anniversary Day"]).toBe("2026-01-19");
    expect(asMap(2027)["Wellington Anniversary Day"]).toBe("2027-01-25");
    // Sunday 22nd goes forward a day.
    expect(asMap(2023)["Wellington Anniversary Day"]).toBe("2023-01-23");
    // Monday 22nd stays put.
    expect(asMap(2024)["Wellington Anniversary Day"]).toBe("2024-01-22");
  });

  it("puts every Matariki on a Friday", () => {
    for (let year = 2022; year <= 2052; year++) {
      const matariki = asMap(year)["Matariki"];
      expect(matariki, `Matariki ${year}`).toBeDefined();
      expect(parseDateOnly(matariki).getUTCDay(), `Matariki ${year}`).toBe(5);
    }
  });

  it("leaves Matariki out once the legislated schedule runs out", () => {
    expect(asMap(2053)["Matariki"]).toBeUndefined();
  });

  it("puts Labour Day on the fourth Monday of October", () => {
    expect(asMap(2027)["Labour Day"]).toBe("2027-10-25");
  });
});

describe("easterSunday", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2038, "2038-04-25"],
  ])("finds Easter %i", (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });
});

describe("nzPublicHolidaysBetween", () => {
  it("spans a year boundary", () => {
    expect(
      nzPublicHolidaysBetween("2026-12-20", "2027-01-10").map((h) => h.date)
    ).toEqual(["2026-12-25", "2026-12-28", "2027-01-01", "2027-01-04"]);
  });
});
