import { describe, expect, it } from "vitest";

import {
  describePatternSpan,
  describeRecurrence,
  diffRegulars,
  endsOnError,
  isPatternRunning,
  patternStoppedNotice,
  regularWelcomeNotice,
  materialisationWindow,
  patternDatesBetween,
  PATTERN_HORIZON_DAYS,
  regularsToSeat,
  shiftPatternInput,
  shiftPatternUpdateInput,
  startsOnError,
  weekdayOf,
  type PatternSchedule,
} from "./shift-patterns";

/** Reference points: 2026-08-03 is a Monday, 2026-08-05 a Wednesday. */
const MONDAY = "2026-08-03";
const WEDNESDAY = "2026-08-05";

const weekly = (weekdays: number[], extra: Partial<PatternSchedule> = {}): PatternSchedule => ({
  weekdays,
  interval: 1,
  startsOn: MONDAY,
  endsOn: null,
  ...extra,
});

describe("weekdayOf", () => {
  it("indexes from Sunday", () => {
    expect(weekdayOf("2026-08-02")).toBe(0);
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(WEDNESDAY)).toBe(3);
  });
});

describe("patternDatesBetween", () => {
  it("lists a month of Monday breakfasts", () => {
    expect(patternDatesBetween(weekly([1]), MONDAY, "2026-08-31")).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
  });

  it("interleaves several weekdays in date order", () => {
    expect(patternDatesBetween(weekly([4, 1]), MONDAY, "2026-08-14")).toEqual([
      "2026-08-03",
      "2026-08-06",
      "2026-08-10",
      "2026-08-13",
    ]);
  });

  it("starts on the first matching day, not the start date itself", () => {
    const dates = patternDatesBetween(
      weekly([1], { startsOn: WEDNESDAY }),
      WEDNESDAY,
      "2026-08-20"
    );
    expect(dates[0]).toBe("2026-08-10");
  });

  it("never reaches before the pattern starts, whatever window is asked", () => {
    expect(
      patternDatesBetween(weekly([1], { startsOn: "2026-08-10" }), MONDAY, "2026-08-17")
    ).toEqual(["2026-08-10", "2026-08-17"]);
  });

  it("stops at the pattern's last day", () => {
    expect(
      patternDatesBetween(weekly([1], { endsOn: "2026-08-12" }), MONDAY, "2026-08-31")
    ).toEqual(["2026-08-03", "2026-08-10"]);
  });

  it("honours a fortnightly interval", () => {
    expect(
      patternDatesBetween(weekly([1], { interval: 2 }), MONDAY, "2026-09-14")
    ).toEqual(["2026-08-03", "2026-08-17", "2026-08-31", "2026-09-14"]);
  });

  it("anchors the interval to the start's week, not the first match", () => {
    expect(
      patternDatesBetween(
        weekly([1], { interval: 2, startsOn: WEDNESDAY }),
        WEDNESDAY,
        "2026-09-14"
      )
    ).toEqual(["2026-08-17", "2026-08-31", "2026-09-14"]);
  });

  // The roster is topped up a window at a time; a fortnightly pattern must
  // land on the same weeks however the windows fall.
  it("keeps a fortnightly rhythm across separately generated windows", () => {
    const pattern = weekly([1], { interval: 2 });
    const first = patternDatesBetween(pattern, MONDAY, "2026-08-20");
    const second = patternDatesBetween(pattern, "2026-08-21", "2026-09-20");
    expect([...first, ...second]).toEqual(
      patternDatesBetween(pattern, MONDAY, "2026-09-20")
    );
    expect(second).toEqual(["2026-08-31", "2026-09-14"]);
  });

  it("crosses a year boundary cleanly", () => {
    expect(
      patternDatesBetween(weekly([1], { startsOn: "2026-12-28" }), "2026-12-28", "2027-01-11")
    ).toEqual(["2026-12-28", "2027-01-04", "2027-01-11"]);
  });

  it("returns nothing for an empty window", () => {
    expect(patternDatesBetween(weekly([1]), "2026-08-10", "2026-08-09")).toEqual([]);
  });
});

