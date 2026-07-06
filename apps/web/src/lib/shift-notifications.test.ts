import { describe, expect, it } from "vitest";

import {
  formatShiftDay,
  shouldNotifyShiftChange,
  type ShiftNotificationDetails,
} from "@/lib/shift-notifications";

// Shift.date is @db.Date — midnight UTC, no time component.
const shift = (
  overrides: Partial<ShiftNotificationDetails> = {}
): ShiftNotificationDetails => ({
  date: new Date("2026-07-10T00:00:00.000Z"),
  startTime: "09:00",
  endTime: "13:00",
  serviceAreaId: "area-kitchen",
  ...overrides,
});

// Mid-morning on the 6th, UTC.
const now = new Date("2026-07-06T09:30:00.000Z");

describe("formatShiftDay", () => {
  it("formats the UTC day the date encodes, regardless of server timezone", () => {
    expect(formatShiftDay(new Date("2026-07-10T00:00:00.000Z"))).toBe(
      "Friday, 10 July"
    );
  });
});

describe("shouldNotifyShiftChange", () => {
  it("is quiet when nothing volunteers care about changed", () => {
    expect(shouldNotifyShiftChange(shift(), shift(), now)).toBe(false);
  });

  it("notifies when the start time moves", () => {
    expect(
      shouldNotifyShiftChange(shift(), shift({ startTime: "10:00" }), now)
    ).toBe(true);
  });

  it("notifies when the day moves", () => {
    expect(
      shouldNotifyShiftChange(
        shift(),
        shift({ date: new Date("2026-07-11T00:00:00.000Z") }),
        now
      )
    ).toBe(true);
  });

  it("notifies when the service area moves", () => {
    expect(
      shouldNotifyShiftChange(
        shift(),
        shift({ serviceAreaId: "area-foodbank" }),
        now
      )
    ).toBe(true);
  });

  it("notifies for a shift later today, even though midnight has passed", () => {
    const today = new Date("2026-07-06T00:00:00.000Z");
    expect(
      shouldNotifyShiftChange(
        shift({ date: today }),
        shift({ date: today, startTime: "14:00" }),
        now
      )
    ).toBe(true);
  });

  it("is quiet for shifts on past days", () => {
    const yesterday = new Date("2026-07-05T00:00:00.000Z");
    expect(
      shouldNotifyShiftChange(
        shift({ date: yesterday }),
        shift({ date: yesterday, startTime: "14:00" }),
        now
      )
    ).toBe(false);
  });
});
