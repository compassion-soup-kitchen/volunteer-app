import { describe, expect, it } from "vitest";

import {
  dateOnlyOf,
  formatDateOnly,
  isDateOnly,
  isPastInAppZone,
  isTodayInAppZone,
  parseDateOnly,
  safeParseDateOnly,
  startOfTodayInAppZone,
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
