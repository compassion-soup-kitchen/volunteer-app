import { describe, expect, it } from "vitest";
import {
  closeDaysInput,
  closureBlocker,
  closureNotice,
  holidaySuggestions,
  monthGrid,
  monthGridRange,
  parseMonthParam,
} from "./closed-days";

describe("closureBlocker", () => {
  const base = {
    date: "2026-10-26",
    today: "2026-10-13",
    alreadyClosed: false,
    recordedAttendance: 0,
  };

  it("allows a future day with nothing recorded", () => {
    expect(closureBlocker(base)).toBeNull();
  });

  it("allows today, for a closure called at short notice", () => {
    expect(closureBlocker({ ...base, date: "2026-10-13" })).toBeNull();
  });

  it("refuses a day that has passed", () => {
    expect(closureBlocker({ ...base, date: "2026-10-12" })).toMatch(/been and gone/);
  });

  it("refuses a day already closed", () => {
    expect(closureBlocker({ ...base, alreadyClosed: true })).toMatch(/already closed/);
  });

  it("refuses a day whose attendance has been marked", () => {
    expect(closureBlocker({ ...base, recordedAttendance: 2 })).toMatch(
      /Attendance has already been marked/
    );
  });
});

describe("closeDaysInput", () => {
  it("trims the reason", () => {
    const parsed = closeDaysInput.parse([{ date: "2026-10-26", reason: "  Labour Day " }]);
    expect(parsed[0].reason).toBe("Labour Day");
  });

  it("requires a reason, since volunteers are told it", () => {
    expect(closeDaysInput.safeParse([{ date: "2026-10-26", reason: " " }]).success).toBe(false);
  });

  it("rejects a malformed day", () => {
    expect(closeDaysInput.safeParse([{ date: "2026-02-30", reason: "x" }]).success).toBe(false);
  });

  it("rejects the same day twice", () => {
    const result = closeDaysInput.safeParse([
      { date: "2026-10-26", reason: "a" },
      { date: "2026-10-26", reason: "b" },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects an empty request", () => {
    expect(closeDaysInput.safeParse([]).success).toBe(false);
  });
});

describe("holidaySuggestions", () => {
  it("offers the coming year's holidays that aren't closed yet", () => {
    const suggestions = holidaySuggestions({
      today: "2026-10-13",
      closedDates: new Set(["2026-12-25"]),
    });
    expect(suggestions[0]).toEqual({ date: "2026-10-26", name: "Labour Day" });
    expect(suggestions.map((s) => s.date)).not.toContain("2026-12-25");
    expect(suggestions.map((s) => s.date)).toContain("2026-12-28");
    // Twelve months out reaches next winter, so Matariki 2027 is offered.
    expect(suggestions.map((s) => s.name)).toContain("Matariki");
    expect(suggestions.every((s) => s.date >= "2026-10-13")).toBe(true);
  });
});

describe("closureNotice", () => {
  it("names the shift and the reason", () => {
    expect(
      closureNotice({
        reason: "Labour Day",
        serviceAreaName: "Breakfast",
        dayLabel: "Mon 26 Oct",
      })
    ).toEqual({
      title: "Your shift is cancelled - the kitchen is closed",
      body: "Breakfast on Mon 26 Oct is off: Labour Day. Thank you for being ready to help.",
    });
  });
});

describe("monthGrid", () => {
  it("pads October 2026 to whole Monday-first weeks", () => {
    const weeks = monthGrid("2026-10-13");
    // 1 Oct 2026 is a Thursday, 31 Oct a Saturday.
    expect(weeks[0][0]).toEqual({ date: "2026-09-28", inMonth: false });
    expect(weeks[0][3]).toEqual({ date: "2026-10-01", inMonth: true });
    expect(weeks[weeks.length - 1][6]).toEqual({ date: "2026-11-01", inMonth: false });
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks).toHaveLength(5);
  });

  it("needs no padding for a month starting on a Monday and ending on a Sunday", () => {
    // February 2027 starts on a Monday and has exactly four weeks.
    const weeks = monthGrid("2027-02-01");
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
  });

  it("reports the padded range", () => {
    expect(monthGridRange("2026-10-01")).toEqual({
      from: "2026-09-28",
      to: "2026-11-01",
    });
  });
});

describe("parseMonthParam", () => {
  it("reads a year-month", () => {
    expect(parseMonthParam("2026-12")).toBe("2026-12-01");
  });

  it("reads a full day as its month", () => {
    expect(parseMonthParam("2026-12-25")).toBe("2026-12-01");
  });

  it("ignores junk", () => {
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("soon")).toBeNull();
    expect(parseMonthParam(undefined)).toBeNull();
  });
});
