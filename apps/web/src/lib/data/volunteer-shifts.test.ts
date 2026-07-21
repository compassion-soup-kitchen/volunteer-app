import { describe, expect, it } from "vitest";

import {
  decideSignup,
  isSerializationFailure,
} from "@/lib/data/volunteer-shifts";

// Mid-morning on 6 July, UTC. Shift.date is @db.Date - midnight UTC.
const now = new Date("2026-07-06T09:30:00.000Z");
const futureShift = (capacity = 6) => ({
  date: new Date("2026-07-10T00:00:00.000Z"),
  capacity,
});

describe("decideSignup", () => {
  it("rejects when the shift does not exist", () => {
    expect(
      decideSignup({
        shift: null,
        activeSignupCount: 0,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "Shift not found." });
  });

  it("rejects a shift that has already passed", () => {
    expect(
      decideSignup({
        shift: { date: new Date("2026-07-01T00:00:00.000Z"), capacity: 6 },
        activeSignupCount: 0,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "This shift has already passed." });
  });

  it("rejects when the shift is at capacity", () => {
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 6,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "This shift is full." });
  });

  it("rejects when the shift is somehow over capacity", () => {
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 7,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "This shift is full." });
  });

  it("reports a full shift as full even to a volunteer already on it", () => {
    // The volunteer's own signup counts toward capacity, and the full
    // check runs first - this locks in the message order the UI shows.
    expect(
      decideSignup({
        shift: futureShift(1),
        activeSignupCount: 1,
        existingSignupStatus: "SIGNED_UP",
        now,
      })
    ).toEqual({ action: "reject", error: "This shift is full." });
  });

  it("rejects a duplicate signup when spots remain", () => {
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 3,
        existingSignupStatus: "SIGNED_UP",
        now,
      })
    ).toEqual({
      action: "reject",
      error: "You are already signed up for this shift.",
    });
  });

  it("creates a signup when there is room and no prior signup", () => {
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 5,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "create" });
  });

  it("reactivates a cancelled signup instead of creating a duplicate", () => {
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 2,
        existingSignupStatus: "CANCELLED",
        now,
      })
    ).toEqual({ action: "reactivate" });
  });

  it("lets the last spot go to exactly one volunteer", () => {
    // count 5 of 6 → create; count 6 of 6 (after the race loser retries
    // against committed state) → full.
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 5,
        existingSignupStatus: null,
        now,
      }).action
    ).toBe("create");
    expect(
      decideSignup({
        shift: futureShift(6),
        activeSignupCount: 6,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "This shift is full." });
  });
});

describe("isSerializationFailure", () => {
  it("matches Prisma's P2034 write-conflict code", () => {
    expect(isSerializationFailure({ code: "P2034" })).toBe(true);
  });

  it("matches the raw Postgres 40001 serialization failure", () => {
    expect(isSerializationFailure({ code: "40001" })).toBe(true);
  });

  it("ignores other Prisma error codes", () => {
    expect(isSerializationFailure({ code: "P2002" })).toBe(false);
  });

  it("ignores plain errors and non-objects", () => {
    expect(isSerializationFailure(new Error("boom"))).toBe(false);
    expect(isSerializationFailure(null)).toBe(false);
    expect(isSerializationFailure(undefined)).toBe(false);
    expect(isSerializationFailure("P2034")).toBe(false);
  });
});
