import { describe, expect, it } from "vitest";
import { formatTime, formatTimeRange } from "./format";

describe("formatTime", () => {
  it("renders morning times without a redundant :00", () => {
    expect(formatTime("09:00")).toBe("9am");
  });

  it("keeps the minutes when they are not on the hour", () => {
    expect(formatTime("13:30")).toBe("1:30pm");
  });

  it("renders midnight and midday as 12", () => {
    expect(formatTime("00:00")).toBe("12am");
    expect(formatTime("12:00")).toBe("12pm");
  });

  it("returns the raw value when it is not a time", () => {
    expect(formatTime("not-a-time")).toBe("not-a-time");
  });
});

describe("formatTimeRange", () => {
  it("joins both ends with an en dash", () => {
    expect(formatTimeRange("09:00", "13:00")).toBe("9am – 1pm");
  });
});
