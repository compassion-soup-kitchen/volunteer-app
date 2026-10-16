import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const shiftCreateMock = vi.fn();
const shiftFindUniqueMock = vi.fn();
const shiftUpdateMock = vi.fn();
const profileFindManyMock = vi.fn();
const sendPushMock = vi.fn();
const closedDayFindUniqueMock = vi.fn();
const signupFindUniqueMock = vi.fn();
const signupCreateMock = vi.fn();
const signupUpdateMock = vi.fn();
const offerUpdateManyMock = vi.fn();
const profileFindUniqueMock = vi.fn();
const leaveFindFirstMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

// The account-liveness re-read that every Server Action now does (see
// `action-auth.ts`). Stubbed active here so these tests keep exercising the
// auth gate itself; `session-account.test.ts` covers the check.
vi.mock("@/lib/data/session-account", () => ({
  isSessionAccountActive: () => Promise.resolve(true),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    shift: {
      create: shiftCreateMock,
      findUnique: shiftFindUniqueMock,
      update: shiftUpdateMock,
    },
    volunteerProfile: {
      findMany: profileFindManyMock,
      findUnique: profileFindUniqueMock,
    },
    closedDay: { findUnique: closedDayFindUniqueMock },
    shiftSignup: {
      findUnique: signupFindUniqueMock,
      create: signupCreateMock,
      update: signupUpdateMock,
    },
    shiftOffer: { updateMany: offerUpdateManyMock },
    // Interactive transactions run against the same mocks.
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        shift: { findUnique: shiftFindUniqueMock },
        volunteerProfile: { findUnique: profileFindUniqueMock },
        shiftSignup: {
          findUnique: signupFindUniqueMock,
          create: signupCreateMock,
          update: signupUpdateMock,
        },
        shiftOffer: { updateMany: offerUpdateManyMock },
        leave: { findFirst: leaveFindFirstMock },
      }),
  }),
}));

vi.mock("@/lib/push", () => ({
  sendPushToUsers: (...args: unknown[]) => sendPushMock(...args),
}));

// `after` defers work past the response; run it inline so the test can see it.
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
  connection: async () => {},
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { todayInAppZone } from "@/lib/date-only";
import {
  addVolunteerToShift,
  createShift,
  updateShift,
} from "@/lib/shift-actions";
import type { ShiftFormData } from "@/lib/shift-form";

