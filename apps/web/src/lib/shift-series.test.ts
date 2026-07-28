import { describe, expect, it } from "vitest";

import {
  expandRecurrence,
  MAX_SERIES_SHIFTS,
  partitionExistingDates,
  summariseSeriesResult,
  weekdayOf,
} from "./shift-series";

/** Reference points: 2026-08-03 is a Monday, 2026-08-05 a Wednesday. */
const MONDAY = "2026-08-03";
const WEDNESDAY = "2026-08-05";

const expand = (input: Parameters<typeof expandRecurrence>[0]) => {
  const result = expandRecurrence(input);
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
  return result.dates;
};

describe("weekdayOf", () => {
  it("indexes from Sunday", () => {
    expect(weekdayOf("2026-08-02")).toBe(0); // Sunday
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(WEDNESDAY)).toBe(3);
  });
});

describe("expandRecurrence", () => {
  it("returns just the start date when no weekdays are chosen", () => {
    expect(
      expand({ startDate: MONDAY, endDate: "2026-08-31", weekdays: [] })
    ).toEqual([MONDAY]);
  });

  it("expands a month of Monday breakfasts", () => {
    expect(
      expand({ startDate: MONDAY, endDate: "2026-08-31", weekdays: [1] })
    ).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
  });

  it("interleaves several weekdays in date order", () => {
    expect(
      expand({ startDate: MONDAY, endDate: "2026-08-14", weekdays: [4, 1] })
    ).toEqual([
      "2026-08-03", // Mon
      "2026-08-06", // Thu
      "2026-08-10", // Mon
      "2026-08-13", // Thu
    ]);
  });

  // Picking "Mondays" from a Wednesday should start the following Monday, not
  // drag the Wednesday in just because it's the start of the range.
  it("skips a start date that isn't on a selected weekday", () => {
    const dates = expand({
      startDate: WEDNESDAY,
      endDate: "2026-08-20",
      weekdays: [1],
    });
    expect(dates[0]).toBe("2026-08-10");
    expect(dates).not.toContain(WEDNESDAY);
  });

  it("includes the end date when it lands on a selected weekday", () => {
    const dates = expand({
      startDate: MONDAY,
      endDate: "2026-08-10",
      weekdays: [1],
    });
    expect(dates).toContain("2026-08-10");
  });

  it("honours a fortnightly interval", () => {
    expect(
      expand({
        startDate: MONDAY,
        endDate: "2026-09-14",
        weekdays: [1],
        interval: 2,
      })
    ).toEqual(["2026-08-03", "2026-08-17", "2026-08-31", "2026-09-14"]);
  });

  it("anchors the interval to the start date's week, not the first match", () => {
    // Starting on a Wednesday and repeating Mondays fortnightly: the first
    // Monday is in the *following* week, so it is skipped by the interval.
    const dates = expand({
      startDate: WEDNESDAY,
      endDate: "2026-09-14",
      weekdays: [1],
      interval: 2,
    });
    expect(dates).toEqual(["2026-08-17", "2026-08-31", "2026-09-14"]);
  });

  it("deduplicates repeated weekdays", () => {
    expect(
      expand({ startDate: MONDAY, endDate: "2026-08-17", weekdays: [1, 1, 1] })
    ).toEqual(["2026-08-03", "2026-08-10", "2026-08-17"]);
  });

  it("handles a single-day range", () => {
    expect(
      expand({ startDate: MONDAY, endDate: MONDAY, weekdays: [1] })
    ).toEqual([MONDAY]);
  });

  it("crosses a month and a year boundary cleanly", () => {
    const dates = expand({
      startDate: "2026-12-28", // Monday
      endDate: "2027-01-11",
      weekdays: [1],
    });
    expect(dates).toEqual(["2026-12-28", "2027-01-04", "2027-01-11"]);
  });

  describe("rejections", () => {
    it("rejects an end date before the start", () => {
      expect(
        expandRecurrence({
          startDate: "2026-08-10",
          endDate: MONDAY,
          weekdays: [1],
        })
      ).toMatchObject({ ok: false });
    });

    it("rejects a malformed start date", () => {
      expect(
        expandRecurrence({ startDate: "nope", endDate: MONDAY, weekdays: [] })
      ).toMatchObject({ ok: false });
    });

    // The mirrored branch: an end date is validated just as strictly.
    it("rejects a malformed end date", () => {
      expect(
        expandRecurrence({ startDate: MONDAY, endDate: "nope", weekdays: [] })
      ).toMatchObject({ ok: false });
    });

    // Later than the start date, so this can only be caught by the calendar
    // check rather than the ordering one — September has 30 days.
    it("rejects a date that looks well-formed but does not exist", () => {
      expect(
        expandRecurrence({
          startDate: MONDAY,
          endDate: "2026-09-31",
          weekdays: [1],
        })
      ).toMatchObject({ ok: false });
    });

    it.each([[9], [-1], [1.5], [7]])(
      "rejects the weekday set %j",
      (weekday) => {
        expect(
          expandRecurrence({
            startDate: MONDAY,
            endDate: "2026-08-31",
            weekdays: [weekday],
          })
        ).toMatchObject({ ok: false });
      }
    );

    it("accepts the ends of the valid weekday range", () => {
      expect(
        expandRecurrence({
          startDate: MONDAY,
          endDate: "2026-08-31",
          weekdays: [0, 6],
        }).ok
      ).toBe(true);
    });

    it("rejects one bad weekday even among valid ones", () => {
      expect(
        expandRecurrence({
          startDate: MONDAY,
          endDate: "2026-08-31",
          weekdays: [1, 9],
        })
      ).toMatchObject({ ok: false });
    });

    it.each([0, -1, 9, 2.5])("rejects the interval %s", (interval) => {
      expect(
        expandRecurrence({
          startDate: MONDAY,
          endDate: "2026-08-31",
          weekdays: [1],
          interval,
        })
      ).toMatchObject({ ok: false });
    });

    it.each([1, 8])("accepts the interval %s", (interval) => {
      expect(
        expandRecurrence({
          startDate: MONDAY,
          endDate: "2026-09-30",
          weekdays: [1],
          interval,
        }).ok
      ).toBe(true);
    });

    it("rejects a range longer than the guard allows", () => {
      const result = expandRecurrence({
        startDate: "2026-01-01",
        endDate: "2027-12-31",
        weekdays: [1],
      });
      expect(result).toMatchObject({ ok: false });
    });

    it("refuses to create more than the per-series cap", () => {
      // Every day for most of a year comfortably exceeds the cap.
      const result = expandRecurrence({
        startDate: "2026-01-01",
        endDate: "2026-12-01",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      });
      expect(result).toMatchObject({ ok: false });
      if (!result.ok) expect(result.error).toContain(String(MAX_SERIES_SHIFTS));
    });

    it("reports when nothing falls in the range", () => {
      // Tue-Wed contains no Sunday.
      const result = expandRecurrence({
        startDate: "2026-08-04",
        endDate: "2026-08-05",
        weekdays: [0],
      });
      expect(result).toMatchObject({ ok: false });
    });
  });
});

