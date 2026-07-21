import { describe, expect, it } from "vitest";

import {
  MEALS_SERVED_MAX,
  canRecordMeals,
  mealsServedSchema,
} from "@/lib/shift-meals";

// Shift.date is @db.Date - midnight UTC, no time component.
const shiftDay = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("canRecordMeals", () => {
  it("allows recording on the shift day itself", () => {
    expect(
      canRecordMeals(shiftDay("2026-07-06"), new Date("2026-07-06T09:30:00Z"))
    ).toBe(true);
  });

  it("allows recording from the very start of the shift's UTC day", () => {
    expect(
      canRecordMeals(shiftDay("2026-07-06"), new Date("2026-07-06T00:00:00Z"))
    ).toBe(true);
  });

  it("allows recording for past shifts", () => {
    expect(
      canRecordMeals(shiftDay("2026-07-01"), new Date("2026-07-06T09:30:00Z"))
    ).toBe(true);
  });

  it("blocks future shifts", () => {
    expect(
      canRecordMeals(shiftDay("2026-07-10"), new Date("2026-07-06T09:30:00Z"))
    ).toBe(false);
  });

  it("blocks tomorrow's shift even at the last second of today, UTC", () => {
    expect(
      canRecordMeals(shiftDay("2026-07-07"), new Date("2026-07-06T23:59:59Z"))
    ).toBe(false);
  });
});

describe("mealsServedSchema", () => {
  it("accepts zero - a quiet day still gets recorded", () => {
    expect(mealsServedSchema.safeParse(0).success).toBe(true);
  });

  it("accepts a typical service count", () => {
    expect(mealsServedSchema.safeParse(180).success).toBe(true);
  });

  it("accepts the upper bound", () => {
    expect(mealsServedSchema.safeParse(MEALS_SERVED_MAX).success).toBe(true);
  });

  it("rejects negative counts", () => {
    expect(mealsServedSchema.safeParse(-1).success).toBe(false);
  });

  it("rejects fractional counts", () => {
    expect(mealsServedSchema.safeParse(42.5).success).toBe(false);
  });

  it("rejects counts above the sanity ceiling", () => {
    expect(mealsServedSchema.safeParse(MEALS_SERVED_MAX + 1).success).toBe(
      false
    );
  });

  it("rejects non-numbers", () => {
    expect(mealsServedSchema.safeParse("180").success).toBe(false);
    expect(mealsServedSchema.safeParse(NaN).success).toBe(false);
  });
});
