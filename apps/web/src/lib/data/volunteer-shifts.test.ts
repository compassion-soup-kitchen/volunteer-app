import { describe, expect, it } from "vitest";

import {
  decideSignup,
  isSerializationFailure,
} from "@/lib/data/volunteer-shifts";

// Mid-morning on 6 July, UTC. Shift.date is @db.Date - midnight UTC.
const now = new Date("2026-07-06T09:30:00.000Z");
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const futureShift = (capacity = 6) => ({
  date: day("2026-07-10"),
  capacity,
  offersCloseOn: null,
  offers: [],
});
/** The same shift, held for its regulars until the 8th. */
const heldShift = (capacity = 6) => ({
  ...futureShift(capacity),
  offersCloseOn: day("2026-07-08"),
  offers: [{ status: "PENDING" as const }],
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
        shift: { ...futureShift(), date: day("2026-07-01") },
        activeSignupCount: 0,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "This shift has already passed." });
  });

  it("still lets a volunteer take a shift that is on today", () => {
    // 21:00 UTC is already the next morning in Aotearoa, so today's shift
    // must not read as passed just because UTC has rolled over.
    expect(
      decideSignup({
        shift: { ...futureShift(), date: day("2026-07-07") },
        activeSignupCount: 0,
        existingSignupStatus: null,
        now: new Date("2026-07-06T21:00:00.000Z"),
      })
    ).toEqual({ action: "create" });
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

  it("turns away a volunteer while the shift is held for its regulars", () => {
    const decision = decideSignup({
      shift: heldShift(),
      activeSignupCount: 0,
      existingSignupStatus: null,
      now,
    });
    expect(decision.action).toBe("reject");
    expect(decision).toMatchObject({
      error: expect.stringContaining("Wednesday, 8 July"),
    });
  });

  it("lets a volunteer who holds the offer take the shift", () => {
    expect(
      decideSignup({
        shift: heldShift(),
        activeSignupCount: 0,
        existingSignupStatus: null,
        userOfferStatus: "PENDING",
        now,
      })
    ).toEqual({ action: "create" });
  });

  // One regular accepting doesn't lift the hold for the rest of the crew, but
  // a repeat submit from that volunteer should hear about their own signup
  // rather than a hold that no longer concerns them.
  it("tells a volunteer already on a held shift that they are already on it", () => {
    expect(
      decideSignup({
        shift: {
          ...heldShift(),
          offers: [{ status: "ACCEPTED" }, { status: "PENDING" }],
        },
        activeSignupCount: 1,
        existingSignupStatus: "SIGNED_UP",
        userOfferStatus: "ACCEPTED",
        now,
      })
    ).toEqual({
      action: "reject",
      error: "You are already signed up for this shift.",
    });
  });

  it("still holds the shift against someone whose signup was cancelled", () => {
    const decision = decideSignup({
      shift: heldShift(),
      activeSignupCount: 0,
      existingSignupStatus: "CANCELLED",
      now,
    });
    expect(decision.action).toBe("reject");
    expect(decision).toMatchObject({
      error: expect.stringContaining("Wednesday, 8 July"),
    });
  });

  it("opens the shift to everyone once the hold day has passed", () => {
    expect(
      decideSignup({
        shift: { ...heldShift(), offersCloseOn: day("2026-07-05") },
        activeSignupCount: 0,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "create" });
  });

  it("opens the shift to everyone once the regulars have all answered", () => {
    expect(
      decideSignup({
        shift: { ...heldShift(), offers: [{ status: "DECLINED" }] },
        activeSignupCount: 0,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "create" });
  });

  it("reports a passed shift as passed even while it is held", () => {
    expect(
      decideSignup({
        shift: { ...heldShift(), date: day("2026-07-01") },
        activeSignupCount: 0,
        existingSignupStatus: null,
        now,
      })
    ).toEqual({ action: "reject", error: "This shift has already passed." });
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