const COORDINATOR = {
  user: { id: "user-coord", role: "COORDINATOR" },
};

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** A day comfortably ahead of whenever the suite runs. */
function daysFromToday(days: number): string {
  const date = day(todayInAppZone());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const form = (overrides: Partial<ShiftFormData> = {}): ShiftFormData => ({
  serviceAreaId: "area-kitchen",
  date: daysFromToday(14),
  startTime: "09:00",
  endTime: "13:00",
  capacity: 6,
  ...overrides,
});

const storedShift = (overrides: Record<string, unknown> = {}) => ({
  date: day(daysFromToday(14)),
  startTime: "09:00",
  endTime: "13:00",
  serviceAreaId: "area-kitchen",
  capacity: 6,
  offersCloseOn: null,
  signups: [],
  offers: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(COORDINATOR);
  shiftCreateMock.mockResolvedValue({
    id: "shift-1",
    date: day(daysFromToday(14)),
    startTime: "09:00",
    endTime: "13:00",
    offersCloseOn: null,
    serviceArea: { name: "Kitchen & Meals" },
  });
  shiftUpdateMock.mockResolvedValue({
    id: "shift-1",
    date: day(daysFromToday(14)),
    startTime: "09:00",
    endTime: "13:00",
    offersCloseOn: null,
    serviceArea: { name: "Kitchen & Meals" },
  });
  profileFindManyMock.mockResolvedValue([]);
  closedDayFindUniqueMock.mockResolvedValue(null);
});

describe("createShift", () => {
  it("turns volunteers away when they aren't staff", async () => {
    authMock.mockResolvedValue({ user: { id: "user-vol", role: "VOLUNTEER" } });
    expect(await createShift(form())).toEqual({ error: "Not authorised." });
    expect(shiftCreateMock).not.toHaveBeenCalled();
  });

  it("turns away a signed-out caller", async () => {
    authMock.mockResolvedValue(null);
    expect(await createShift(form())).toEqual({ error: "Not authorised." });
  });

  it("stores the picked day, not the day either side of it", async () => {
    const date = daysFromToday(14);
    await createShift(form({ date }));

    expect(shiftCreateMock).toHaveBeenCalledTimes(1);
    const written = shiftCreateMock.mock.calls[0][0].data;
    expect(written.date.toISOString()).toBe(`${date}T00:00:00.000Z`);
    expect(written.createdById).toBe("user-coord");
  });

  it("rejects a bad payload before touching the database", async () => {
    const result = await createShift(form({ startTime: "13:00", endTime: "09:00" }));
    expect(result).toEqual({ error: "End time must be after start time." });
    expect(shiftCreateMock).not.toHaveBeenCalled();
  });

  it("creates the offers alongside the shift", async () => {
    await createShift(
      form({
        offeredVolunteerIds: ["vol-1", "vol-2"],
        offersCloseOn: daysFromToday(10),
      })
    );

    const written = shiftCreateMock.mock.calls[0][0].data;
    expect(written.offers.create).toEqual([
      { volunteerId: "vol-1" },
      { volunteerId: "vol-2" },
    ]);
  });

  it("refuses a first-refusal hold that closes after the shift", async () => {
    const result = await createShift(
      form({
        date: daysFromToday(14),
        offeredVolunteerIds: ["vol-1"],
        offersCloseOn: daysFromToday(20),
      })
    );

    expect(result.error).toMatch(/on or before the day of the shift/);
    expect(shiftCreateMock).not.toHaveBeenCalled();
  });
});

describe("updateShift", () => {
  it("turns away a caller who isn't staff", async () => {
    authMock.mockResolvedValue({ user: { id: "user-vol", role: "VOLUNTEER" } });
    expect(await updateShift("shift-1", form())).toEqual({
      error: "Not authorised.",
    });
    expect(shiftFindUniqueMock).not.toHaveBeenCalled();
  });

  it("reports a shift that no longer exists", async () => {
    shiftFindUniqueMock.mockResolvedValue(null);
    expect(await updateShift("shift-1", form())).toEqual({
      error: "Shift not found.",
    });
  });

  it("saves a corrected time", async () => {
    shiftFindUniqueMock.mockResolvedValue(storedShift());

    const result = await updateShift(
      "shift-1",
      form({ startTime: "17:00", endTime: "20:00" })
    );

    expect(result).toEqual({ success: true });
    const written = shiftUpdateMock.mock.calls[0][0].data;
    expect(written.startTime).toBe("17:00");
    expect(written.endTime).toBe("20:00");
  });

  // The regression: a hold that closed days ago is history, and the shift it
  // belongs to is still an ordinary upcoming shift that staff may need to fix.
  it("lets a shift be edited after its first-refusal hold has closed", async () => {
    const lapsed = daysFromToday(-3);
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({
        offersCloseOn: day(lapsed),
        offers: [{ volunteerId: "vol-1" }],
      })
    );

    const result = await updateShift(
      "shift-1",
      form({
        startTime: "17:00",
        endTime: "20:00",
        offeredVolunteerIds: ["vol-1"],
        offersCloseOn: lapsed,
      })
    );

    expect(result).toEqual({ success: true });
    const written = shiftUpdateMock.mock.calls[0][0].data;
    expect(written.startTime).toBe("17:00");
    expect(written.offersCloseOn?.toISOString()).toBe(`${lapsed}T00:00:00.000Z`);
  });

  it("does not page anyone about a hold that has already lapsed", async () => {
    const lapsed = daysFromToday(-3);
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({ offersCloseOn: day(lapsed), offers: [] })
    );
    shiftUpdateMock.mockResolvedValue({
      id: "shift-1",
      date: day(daysFromToday(14)),
      startTime: "09:00",
      endTime: "13:00",
      offersCloseOn: day(lapsed),
      serviceArea: { name: "Kitchen & Meals" },
    });

    await updateShift(
      "shift-1",
      form({ offeredVolunteerIds: ["vol-1"], offersCloseOn: lapsed })
    );

    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("keeps capacity at or above the volunteers already booked", async () => {
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({
        signups: [
          { status: "SIGNED_UP", volunteer: { userId: "user-1" } },
          { status: "SIGNED_UP", volunteer: { userId: "user-2" } },
          { status: "SIGNED_UP", volunteer: { userId: "user-3" } },
        ],
      })
    );

    const result = await updateShift("shift-1", form({ capacity: 2 }));

    expect(result.error).toMatch(/3 volunteers are already signed up/);
    expect(shiftUpdateMock).not.toHaveBeenCalled();
  });

  // Attendance doesn't free the spot back up — those volunteers were there.
  it("counts volunteers already marked attended toward that floor", async () => {
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({
        signups: [
          { status: "ATTENDED", volunteer: { userId: "user-1" } },
          { status: "ATTENDED", volunteer: { userId: "user-2" } },
        ],
      })
    );

    const result = await updateShift("shift-1", form({ capacity: 1 }));

    expect(result.error).toMatch(/2 volunteers are already signed up/);
    expect(shiftUpdateMock).not.toHaveBeenCalled();
  });

  it("allows capacity to sit exactly on the number booked", async () => {
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({
        signups: [
          { status: "SIGNED_UP", volunteer: { userId: "user-1" } },
          { status: "ATTENDED", volunteer: { userId: "user-2" } },
        ],
      })
    );

    expect(await updateShift("shift-1", form({ capacity: 2 }))).toEqual({
      success: true,
    });
  });

  it("tells volunteers still expected when the shift moves", async () => {
    const moved = daysFromToday(21);
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({
        signups: [
          { status: "SIGNED_UP", volunteer: { userId: "user-1" } },
          { status: "ATTENDED", volunteer: { userId: "user-past" } },
        ],
      })
    );
    shiftUpdateMock.mockResolvedValue({
      id: "shift-1",
      date: day(moved),
      startTime: "09:00",
      endTime: "13:00",
      offersCloseOn: null,
      serviceArea: { name: "Kitchen & Meals" },
    });

    await updateShift("shift-1", form({ date: moved }));

    expect(sendPushMock).toHaveBeenCalledTimes(1);
    expect(sendPushMock.mock.calls[0][0]).toEqual(["user-1"]);
  });

  it("drops the offers of volunteers taken off the list", async () => {
    shiftFindUniqueMock.mockResolvedValue(
      storedShift({
        offersCloseOn: day(daysFromToday(10)),
        offers: [{ volunteerId: "vol-1" }, { volunteerId: "vol-2" }],
      })
    );

    await updateShift(
      "shift-1",
      form({
        offeredVolunteerIds: ["vol-2", "vol-3"],
        offersCloseOn: daysFromToday(10),
      })
    );

    const written = shiftUpdateMock.mock.calls[0][0].data;
    expect(written.offers.deleteMany).toEqual({
      volunteerId: { notIn: ["vol-2", "vol-3"] },
    });
    // vol-2 keeps the offer it already has; only vol-3 is new.
    expect(written.offers.create).toEqual([{ volunteerId: "vol-3" }]);
  });
});