describe("materialisationWindow", () => {
  const today = "2026-10-13";
  const horizon = "2027-01-05"; // today + 84

  it("generates from the start through the horizon the first time", () => {
    expect(
      materialisationWindow(
        { startsOn: "2026-10-19", endsOn: null, generatedThrough: null },
        today
      )
    ).toEqual({ from: "2026-10-19", to: horizon });
  });

  it("never generates behind today", () => {
    expect(
      materialisationWindow(
        { startsOn: "2026-01-05", endsOn: null, generatedThrough: null },
        today
      )
    ).toEqual({ from: today, to: horizon });
  });

  it("picks up the day after it last generated through", () => {
    expect(
      materialisationWindow(
        { startsOn: "2026-08-03", endsOn: null, generatedThrough: "2027-01-01" },
        today
      )
    ).toEqual({ from: "2027-01-02", to: horizon });
  });

  it("has nothing to do once it reaches the horizon", () => {
    expect(
      materialisationWindow(
        { startsOn: "2026-08-03", endsOn: null, generatedThrough: horizon },
        today
      )
    ).toBeNull();
  });

  it("stops at the end date", () => {
    expect(
      materialisationWindow(
        { startsOn: "2026-10-19", endsOn: "2026-12-18", generatedThrough: null },
        today
      )
    ).toEqual({ from: "2026-10-19", to: "2026-12-18" });
  });

  it("has nothing to do for a pattern that has ended", () => {
    expect(
      materialisationWindow(
        { startsOn: "2026-08-03", endsOn: "2026-10-01", generatedThrough: "2026-10-01" },
        today
      )
    ).toBeNull();
  });

  it("defaults to a twelve-week horizon", () => {
    expect(PATTERN_HORIZON_DAYS).toBe(84);
  });
});

describe("isPatternRunning", () => {
  it("runs while it has days to come", () => {
    expect(isPatternRunning({ endsOn: null }, "2026-10-13")).toBe(true);
    expect(isPatternRunning({ endsOn: "2026-10-13" }, "2026-10-13")).toBe(true);
    expect(isPatternRunning({ endsOn: "2026-10-12" }, "2026-10-13")).toBe(false);
  });
});

