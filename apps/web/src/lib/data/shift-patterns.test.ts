import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/push", () => ({ sendPushToUsers: vi.fn() }));

import { addDaysToDateOnly, parseDateOnly } from "@/lib/date-only";
import { materialisationWindow, regularsToSeat } from "@/lib/shift-patterns";
import { releaseRegulars, removePatternShiftsAfter } from "./shift-patterns";

const day = parseDateOnly;

const tx = {
  shift: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  shiftPattern: { updateMany: vi.fn() },
  shiftSignup: { deleteMany: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.shift.findMany.mockResolvedValue([]);
  tx.shiftSignup.deleteMany.mockResolvedValue({ count: 0 });
});

describe("removePatternShiftsAfter", () => {
  it("rewinds the watermark to the new last day, never forward", async () => {
    await removePatternShiftsAfter(tx as never, "pattern-1", "2026-10-13");

    expect(tx.shiftPattern.updateMany).toHaveBeenCalledWith({
      where: { id: "pattern-1", generatedThrough: { gt: day("2026-10-13") } },
      data: { generatedThrough: day("2026-10-13") },
    });
  });

  // The sequence that left a gap: generated twelve weeks ahead, stopped today,
  // reopened later. With the watermark rewound, the next top-up starts the
  // day after the stop instead of twelve weeks out.
  it("lets a stopped pattern that is extended again fill every week from the stop", () => {
    const today = "2026-10-13";
    const stoppedOn = today;
    const watermarkAfterStop = stoppedOn; // what the rewind leaves behind

    const window = materialisationWindow(
      { startsOn: "2026-08-03", endsOn: null, generatedThrough: watermarkAfterStop },
      today
    );

    expect(window).toEqual({
      from: addDaysToDateOnly(stoppedOn, 1),
      to: addDaysToDateOnly(today, 84),
    });
  });

  it("deletes later shifts with nothing recorded and keeps ones with attendance", async () => {
    tx.shift.findMany
      // The pattern's shifts after the last day.
      .mockResolvedValueOnce([
        { id: "future", _count: { signups: 0 } },
        { id: "worked", _count: { signups: 2 } },
      ])
      // removeShifts reading what it's about to delete.
      .mockResolvedValueOnce([
        {
          id: "future",
          date: day("2026-10-19"),
          serviceArea: { name: "Breakfast" },
          signups: [{ volunteer: { userId: "user-1" } }],
        },
      ]);

    const removed = await removePatternShiftsAfter(tx as never, "pattern-1", "2026-10-13");

    expect(tx.shift.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["worked"] } },
      data: { patternId: null },
    });
    expect(tx.shift.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["future"] } },
    });
    expect(removed.map((shift) => shift.id)).toEqual(["future"]);
  });
});

describe("releaseRegulars", () => {
  it("deletes the departing regulars' upcoming places rather than cancelling them", async () => {
    await releaseRegulars(tx as never, "pattern-1", ["vol-joan"], "2026-10-13");

    expect(tx.shiftSignup.deleteMany).toHaveBeenCalledWith({
      where: {
        volunteerId: { in: ["vol-joan"] },
        status: "SIGNED_UP",
        shift: { patternId: "pattern-1", date: { gte: day("2026-10-13") } },
      },
    });
  });

  it("does nothing when no one left", async () => {
    expect(await releaseRegulars(tx as never, "pattern-1", [], "2026-10-13")).toBe(0);
    expect(tx.shiftSignup.deleteMany).not.toHaveBeenCalled();
  });

  // Removed then re-added: with the pattern's row gone, they're seated again;
  // a week they cancelled themselves still has its row and stays cancelled.
  it("leaves a re-added regular free to be seated, but not on a week they cancelled", () => {
    const seatOn = (signupVolunteerIds: string[]) =>
      regularsToSeat({
        capacity: 4,
        seatedVolunteerIds: [],
        signupVolunteerIds,
        regularIds: ["vol-joan"],
      });

    expect(seatOn([])).toEqual(["vol-joan"]);
    expect(seatOn(["vol-joan"])).toEqual([]);
  });
});
