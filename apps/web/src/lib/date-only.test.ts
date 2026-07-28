import { describe, expect, it } from "vitest";

import {
  dateOnlyOf,
  endOfDayExclusiveInAppZone,
  formatDateOnly,
  isDateOnly,
  isPastInAppZone,
  isTodayInAppZone,
  parseDateOnly,
  safeParseDateOnly,
  startOfDayInAppZone,
  startOfTodayInAppZone,
  timestampToDateOnly,
  toDateOnly,
  todayInAppZone,
  toPickerDate,
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