describe("closed days", () => {
  it("refuses to create a shift on a day the kitchen is closed", async () => {
    closedDayFindUniqueMock.mockResolvedValue({
      date: day("2026-10-26"),
      reason: "Labour Day",
    });

    const result = await createShift(form());

    expect(result.error).toMatch(/The kitchen is closed on .*\(Labour Day\)/);
    expect(shiftCreateMock).not.toHaveBeenCalled();
  });

  it("refuses to move a shift onto a closed day", async () => {
    shiftFindUniqueMock.mockResolvedValue(storedShift());
    closedDayFindUniqueMock.mockResolvedValue({
      date: day(daysFromToday(21)),
      reason: "Staff training",
    });

    const result = await updateShift("shift-1", form({ date: daysFromToday(21) }));

    expect(result.error).toMatch(/Staff training/);
    expect(shiftUpdateMock).not.toHaveBeenCalled();
  });

  it("lets a shift already on a since-closed day be edited in place", async () => {
    shiftFindUniqueMock.mockResolvedValue(storedShift());
    closedDayFindUniqueMock.mockResolvedValue({
      date: day(daysFromToday(14)),
      reason: "Labour Day",
    });

    const result = await updateShift("shift-1", form({ capacity: 8 }));

    expect(result.success).toBe(true);
    expect(closedDayFindUniqueMock).not.toHaveBeenCalled();
  });
});

