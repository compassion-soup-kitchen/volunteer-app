import { describe, expect, it } from "vitest";

import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  dateOnlyOf,
  endOfDayExclusiveInAppZone,
  endOfMonthInAppZone,
  endOfMonthOf,
  endOfWeekInAppZone,
  endOfWeekOf,
  formatDateOnly,
  formatTimestampInAppZone,
  isDateOnly,
  isPastInAppZone,
  isTodayInAppZone,
  parseDateOnly,
  safeParseDateOnly,
  startOfDayInAppZone,
  startOfMonthInAppZone,
  startOfMonthOf,
  startOfTodayInAppZone,
  startOfWeekInAppZone,
  startOfWeekOf,
  timestampToDateOnly,
  toDateOnly,
  toPickerDate,
  todayInAppZone,
} from "@/lib/date-only";

describe("toDateOnly", () => {
  it("reads the day the picker showed, not the UTC one", () => {
    // Local midnight on 1 September. In Aotearoa (UTC+12) `toISOString()`
    // would call this 31 August — the bug this helper exists to stop.
    expect(toDateOnly(new Date(2026, 8, 1))).toBe("2026-09-01");
  });

  it("keeps the day when the local time is late in the evening", () => {
    expect(toDateOnly(new Date(2026, 8, 1, 23, 30))).toBe("2026-09-01");
  });

  it("pads single-digit months and days", () => {
    expect(toDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseDateOnly", () => {
  it("encodes the day as midnight UTC, the way @db.Date stores it", () => {
    expect(parseDateOnly("2026-09-01").toISOString()).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });

  it("round-trips a picked date without drifting a day", () => {
    const picked = new Date(2026, 8, 1);
    expect(dateOnlyOf(parseDateOnly(toDateOnly(picked)))).toBe("2026-09-01");
  });

  it("rejects a full ISO timestamp rather than silently taking the UTC day", () => {
    expect(() => parseDateOnly("2026-08-31T12:00:00.000Z")).toThrow();
  });

  it("rejects a day that does not exist", () => {
    expect(() => parseDateOnly("2026-02-30")).toThrow();
  });
});

describe("isDateOnly", () => {
  it.each(["2026-09-01", "2026-01-05", "2028-02-29"])("accepts %s", (value) => {
    expect(isDateOnly(value)).toBe(true);
  });

  it.each([
    "2026-9-1",
    "2026-13-01",
    "2026-02-30",
    "01-09-2026",
    "2026-08-31T12:00:00.000Z",
    "",
  ])("rejects %s", (value) => {
    expect(isDateOnly(value)).toBe(false);
  });
});

describe("safeParseDateOnly", () => {
  it("returns null for junk instead of throwing", () => {
    expect(safeParseDateOnly("not-a-day")).toBeNull();
  });

  it("parses a good day", () => {
    expect(safeParseDateOnly("2026-09-01")?.toISOString()).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });
});

describe("toPickerDate", () => {
  it("hands a stored day back to the picker as local midnight", () => {
    const picker = toPickerDate(new Date("2026-09-01T00:00:00.000Z"));
    expect(picker.getFullYear()).toBe(2026);
    expect(picker.getMonth()).toBe(8);
    expect(picker.getDate()).toBe(1);
  });

  it("survives the round trip back to a stored day", () => {
    const stored = new Date("2026-09-01T00:00:00.000Z");
    expect(toDateOnly(toPickerDate(stored))).toBe("2026-09-01");
  });
});

describe("todayInAppZone", () => {
  it("is already tomorrow in Aotearoa when UTC is still on the previous evening", () => {
    // 21:00 UTC on 31 August is 09:00 on 1 September in Wellington.
    expect(todayInAppZone(new Date("2026-08-31T21:00:00.000Z"))).toBe(
      "2026-09-01"
    );
  });

  it("agrees with UTC in the middle of the Aotearoa afternoon", () => {
    expect(todayInAppZone(new Date("2026-09-01T02:00:00.000Z"))).toBe(
      "2026-09-01"
    );
  });
});

describe("startOfTodayInAppZone", () => {
  it("floors to midnight UTC of the local day", () => {
    expect(
      startOfTodayInAppZone(new Date("2026-08-31T21:00:00.000Z")).toISOString()
    ).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("isTodayInAppZone / isPastInAppZone", () => {
  const shiftDay = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  // 09:00 on 1 September in Wellington.
  const now = new Date("2026-08-31T21:00:00.000Z");

  it("calls this morning's shift today, not tomorrow", () => {
    expect(isTodayInAppZone(shiftDay("2026-09-01"), now)).toBe(true);
    expect(isPastInAppZone(shiftDay("2026-09-01"), now)).toBe(false);
  });

  it("calls yesterday's shift past", () => {
    expect(isPastInAppZone(shiftDay("2026-08-31"), now)).toBe(true);
    expect(isTodayInAppZone(shiftDay("2026-08-31"), now)).toBe(false);
  });

  it("does not call tomorrow's shift past", () => {
    expect(isPastInAppZone(shiftDay("2026-09-02"), now)).toBe(false);
  });
});

describe("formatDateOnly", () => {
  it("formats the stored day, not its local shadow", () => {
    expect(formatDateOnly(new Date("2026-09-01T00:00:00.000Z"))).toBe(
      "Tue, 1 Sept 2026"
    );
  });

  it("takes format options", () => {
    expect(
      formatDateOnly(new Date("2026-09-01T00:00:00.000Z"), {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    ).toBe("Tuesday, 1 September");
  });
});

describe("startOfDayInAppZone", () => {
  // NZST is UTC+12, so 1 July begins at 12:00 UTC on 30 June.
  it("resolves a winter day to the instant it began in Wellington", () => {
    expect(startOfDayInAppZone("2026-07-01").toISOString()).toBe(
      "2026-06-30T12:00:00.000Z"
    );
  });

  // NZDT is UTC+13 over daylight saving.
  it("resolves a summer day using the daylight-saving offset", () => {
    expect(startOfDayInAppZone("2026-01-15").toISOString()).toBe(
      "2026-01-14T11:00:00.000Z"
    );
  });

  // Daylight saving starts on the last Sunday of September (27 Sept 2026):
  // the day begins at UTC+12 and ends at UTC+13.
  it("handles the day daylight saving starts", () => {
    expect(startOfDayInAppZone("2026-09-27").toISOString()).toBe(
      "2026-09-26T12:00:00.000Z"
    );
  });

  // ...and ends on the first Sunday of April (5 April 2026).
  it("handles the day daylight saving ends", () => {
    expect(startOfDayInAppZone("2026-04-05").toISOString()).toBe(
      "2026-04-04T11:00:00.000Z"
    );
  });

  it("never lands on the same UTC instant as the naive parse", () => {
    // The bug this replaces: treating the calendar day as UTC midnight.
    expect(startOfDayInAppZone("2026-07-01").toISOString()).not.toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });
});

describe("endOfDayExclusiveInAppZone", () => {
  it("is the instant the following day begins", () => {
    expect(endOfDayExclusiveInAppZone("2026-07-31").toISOString()).toBe(
      "2026-07-31T12:00:00.000Z"
    );
    expect(endOfDayExclusiveInAppZone("2026-07-31").getTime()).toBe(
      startOfDayInAppZone("2026-08-01").getTime()
    );
  });

  it("spans exactly 24 hours on an ordinary day", () => {
    const span =
      endOfDayExclusiveInAppZone("2026-07-01").getTime() -
      startOfDayInAppZone("2026-07-01").getTime();
    expect(span).toBe(24 * 60 * 60 * 1000);
  });

  it("spans 23 hours on the day daylight saving starts", () => {
    const span =
      endOfDayExclusiveInAppZone("2026-09-27").getTime() -
      startOfDayInAppZone("2026-09-27").getTime();
    expect(span).toBe(23 * 60 * 60 * 1000);
  });

  it("spans 25 hours on the day daylight saving ends", () => {
    const span =
      endOfDayExclusiveInAppZone("2026-04-05").getTime() -
      startOfDayInAppZone("2026-04-05").getTime();
    expect(span).toBe(25 * 60 * 60 * 1000);
  });
});

describe("timestampToDateOnly", () => {
  it("reports the NZ calendar day a UTC timestamp fell on", () => {
    // 20:00 UTC on 30 June is already 8am on 1 July in Wellington.
    expect(timestampToDateOnly(new Date("2026-06-30T20:00:00.000Z"))).toBe(
      "2026-07-01"
    );
  });

  it("keeps a mid-afternoon UTC instant on the same NZ day it maps to", () => {
    expect(timestampToDateOnly(new Date("2026-07-01T02:00:00.000Z"))).toBe(
      "2026-07-01"
    );
  });
});

describe("calendar arithmetic", () => {
  describe("startOfMonthOf / endOfMonthOf", () => {
    it("brackets an ordinary month", () => {
      expect(startOfMonthOf("2026-07-15")).toBe("2026-07-01");
      expect(endOfMonthOf("2026-07-15")).toBe("2026-07-31");
    });

    it("handles 30-day months and February", () => {
      expect(endOfMonthOf("2026-09-10")).toBe("2026-09-30");
      expect(endOfMonthOf("2026-02-10")).toBe("2026-02-28");
    });

    it("handles a leap February", () => {
      expect(endOfMonthOf("2028-02-10")).toBe("2028-02-29");
    });

    it("is idempotent on a month boundary", () => {
      expect(startOfMonthOf("2026-07-01")).toBe("2026-07-01");
      expect(endOfMonthOf("2026-07-31")).toBe("2026-07-31");
    });
  });

  describe("addMonthsToDateOnly", () => {
    it("steps forward and back", () => {
      expect(addMonthsToDateOnly("2026-07-01", 1)).toBe("2026-08-01");
      expect(addMonthsToDateOnly("2026-07-01", -5)).toBe("2026-02-01");
    });

    it("crosses a year boundary", () => {
      expect(addMonthsToDateOnly("2026-12-01", 1)).toBe("2027-01-01");
      expect(addMonthsToDateOnly("2026-01-01", -1)).toBe("2025-12-01");
    });

    it("clamps rather than spilling into the next month", () => {
      expect(addMonthsToDateOnly("2026-01-31", 1)).toBe("2026-02-28");
      expect(addMonthsToDateOnly("2026-08-31", 1)).toBe("2026-09-30");
    });
  });

  describe("startOfWeekOf / endOfWeekOf", () => {
    // 2026-08-03 is a Monday, 2026-08-09 the Sunday that ends its week.
    it("runs Monday to Sunday", () => {
      expect(startOfWeekOf("2026-08-05")).toBe("2026-08-03");
      expect(endOfWeekOf("2026-08-05")).toBe("2026-08-09");
    });

    it("treats Sunday as the end of the week it closes, not the start", () => {
      expect(startOfWeekOf("2026-08-09")).toBe("2026-08-03");
      expect(endOfWeekOf("2026-08-09")).toBe("2026-08-09");
    });

    it("is stable on a Monday", () => {
      expect(startOfWeekOf("2026-08-03")).toBe("2026-08-03");
    });

    it("spans seven days", () => {
      expect(addDaysToDateOnly(startOfWeekOf("2026-08-05"), 6)).toBe(
        endOfWeekOf("2026-08-05")
      );
    });
  });
});

describe("app-zone week and month", () => {
  // 2026-08-01T00:30Z is already 12:30pm on 1 August in Wellington, so "this
  // month" is August. Reading the server's UTC clock agreed here...
  it("agrees with UTC when both are on the same calendar day", () => {
    const at = new Date("2026-08-01T00:30:00.000Z");
    expect(startOfMonthInAppZone(at)).toBe("2026-08-01");
  });

  // ...but 2026-07-31T20:00Z is 8am on 1 August in Wellington. The server's
  // clock still says July, which is the bug: the dashboard reported last
  // month's hours through the whole NZ morning of the 1st.
  it("rolls into the new month on NZ time, not UTC", () => {
    const at = new Date("2026-07-31T20:00:00.000Z");
    expect(startOfMonthInAppZone(at)).toBe("2026-08-01");
    expect(endOfMonthInAppZone(at)).toBe("2026-08-31");
  });

  // Same trap for the week: 2026-08-02T20:00Z is Monday 3 August 8am in NZ.
  it("rolls into the new week on NZ time, not UTC", () => {
    const at = new Date("2026-08-02T20:00:00.000Z");
    expect(startOfWeekInAppZone(at)).toBe("2026-08-03");
    expect(endOfWeekInAppZone(at)).toBe("2026-08-09");
  });

  it("brackets the current NZ week consistently", () => {
    const at = new Date("2026-08-05T03:00:00.000Z");
    expect(startOfWeekInAppZone(at)).toBe("2026-08-03");
    expect(endOfWeekInAppZone(at)).toBe("2026-08-09");
  });
});

describe("formatTimestampInAppZone", () => {
  // 2026-06-30T21:00Z is 9am on 1 July in Wellington. Formatting without a
  // timezone on a UTC server would print 30 June.
  it("names the NZ day a timestamp fell on", () => {
    expect(formatTimestampInAppZone(new Date("2026-06-30T21:00:00.000Z"))).toBe(
      "1 Jul 2026"
    );
  });

  it("takes format options", () => {
    expect(
      formatTimestampInAppZone(new Date("2026-06-30T21:00:00.000Z"), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    ).toBe("1 July 2026");
  });
});