describe("shiftPatternInput", () => {
  const valid = {
    serviceAreaId: "area_1",
    weekdays: [1],
    interval: 1,
    startTime: "07:00",
    endTime: "10:00",
    startsOn: "2026-10-19",
    capacity: 6,
    endsOn: null,
    regularIds: ["vol_david"],
  };

  it("accepts an ongoing Monday breakfast with one regular", () => {
    expect(shiftPatternInput.safeParse(valid).success).toBe(true);
  });

  it("needs at least one weekday", () => {
    expect(shiftPatternInput.safeParse({ ...valid, weekdays: [] }).success).toBe(false);
  });

  it("rejects a weekday out of range", () => {
    expect(shiftPatternInput.safeParse({ ...valid, weekdays: [7] }).success).toBe(false);
  });

  it("rejects an end time before the start", () => {
    expect(
      shiftPatternInput.safeParse({ ...valid, endTime: "06:00" }).success
    ).toBe(false);
  });

  it("rejects an end day before the first day", () => {
    expect(
      shiftPatternInput.safeParse({ ...valid, endsOn: "2026-10-18" }).success
    ).toBe(false);
  });

  it("refuses more regulars than places", () => {
    const result = shiftPatternInput.safeParse({
      ...valid,
      capacity: 1,
      regularIds: ["a", "b"],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/more regulars than places/);
  });

  it("rejects the same regular twice", () => {
    expect(
      shiftPatternInput.safeParse({ ...valid, regularIds: ["a", "a"] }).success
    ).toBe(false);
  });

  it.each([0, 5])("rejects the interval %i", (interval) => {
    expect(shiftPatternInput.safeParse({ ...valid, interval }).success).toBe(false);
  });
});

describe("shiftPatternUpdateInput", () => {
  it("applies the capacity rule to an edit too", () => {
    expect(
      shiftPatternUpdateInput.safeParse({
        capacity: 1,
        endsOn: null,
        regularIds: ["a", "b"],
      }).success
    ).toBe(false);
  });
});

describe("startsOnError / endsOnError", () => {
  it("refuses a first day in the past", () => {
    expect(startsOnError("2026-10-12", "2026-10-13")).toMatch(/past/);
    expect(startsOnError("2026-10-13", "2026-10-13")).toBeNull();
  });

  it("refuses a last day in the past, but not an ongoing pattern", () => {
    expect(endsOnError("2026-10-12", "2026-10-13")).toMatch(/past/);
    expect(endsOnError(null, "2026-10-13")).toBeNull();
    expect(endsOnError("2026-10-13", "2026-10-13")).toBeNull();
  });
});

describe("diffRegulars", () => {
  it("reports who joined and who left", () => {
    expect(diffRegulars(["a", "b"], ["b", "c"])).toEqual({
      added: ["c"],
      removed: ["a"],
    });
  });
});

describe("regularsToSeat", () => {
  it("seats regulars into free places", () => {
    expect(
      regularsToSeat({
        capacity: 3,
        seatedVolunteerIds: ["x"],
        signupVolunteerIds: ["x"],
        regularIds: ["a", "b"],
      })
    ).toEqual(["a", "b"]);
  });

  it("only takes the places left", () => {
    expect(
      regularsToSeat({
        capacity: 2,
        seatedVolunteerIds: ["x"],
        signupVolunteerIds: ["x"],
        regularIds: ["a", "b"],
      })
    ).toEqual(["a"]);
  });

  it("leaves alone a regular who already has a row, even a cancelled one", () => {
    expect(
      regularsToSeat({
        capacity: 4,
        seatedVolunteerIds: [],
        signupVolunteerIds: ["a"],
        regularIds: ["a", "b"],
      })
    ).toEqual(["b"]);
  });
});

describe("describeRecurrence", () => {
  it.each([
    [[1], 1, "Every Monday"],
    [[1], 2, "Every other Monday"],
    [[6], 3, "Every 3 weeks on Saturday"],
    [[4, 2], 1, "Every Tuesday and Thursday"],
    [[1, 3, 5], 1, "Every Mon, Wed and Fri"],
    [[0, 1, 2, 3, 4, 5, 6], 1, "Every day"],
  ])("describes %j every %i week(s)", (weekdays, interval, expected) => {
    expect(describeRecurrence(weekdays, interval)).toBe(expected);
  });

  it("puts Sunday last, as the week is laid out", () => {
    expect(describeRecurrence([0, 6], 1)).toBe("Every Saturday and Sunday");
  });
});

describe("describePatternSpan", () => {
  it.each([
    [null, "Ongoing"],
    ["2026-12-18", "Until Fri, 18 Dec"],
    ["2026-10-05", "Ended Mon, 5 Oct"],
  ])("describes an end of %s", (endsOn, expected) => {
    expect(describePatternSpan(endsOn, "2026-10-13")).toBe(expected);
  });
});

describe("notices", () => {
  it("welcomes a new regular", () => {
    expect(
      regularWelcomeNotice({
        serviceAreaName: "Breakfast",
        recurrence: "Every Monday",
        timeRange: "7am – 10am",
      })
    ).toEqual({
      title: "You're a regular on Breakfast",
      body: "Every Monday, 7am – 10am. You're on the roster - cancel any week you can't make it.",
    });
  });

  it("explains a stopped shift", () => {
    expect(
      patternStoppedNotice({ serviceAreaName: "Breakfast", dayLabel: "Mon 26 Oct" }).body
    ).toBe(
      "Breakfast on Mon 26 Oct has been taken off the roster. Thank you for being ready to help."
    );
  });
});
