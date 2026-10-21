import { describe, expect, it } from "vitest";

import {
  describeDay,
  isGridKey,
  moveInGrid,
  shortAreaName,
  shortCount,
} from "./roster-calendar";

const full = { filled: 4, capacity: 4 };
const short = { filled: 1, capacity: 4 };

const day = {
  shifts: [],
  isPast: false,
  closureReason: null,
  holidayName: null,
  awayCount: 0,
};

describe("shortCount", () => {
  it("counts shifts with empty seats", () => {
    expect(shortCount([full, short, short], false)).toBe(2);
  });

  it("never counts a past day as short", () => {
    expect(shortCount([short, short], true)).toBe(0);
  });
});

describe("describeDay", () => {
  it("says a closed day is closed, and why, and nothing else", () => {
    expect(describeDay({ ...day, shifts: [short], closureReason: "Staff day" })).toBe(
      "closed, Staff day"
    );
  });

  it("says when nothing is rostered", () => {
    expect(describeDay(day)).toBe("nothing rostered");
  });

  it("says how many shifts still need people, which the cell shows in colour", () => {
    expect(describeDay({ ...day, shifts: [full, short, short] })).toBe(
      "3 shifts, 2 need people"
    );
    expect(describeDay({ ...day, shifts: [short] })).toBe("1 shift, 1 needs people");
  });

  it("leaves the count out when every shift is full", () => {
    expect(describeDay({ ...day, shifts: [full] })).toBe("1 shift");
  });

  it("doesn't call a past day short", () => {
    expect(describeDay({ ...day, shifts: [short], isPast: true })).toBe("1 shift");
  });

  it("names the holiday first and leave last", () => {
    expect(
      describeDay({ ...day, shifts: [short], holidayName: "Labour Day", awayCount: 2 })
    ).toBe("Labour Day, 1 shift, 1 needs people, 2 on leave");
  });
});

describe("shortAreaName", () => {
  it("keeps the first word", () => {
    expect(shortAreaName("Kitchen & Meals")).toBe("Kitchen");
    expect(shortAreaName("Community Garden")).toBe("Community");
    expect(shortAreaName("  Outreach and Advocacy")).toBe("Outreach");
  });

  it("leaves a single word alone", () => {
    expect(shortAreaName("Dishes")).toBe("Dishes");
  });
});

describe("moveInGrid", () => {
  // Five weeks: 35 cells.
  const count = 35;

  it("moves a day sideways and a week up or down", () => {
    expect(moveInGrid(10, "ArrowRight", count)).toBe(11);
    expect(moveInGrid(10, "ArrowLeft", count)).toBe(9);
    expect(moveInGrid(10, "ArrowDown", count)).toBe(17);
    expect(moveInGrid(10, "ArrowUp", count)).toBe(3);
  });

  it("runs on across the end of a week", () => {
    expect(moveInGrid(6, "ArrowRight", count)).toBe(7);
    expect(moveInGrid(7, "ArrowLeft", count)).toBe(6);
  });

  it("goes to the start or end of the week with Home and End", () => {
    expect(moveInGrid(10, "Home", count)).toBe(7);
    expect(moveInGrid(10, "End", count)).toBe(13);
  });

  it("stops at the edges of the grid instead of wrapping", () => {
    expect(moveInGrid(0, "ArrowLeft", count)).toBe(0);
    expect(moveInGrid(3, "ArrowUp", count)).toBe(3);
    expect(moveInGrid(34, "ArrowRight", count)).toBe(34);
    expect(moveInGrid(30, "ArrowDown", count)).toBe(30);
  });

  it("only claims the keys it handles", () => {
    expect(isGridKey("ArrowDown")).toBe(true);
    expect(isGridKey("Enter")).toBe(false);
  });
});
