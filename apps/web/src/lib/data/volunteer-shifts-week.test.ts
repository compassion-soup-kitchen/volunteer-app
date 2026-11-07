import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shiftFindFirstMock = vi.fn();
const shiftFindManyMock = vi.fn();
const profileFindUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    shift: { findFirst: shiftFindFirstMock, findMany: shiftFindManyMock },
    volunteerProfile: { findUnique: profileFindUniqueMock },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/shift-patterns", () => ({ scheduleRosterTopUp: vi.fn() }));
vi.mock("@/lib/data/leave-days", () => ({
  leaveForVolunteers: vi.fn(async () => new Map()),
  leaveCovering: vi.fn(async () => null),
}));

import { getShiftWeekForUser } from "@/lib/data/volunteer-shifts";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function shiftOn(iso: string, id = `s-${iso}`) {
  return {
    id,
    date: day(iso),
    startTime: "09:00",
    endTime: "13:00",
    capacity: 4,
    notes: null,
    offersCloseOn: null,
    serviceArea: { id: "kitchen", name: "Kitchen", description: null },
    signups: [],
    offers: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Wednesday 11 November 2026, 9am in Wellington (NZDT, UTC+13).
  vi.setSystemTime(new Date("2026-11-10T20:00:00.000Z"));
  profileFindUniqueMock.mockResolvedValue({ id: "vp1" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getShiftWeekForUser", () => {
  it("returns this week from today on, and points at the next week with shifts", async () => {
    shiftFindFirstMock
      .mockResolvedValueOnce({ date: day("2026-11-11") })
      // Nothing the week after - the next shift is a fortnight on.
      .mockResolvedValueOnce({ date: day("2026-11-25") });
    shiftFindManyMock.mockResolvedValue([shiftOn("2026-11-11"), shiftOn("2026-11-15")]);

    const page = await getShiftWeekForUser("u1");

    expect(page.weekStart).toBe("2026-11-09");
    expect(page.nextWeek).toBe("2026-11-23");
    expect(page.shifts.map((s) => s.id)).toEqual(["s-2026-11-11", "s-2026-11-15"]);

    // Today in NZ, not Monday: the days already gone stay out.
    expect(shiftFindFirstMock.mock.calls[0][0].where.date).toEqual({ gte: day("2026-11-11") });
    expect(shiftFindManyMock.mock.calls[0][0].where.date).toEqual({
      gte: day("2026-11-11"),
      lte: day("2026-11-15"),
    });
    // The next page starts after this Sunday.
    expect(shiftFindFirstMock.mock.calls[1][0].where.date).toEqual({ gt: day("2026-11-15") });
  });

  it("skips ahead to the first week that has anything on", async () => {
    shiftFindFirstMock
      .mockResolvedValueOnce({ date: day("2026-12-02") })
      .mockResolvedValueOnce(null);
    shiftFindManyMock.mockResolvedValue([shiftOn("2026-12-02")]);

    const page = await getShiftWeekForUser("u1");

    expect(page.weekStart).toBe("2026-11-30");
    expect(page.nextWeek).toBeNull();
    expect(shiftFindManyMock.mock.calls[0][0].where.date).toEqual({
      gte: day("2026-11-30"),
      lte: day("2026-12-06"),
    });
  });

  it("follows `from` to a later week, and keeps the area filter on every query", async () => {
    shiftFindFirstMock
      .mockResolvedValueOnce({ date: day("2026-11-24") })
      .mockResolvedValueOnce({ date: day("2026-12-01") });
    shiftFindManyMock.mockResolvedValue([shiftOn("2026-11-24")]);

    const page = await getShiftWeekForUser("u1", { from: "2026-11-23", serviceAreaId: "kitchen" });

    expect(page).toMatchObject({ weekStart: "2026-11-23", nextWeek: "2026-11-30" });
    expect(shiftFindFirstMock.mock.calls[0][0].where).toEqual({
      date: { gte: day("2026-11-23") },
      serviceAreaId: "kitchen",
    });
    expect(shiftFindFirstMock.mock.calls[1][0].where.serviceAreaId).toBe("kitchen");
    expect(shiftFindManyMock.mock.calls[0][0].where.serviceAreaId).toBe("kitchen");
  });

  it("never pages back before today, whatever `from` says", async () => {
    shiftFindFirstMock.mockResolvedValueOnce(null);

    await getShiftWeekForUser("u1", { from: "2026-10-05" });

    expect(shiftFindFirstMock.mock.calls[0][0].where.date).toEqual({ gte: day("2026-11-11") });
  });

  it("is an empty, final page when nothing is on", async () => {
    shiftFindFirstMock.mockResolvedValueOnce(null);

    expect(await getShiftWeekForUser("u1")).toEqual({
      weekStart: null,
      shifts: [],
      nextWeek: null,
    });
    expect(shiftFindManyMock).not.toHaveBeenCalled();
  });
});
