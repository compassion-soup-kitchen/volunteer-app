import { describe, expect, it } from "vitest";

import {
  attendanceDue,
  groupByDay,
  needsPeople,
  parseDayParam,
  parseWeekParam,
  relativeWeekName,
  rosterWeekHref,
  rosterWeekSummary,
  volunteerShiftHref,
  weekDays,
  weekDistance,
  weekRangeLabel,
  weeksFromNow,
} from "@/lib/roster-week";

// Wednesday 21 October 2026; its week runs Monday the 19th to Sunday the 25th.
const today = "2026-10-21";
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("parseWeekParam", () => {
  it("snaps any day to the Monday of its week", () => {
    expect(parseWeekParam("2026-10-21")).toBe("2026-10-19");
    expect(parseWeekParam("2026-10-25")).toBe("2026-10-19");
    expect(parseWeekParam("2026-10-19")).toBe("2026-10-19");
  });

  it("returns null for anything that isn't a calendar day", () => {
    expect(parseWeekParam(undefined)).toBeNull();
    expect(parseWeekParam("")).toBeNull();
    expect(parseWeekParam("2026-13-01")).toBeNull();
    expect(parseWeekParam("next")).toBeNull();
  });
});

describe("weekDays", () => {
  it("lists Monday to Sunday, across a month end", () => {
    expect(weekDays("2026-10-26")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
});

describe("weeksFromNow", () => {
  it("counts whole weeks either side of the current one", () => {
    expect(weeksFromNow("2026-10-19", today)).toBe(0);
    expect(weeksFromNow("2026-11-09", today)).toBe(3);
    expect(weeksFromNow("2026-10-05", today)).toBe(-2);
  });

  it("stays whole across the start of daylight saving", () => {
    // NZ clocks went forward on 27 September; date-only maths must not notice.
    expect(weeksFromNow("2026-09-21", today)).toBe(-4);
  });
});

describe("relativeWeekName / weekDistance", () => {
  it("names the nearest weeks", () => {
    expect(relativeWeekName("2026-10-19", today)).toBe("This week");
    expect(relativeWeekName("2026-10-26", today)).toBe("Next week");
    expect(relativeWeekName("2026-10-12", today)).toBe("Last week");
    expect(relativeWeekName("2026-11-02", today)).toBeNull();
  });

  it("gives the distance further out", () => {
    expect(weekDistance("2026-11-02", today)).toBe("In 2 weeks");
    expect(weekDistance("2026-10-26", today)).toBe("In 1 week");
    expect(weekDistance("2026-10-05", today)).toBe("2 weeks ago");
    expect(weekDistance("2026-10-19", today)).toBe("This week");
  });
});

describe("weekRangeLabel", () => {
  it("names the month once inside one month", () => {
    expect(weekRangeLabel("2026-10-19", today)).toBe("19 – 25 October");
  });

  it("names both months across a month end", () => {
    expect(weekRangeLabel("2026-10-26", today)).toBe("26 October – 1 November");
  });

  it("adds the year once the week leaves this one", () => {
    expect(weekRangeLabel("2026-12-28", today)).toBe(
      "28 December 2026 – 3 January 2027"
    );
    expect(weekRangeLabel("2027-01-04", today)).toBe(
      "4 January 2027 – 10 January 2027"
    );
  });
});

describe("rosterWeekHref", () => {
  it("leaves the current week and every area out of the URL", () => {
    expect(rosterWeekHref("/shifts", "2026-10-19", today)).toBe("/shifts");
  });

  it("carries another week and an area", () => {
    expect(rosterWeekHref("/staff/shifts", "2026-10-26", today, "area-1")).toBe(
      "/staff/shifts?week=2026-10-26&area=area-1"
    );
    expect(rosterWeekHref("/shifts", "2026-10-19", today, "area-1")).toBe(
      "/shifts?area=area-1"
    );
  });
});

describe("volunteerShiftHref", () => {
  it("opens the shift's week at its day", () => {
    expect(volunteerShiftHref(day("2026-10-29"), today)).toBe(
      "/shifts?week=2026-10-26&day=2026-10-29"
    );
    expect(volunteerShiftHref(day("2026-10-23"), today)).toBe(
      "/shifts?day=2026-10-23"
    );
  });
});

describe("parseDayParam", () => {
  it("accepts a day inside the week shown", () => {
    expect(parseDayParam("2026-10-25", "2026-10-19")).toBe("2026-10-25");
  });

  it("ignores a day outside it, or not a day at all", () => {
    expect(parseDayParam("2026-10-26", "2026-10-19")).toBeNull();
    expect(parseDayParam("soon", "2026-10-19")).toBeNull();
    expect(parseDayParam(undefined, "2026-10-19")).toBeNull();
  });
});

describe("groupByDay", () => {
  it("keeps every day, in order, with its shifts in theirs", () => {
    const shifts = [
      { id: "a", date: day("2026-10-20") },
      { id: "b", date: day("2026-10-20") },
      { id: "c", date: day("2026-10-24") },
      // Outside the week - dropped rather than misfiled.
      { id: "d", date: day("2026-10-27") },
    ];
    const grouped = groupByDay(shifts, weekDays("2026-10-19"));
    expect(grouped.map((d) => d.date)).toEqual(weekDays("2026-10-19"));
    expect(grouped[1].shifts.map((s) => s.id)).toEqual(["a", "b"]);
    expect(grouped[5].shifts.map((s) => s.id)).toEqual(["c"]);
    expect(grouped.flatMap((d) => d.shifts).map((s) => s.id)).not.toContain("d");
  });
});

describe("needsPeople / rosterWeekSummary", () => {
  const shifts = [
    // Monday, gone: a gap there can't be filled any more.
    { date: day("2026-10-19"), capacity: 6, filled: 2 },
    // Today, short.
    { date: day("2026-10-21"), capacity: 6, filled: 5 },
    // Friday, full.
    { date: day("2026-10-23"), capacity: 4, filled: 4 },
    // Saturday, overbooked by staff rostering - counts as full, not extra.
    { date: day("2026-10-24"), capacity: 2, filled: 3 },
  ];

  it("only counts gaps still to come", () => {
    expect(shifts.map((shift) => needsPeople(shift, today))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it("totals the week", () => {
    expect(rosterWeekSummary(shifts, today)).toEqual({
      shifts: 4,
      filled: 2 + 5 + 4 + 2,
      capacity: 18,
      needPeople: 1,
    });
  });
});

describe("attendanceDue", () => {
  it("flags a past shift with someone never marked", () => {
    expect(
      attendanceDue(
        { date: day("2026-10-20"), signups: [{ status: "ATTENDED" }, { status: "SIGNED_UP" }] },
        today
      )
    ).toBe(true);
  });

  it("leaves today, the future and a fully marked shift alone", () => {
    expect(
      attendanceDue({ date: day("2026-10-21"), signups: [{ status: "SIGNED_UP" }] }, today)
    ).toBe(false);
    expect(
      attendanceDue({ date: day("2026-10-20"), signups: [{ status: "ATTENDED" }] }, today)
    ).toBe(false);
    expect(attendanceDue({ date: day("2026-10-20"), signups: [] }, today)).toBe(false);
  });
});
