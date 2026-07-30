import { describe, expect, it } from "vitest";
import { ageInYears, summariseAvailability } from "./volunteer-detail";

describe("summariseAvailability", () => {
  it("returns the days someone can help, in week order", () => {
    const days = summariseAvailability({
      wednesday: ["morning"],
      monday: ["morning", "afternoon"],
      sunday: ["evening"],
    });

    expect(days.map((d) => d.key)).toEqual(["monday", "wednesday", "sunday"]);
    expect(days[0].slots).toEqual(["morning", "afternoon"]);
    expect(days[0].label).toBe("Monday");
  });

  it("drops days with no slots rather than showing an empty row", () => {
    const days = summariseAvailability({
      monday: [],
      tuesday: ["morning"],
    });

    expect(days.map((d) => d.key)).toEqual(["tuesday"]);
  });

  it("ignores keys that aren't days of the week", () => {
    const days = summariseAvailability({
      monday: ["morning"],
      whenever: ["all day"],
    });

    expect(days).toHaveLength(1);
    expect(days[0].key).toBe("monday");
  });

  // The column is `Json`, so nothing guarantees its shape - a half-saved or
  // hand-edited row must render as "no availability", never crash the page.
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "monday"],
    ["a number", 3],
    ["an array", ["monday"]],
    ["an empty object", {}],
  ])("returns nothing for %s", (_label, value) => {
    expect(summariseAvailability(value)).toEqual([]);
  });

  it("skips slot entries that aren't non-empty strings", () => {
    const days = summariseAvailability({
      monday: ["morning", "", null, 7, "evening"],
    });

    expect(days[0].slots).toEqual(["morning", "evening"]);
  });

  it("treats a day whose value isn't an array as having no slots", () => {
    expect(summariseAvailability({ monday: "morning" })).toEqual([]);
  });
});

describe("ageInYears", () => {
  it("counts whole years", () => {
    expect(ageInYears("1990-05-12", "2026-07-30")).toBe(36);
  });

  it("turns over on the birthday itself, not before", () => {
    expect(ageInYears("1990-05-12", "2026-05-11")).toBe(35);
    expect(ageInYears("1990-05-12", "2026-05-12")).toBe(36);
  });

  it("handles a birthday later in the same month", () => {
    expect(ageInYears("1990-12-31", "2026-12-01")).toBe(35);
  });

  it("is 0 for someone born earlier this year", () => {
    expect(ageInYears("2026-01-04", "2026-07-30")).toBe(0);
  });

  it("returns null for a date of birth in the future", () => {
    expect(ageInYears("2027-01-01", "2026-07-30")).toBeNull();
  });

  it("returns null for a malformed date of birth", () => {
    expect(ageInYears("not-a-date", "2026-07-30")).toBeNull();
    expect(ageInYears("1990-13-01", "2026-07-30")).toBeNull();
  });
});
