import { describe, expect, it } from "vitest";

import {
  isVolunteerFileType,
  newestFirst,
  parseTrainingRecordInput,
  TRAINING_RECORD_NOTE_MAX,
} from "./training-records";

// 9am on 12 Nov in Wellington - still 11 Nov in UTC.
const NZ_MORNING = new Date("2026-11-11T20:00:00.000Z");

describe("parseTrainingRecordInput", () => {
  it("accepts a type, a past day and a note", () => {
    expect(
      parseTrainingRecordInput(
        { typeId: "t1", completedOn: "2026-11-03", note: "  Signed by Amanda  " },
        NZ_MORNING
      )
    ).toEqual({
      ok: true,
      value: { typeId: "t1", completedOn: "2026-11-03", note: "Signed by Amanda" },
    });
  });

  it("treats a blank note as no note", () => {
    const result = parseTrainingRecordInput(
      { typeId: "t1", completedOn: "2026-11-03", note: "   " },
      NZ_MORNING
    );
    expect(result).toMatchObject({ ok: true, value: { note: null } });
  });

  it("allows today on the kitchen's calendar, even while UTC is still yesterday", () => {
    expect(
      parseTrainingRecordInput({ typeId: "t1", completedOn: "2026-11-12" }, NZ_MORNING)
    ).toMatchObject({ ok: true });
  });

  it("refuses a day that hasn't happened yet", () => {
    expect(
      parseTrainingRecordInput({ typeId: "t1", completedOn: "2026-11-13" }, NZ_MORNING)
    ).toMatchObject({ ok: false, error: expect.stringContaining("hasn't happened") });
  });

  it("refuses a missing type", () => {
    expect(
      parseTrainingRecordInput({ typeId: " ", completedOn: "2026-11-03" }, NZ_MORNING)
    ).toEqual({ ok: false, error: "Choose which training they completed." });
  });

  it("refuses a day that isn't a real calendar day", () => {
    for (const completedOn of ["", "2026-02-30", "3/11/2026", 42]) {
      expect(
        parseTrainingRecordInput({ typeId: "t1", completedOn }, NZ_MORNING)
      ).toEqual({ ok: false, error: "Choose the day the training was signed off." });
    }
  });

  it("refuses an implausibly early year", () => {
    expect(
      parseTrainingRecordInput({ typeId: "t1", completedOn: "1926-11-03" }, NZ_MORNING)
    ).toMatchObject({ ok: false, error: expect.stringContaining("year") });
  });

  it("refuses an over-long note", () => {
    expect(
      parseTrainingRecordInput(
        {
          typeId: "t1",
          completedOn: "2026-11-03",
          note: "x".repeat(TRAINING_RECORD_NOTE_MAX + 1),
        },
        NZ_MORNING
      )
    ).toMatchObject({ ok: false });
  });
});

describe("isVolunteerFileType", () => {
  it("allows the per-person kinds and refuses org-wide ones", () => {
    expect(isVolunteerFileType("TRAINING_RECORD")).toBe(true);
    expect(isVolunteerFileType("POLICE_VETTING")).toBe(true);
    expect(isVolunteerFileType("MOJ_FORM")).toBe(true);
    expect(isVolunteerFileType("POLICY")).toBe(false);
    expect(isVolunteerFileType("TRAINING_MATERIAL")).toBe(false);
    expect(isVolunteerFileType("SIGNED_AGREEMENT")).toBe(false);
  });
});

describe("newestFirst", () => {
  it("orders by day, newest first, with a stable tie-break", () => {
    const day = (d: string) => new Date(`${d}T00:00:00.000Z`);
    expect(
      newestFirst([
        { id: "b", date: day("2026-10-01") },
        { id: "c", date: day("2026-11-01") },
        { id: "a", date: day("2026-10-01") },
      ]).map((i) => i.id)
    ).toEqual(["c", "a", "b"]);
  });
});
