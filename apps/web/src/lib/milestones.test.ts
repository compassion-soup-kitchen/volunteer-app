import { describe, expect, it } from "vitest";
import { MILESTONES, getMilestones } from "./milestones";

describe("getMilestones", () => {
  it("returns one entry per milestone in canonical order", () => {
    const result = getMilestones(0);
    expect(result).toHaveLength(MILESTONES.length);
    expect(result.map((m) => m.hours)).toEqual([10, 25, 50, 100, 250, 500]);
  });

  it("marks all milestones unreached at 0 hours", () => {
    const result = getMilestones(0);
    expect(result.every((m) => m.reached === false)).toBe(true);
  });

  it("marks a milestone reached when hours equal the threshold", () => {
    const result = getMilestones(25);
    const twentyFive = result.find((m) => m.hours === 25);
    expect(twentyFive?.reached).toBe(true);
  });

  it("reaches every milestone at or below the current hours", () => {
    const result = getMilestones(60);
    expect(result.find((m) => m.hours === 10)?.reached).toBe(true);
    expect(result.find((m) => m.hours === 25)?.reached).toBe(true);
    expect(result.find((m) => m.hours === 50)?.reached).toBe(true);
    expect(result.find((m) => m.hours === 100)?.reached).toBe(false);
    expect(result.find((m) => m.hours === 250)?.reached).toBe(false);
    expect(result.find((m) => m.hours === 500)?.reached).toBe(false);
  });

  it("marks every milestone reached when hours exceed the highest threshold", () => {
    const result = getMilestones(1000);
    expect(result.every((m) => m.reached)).toBe(true);
  });

  it("preserves label and emoji from the source milestone", () => {
    const [first] = getMilestones(0);
    expect(first.label).toBe("10 Hours");
    expect(first.emoji).toBe("whetu");
  });
});
