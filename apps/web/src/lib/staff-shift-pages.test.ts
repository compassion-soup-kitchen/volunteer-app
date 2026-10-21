import { describe, expect, it } from "vitest";
import {
  STAFF_SHIFTS_PAGE_SIZE,
  pageOfShifts,
  staffShiftsLimit,
} from "./staff-shift-pages";

const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("staffShiftsLimit", () => {
  it("asks for one row beyond the pages it will show", () => {
    expect(staffShiftsLimit(1)).toBe(STAFF_SHIFTS_PAGE_SIZE + 1);
    expect(staffShiftsLimit(3)).toBe(3 * STAFF_SHIFTS_PAGE_SIZE + 1);
  });

  it("never asks for less than one page", () => {
    expect(staffShiftsLimit(0)).toBe(STAFF_SHIFTS_PAGE_SIZE + 1);
    expect(staffShiftsLimit(-2)).toBe(STAFF_SHIFTS_PAGE_SIZE + 1);
  });
});

describe("pageOfShifts", () => {
  it("shows everything and offers no more when the read came back short", () => {
    const result = pageOfShifts(rows(12), 1);
    expect(result.shifts).toHaveLength(12);
    expect(result.hasMore).toBe(false);
  });

  it("shows a full page and offers no more when there is exactly a page", () => {
    const result = pageOfShifts(rows(STAFF_SHIFTS_PAGE_SIZE), 1);
    expect(result.shifts).toHaveLength(STAFF_SHIFTS_PAGE_SIZE);
    expect(result.hasMore).toBe(false);
  });

  it("drops the look-ahead row and offers more when it came back", () => {
    const result = pageOfShifts(rows(STAFF_SHIFTS_PAGE_SIZE + 1), 1);
    expect(result.shifts).toHaveLength(STAFF_SHIFTS_PAGE_SIZE);
    expect(result.shifts.at(-1)).toBe(STAFF_SHIFTS_PAGE_SIZE - 1);
    expect(result.hasMore).toBe(true);
  });

  it("grows with each page shown", () => {
    const result = pageOfShifts(rows(2 * STAFF_SHIFTS_PAGE_SIZE + 1), 2);
    expect(result.shifts).toHaveLength(2 * STAFF_SHIFTS_PAGE_SIZE);
    expect(result.hasMore).toBe(true);
  });
});