describe("addVolunteerToShift", () => {
  const rosterShift = (date: string, overrides: Record<string, unknown> = {}) => ({
    date: day(date),
    startTime: "07:00",
    endTime: "10:00",
    capacity: 4,
    serviceArea: { name: "Breakfast" },
    _count: { signups: 1 },
    ...overrides,
  });

  beforeEach(() => {
    profileFindUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      userId: "user-david",
      user: { status: "ACTIVE" },
    });
    signupFindUniqueMock.mockResolvedValue(null);
    leaveFindFirstMock.mockResolvedValue(null);
  });

  it("refuses someone on leave that day, and adds nothing", async () => {
    shiftFindUniqueMock.mockResolvedValue(rosterShift(daysFromToday(7)));
    leaveFindFirstMock.mockResolvedValue({
      startsOn: day(daysFromToday(5)),
      endsOn: day(daysFromToday(9)),
    });

    const result = await addVolunteerToShift("shift-1", "vol-david");

    expect(result.error).toMatch(/on leave that day/);
    expect(signupCreateMock).not.toHaveBeenCalled();
  });

  it("refuses anyone who isn't staff", async () => {
    authMock.mockResolvedValue({ user: { id: "v", role: "VOLUNTEER" } });
    expect(await addVolunteerToShift("shift-1", "vol-david")).toEqual({
      error: "Not authorised.",
    });
  });

  it("signs a volunteer up for an upcoming shift and tells them", async () => {
    shiftFindUniqueMock.mockResolvedValue(rosterShift(daysFromToday(7)));

    const result = await addVolunteerToShift("shift-1", "vol-david");

    expect(result).toEqual({ success: true });
    expect(signupCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shiftId: "shift-1",
        volunteerId: "vol-david",
        status: "SIGNED_UP",
        attendanceMarkedById: null,
      }),
    });
    expect(offerUpdateManyMock).toHaveBeenCalled();
    expect(sendPushMock).toHaveBeenCalledWith(
      ["user-david"],
      expect.objectContaining({ title: "You're on the roster" })
    );
  });

  // How an offline volunteer's hours get logged.
  it("records attendance when added to a shift that has passed", async () => {
    shiftFindUniqueMock.mockResolvedValue(rosterShift(daysFromToday(-3)));

    await addVolunteerToShift("shift-1", "vol-david");

    expect(signupCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ATTENDED",
        attendanceMarkedById: "user-coord",
        attendanceMarkedAt: expect.any(Date),
      }),
    });
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("reuses a cancelled row rather than duplicating it", async () => {
    shiftFindUniqueMock.mockResolvedValue(rosterShift(daysFromToday(7)));
    signupFindUniqueMock.mockResolvedValue({ id: "signup-1", status: "CANCELLED" });

    await addVolunteerToShift("shift-1", "vol-david");

    expect(signupUpdateMock).toHaveBeenCalledWith({
      where: { id: "signup-1" },
      data: expect.objectContaining({ status: "SIGNED_UP" }),
    });
    expect(signupCreateMock).not.toHaveBeenCalled();
  });

  it("refuses a full shift", async () => {
    shiftFindUniqueMock.mockResolvedValue(
      rosterShift(daysFromToday(7), { _count: { signups: 4 } })
    );

    const result = await addVolunteerToShift("shift-1", "vol-david");

    expect(result.error).toMatch(/full/);
    expect(signupCreateMock).not.toHaveBeenCalled();
  });
});
