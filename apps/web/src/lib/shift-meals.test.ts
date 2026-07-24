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

  it("allows recording from first thing on the shift day in Aotearoa", () => {
    // 18:00 UTC on the 5th is 06:00 on the 6th in Wellington — the kitchen's
    // day has started even though UTC is still on the day before.
    expect(
      canRecordMeals(shiftDay("2026-07-06"), new Date("2026-07-05T18:00:00Z"))
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

  it("blocks tomorrow's shift at the last moment of today in Aotearoa", () => {
    // 11:59 UTC on the 6th is 23:59 on the 6th in Wellington.
    expect(
      canRecordMeals(shiftDay("2026-07-07"), new Date("2026-07-06T11:59:59Z"))
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