describe("partitionExistingDates", () => {
  it("separates clashes from new days", () => {
    const result = partitionExistingDates(
      ["2026-08-03", "2026-08-10", "2026-08-17"],
      [new Date("2026-08-10T00:00:00.000Z")]
    );
    expect(result.toCreate).toEqual(["2026-08-03", "2026-08-17"]);
    expect(result.skipped).toEqual(["2026-08-10"]);
  });

  it("creates everything when nothing exists", () => {
    const result = partitionExistingDates(["2026-08-03"], []);
    expect(result.toCreate).toEqual(["2026-08-03"]);
    expect(result.skipped).toEqual([]);
  });

  it("skips everything when the whole series already exists", () => {
    const result = partitionExistingDates(
      ["2026-08-03"],
      [new Date("2026-08-03T00:00:00.000Z")]
    );
    expect(result.toCreate).toEqual([]);
    expect(result.skipped).toEqual(["2026-08-03"]);
  });
});

describe("summariseSeriesResult", () => {
  it("counts a single shift in the singular", () => {
    expect(summariseSeriesResult(1, 0)).toBe("1 shift created.");
  });

  it("mentions skipped clashes", () => {
    expect(summariseSeriesResult(4, 2)).toBe(
      "4 shifts created — 2 skipped, already on the roster."
    );
  });
});
