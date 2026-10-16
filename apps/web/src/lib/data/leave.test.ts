import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { tx, sendPushToUsers } = vi.hoisted(() => ({
  tx: {
    leave: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    volunteerProfile: { findUnique: vi.fn() },
    shiftSignup: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    shiftOffer: { updateMany: vi.fn() },
    shift: { findMany: vi.fn() },
  },
  sendPushToUsers: vi.fn(),
}));

vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToUsers }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    ...tx,
    $transaction: (work: (client: typeof tx) => unknown) => work(tx),
  }),
}));

import { parseDateOnly } from "@/lib/date-only";
import { deleteLeave, endLeave, previewLeave, saveLeave, takeOffRoster } from "./leave";

const day = parseDateOnly;
const volunteerActor = { kind: "self", userId: "user-1" } as const;
const staffActor = { kind: "staff", userId: "staff-1" } as const;

/**
 * The people in these tests: Aroha volunteers (user-1, volunteer record vol-1),
 * Amanda coordinates without volunteering (staff-1), and Tama has signed up
 * but not yet applied (applicant-1).
 */
const PEOPLE: Record<string, { id: string; role: string; volunteerProfile: { id: string } | null }> = {
  "user-1": { id: "user-1", role: "VOLUNTEER", volunteerProfile: { id: "vol-1" } },
  "staff-1": { id: "staff-1", role: "COORDINATOR", volunteerProfile: null },
  "applicant-1": { id: "applicant-1", role: "PUBLIC", volunteerProfile: null },
};

function leaveRow(startsOn: string, endsOn: string, ownerUserId = "user-1") {
  return {
    id: "leave-1",
    userId: ownerUserId,
    startsOn: day(startsOn),
    endsOn: day(endsOn),
    reason: null,
    createdAt: new Date(),
    createdById: ownerUserId,
    createdBy: { name: "Aroha", email: "aroha@example.org" },
  };
}

function signup(shiftId: string, date: string, isRegular: boolean) {
  return {
    shift: {
      id: shiftId,
      date: day(date),
      startTime: "09:00",
      endTime: "12:00",
      serviceArea: { name: "Kitchen" },
      pattern: isRegular ? { regulars: [{ id: "vol-1" }] } : null,
    },
  };
}

// "Today" is never mocked here: the clock is pinned and the real date code
// works it out. 09:22 on Friday 16 October in Wellington is still Thursday the
// 15th in UTC - where a production server's clock usually sits - so anything
// reading the server's own date instead of the kitchen's fails these tests.
const NZ_FRIDAY_MORNING = new Date("2026-10-15T20:22:00Z");

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NZ_FRIDAY_MORNING);
  vi.clearAllMocks();
  tx.leave.findMany.mockResolvedValue([]);
  tx.shiftSignup.findMany.mockResolvedValue([]);
  tx.shift.findMany.mockResolvedValue([]);
  tx.shiftSignup.createMany.mockResolvedValue({ count: 0 });
  tx.user.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) => PEOPLE[where.id] ?? null
  );
  tx.volunteerProfile.findUnique.mockResolvedValue({
    id: "vol-1",
    userId: "user-1",
    status: "ACTIVE",
    user: { status: "ACTIVE" },
  });
  tx.leave.create.mockResolvedValue({ id: "leave-new" });
  tx.leave.update.mockResolvedValue({ id: "leave-1" });
});

describe("takeOffRoster", () => {
  it("deletes seats a pattern gave them and cancels shifts they chose", async () => {
    tx.shiftSignup.findMany.mockResolvedValue([
      signup("regular-shift", "2026-11-04", true),
      signup("chosen-shift", "2026-11-06", false),
    ]);

    const removed = await takeOffRoster(tx as never, "vol-1", [
      { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    ]);

    expect(removed.map((shift) => shift.shiftId)).toEqual(["regular-shift", "chosen-shift"]);
    // Deleted, so the regular is seated again if the leave goes away.
    expect(tx.shiftSignup.deleteMany).toHaveBeenCalledWith({
      where: { volunteerId: "vol-1", status: "SIGNED_UP", shiftId: { in: ["regular-shift"] } },
    });
    expect(tx.shiftSignup.updateMany).toHaveBeenCalledWith({
      where: { volunteerId: "vol-1", status: "SIGNED_UP", shiftId: { in: ["chosen-shift"] } },
      data: { status: "CANCELLED" },
    });
    expect(tx.shiftOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ volunteerId: "vol-1", status: { in: ["PENDING", "ACCEPTED"] } }),
        data: expect.objectContaining({ status: "DECLINED" }),
      })
    );
  });

  it("touches nothing when there are no days to clear", async () => {
    expect(await takeOffRoster(tx as never, "vol-1", [])).toEqual([]);
    expect(tx.shiftSignup.findMany).not.toHaveBeenCalled();
    expect(tx.shiftOffer.updateMany).not.toHaveBeenCalled();
  });
});

describe("saveLeave", () => {
  it("logs new leave for the signed-in volunteer and clears the roster from today", async () => {
    tx.shiftSignup.findMany.mockResolvedValue([signup("chosen-shift", "2026-10-18", false)]);

    const result = await saveLeave({
      actor: volunteerActor,
      data: { startsOn: "2026-10-12", endsOn: "2026-10-20", reason: "Whānau in Napier" },
    });

    expect(result).toEqual({ success: true, leaveId: "leave-new", removedShifts: 1, restoredShifts: 0 });
    expect(tx.leave.create).toHaveBeenCalledWith({
      data: {
        startsOn: day("2026-10-12"),
        endsOn: day("2026-10-20"),
        reason: "Whānau in Napier",
        userId: "user-1",
        createdById: "user-1",
      },
      select: { id: true },
    });
    // Only today onwards: the days already gone are history.
    expect(tx.shiftSignup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ shift: { date: { gte: day("2026-10-16"), lte: day("2026-10-20") } } }],
        }),
      })
    );
    // They did it themselves, so there's nobody to tell.
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("refuses leave overlapping leave already logged", async () => {
    tx.leave.findMany.mockResolvedValue([
      { startsOn: day("2026-11-10"), endsOn: day("2026-11-20") },
    ]);

    const result = await saveLeave({
      actor: volunteerActor,
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });

    expect(result).toEqual({ error: "That overlaps leave already logged for 10 – 20 Nov." });
    expect(tx.leave.create).not.toHaveBeenCalled();
  });

  it("won't let a volunteer change someone else's leave", async () => {
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-11-03", "2026-11-14", "someone-else"));

    const result = await saveLeave({
      actor: volunteerActor,
      leaveId: "leave-1",
      data: { startsOn: "2026-11-03", endsOn: "2026-11-20" },
    });

    expect(result.error).toMatch(/couldn't be found/);
    expect(tx.leave.update).not.toHaveBeenCalled();
  });

  it("tells the volunteer when staff log leave for them", async () => {
    tx.shiftSignup.findMany.mockResolvedValue([
      signup("a", "2026-11-04", true),
      signup("b", "2026-11-05", false),
    ]);

    await saveLeave({
      actor: staffActor,
      userId: "user-1",
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });

    expect(sendPushToUsers).toHaveBeenCalledWith(["user-1"], {
      title: "Your leave is logged",
      body: "The kitchen has you away 3 – 14 Nov. You're off 2 shifts while you're away. Kia pai tō wā.",
      data: { url: "/leave" },
    });
  });

  it("puts a regular back on the days a shortened leave gives up", async () => {
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-11-03", "2026-11-20"));
    tx.shift.findMany
      // Their pattern shifts on the days given back.
      .mockResolvedValueOnce([{ id: "pattern-shift" }])
      // rosterRegulars reading the shift.
      .mockResolvedValueOnce([
        { id: "pattern-shift", date: day("2026-11-18"), capacity: 4, signups: [] },
      ]);
    tx.shiftSignup.createMany.mockResolvedValue({ count: 1 });

    const result = await saveLeave({
      actor: volunteerActor,
      leaveId: "leave-1",
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });

    expect(result).toMatchObject({ success: true, removedShifts: 0, restoredShifts: 1 });
    expect(tx.shift.findMany.mock.calls[0][0].where.OR).toEqual([
      { date: { gte: day("2026-11-15"), lte: day("2026-11-20") } },
    ]);
    expect(tx.shiftSignup.createMany).toHaveBeenCalledWith({
      data: [{ shiftId: "pattern-shift", volunteerId: "vol-1" }],
      skipDuplicates: true,
    });
  });
});

describe("leave for the kitchen team", () => {
  it("lets a coordinator with no volunteer record log their own leave, leaving the roster alone", async () => {
    const result = await saveLeave({
      actor: staffActor,
      userId: "staff-1",
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14", reason: "Rarotonga" },
    });

    expect(result).toEqual({ success: true, leaveId: "leave-new", removedShifts: 0, restoredShifts: 0 });
    expect(tx.leave.create).toHaveBeenCalledWith({
      data: {
        startsOn: day("2026-11-03"),
        endsOn: day("2026-11-14"),
        reason: "Rarotonga",
        userId: "staff-1",
        createdById: "staff-1",
      },
      select: { id: true },
    });
    // Nobody to take off shifts - they aren't on the roster.
    expect(tx.shiftSignup.findMany).not.toHaveBeenCalled();
    expect(tx.shiftOffer.updateMany).not.toHaveBeenCalled();
    // And nobody to tell: they did it themselves.
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("lets them log it from the app too, where they act as themselves", async () => {
    const result = await saveLeave({
      actor: { kind: "self", userId: "staff-1" },
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });

    expect(result).toMatchObject({ success: true });
    expect(tx.leave.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "staff-1" }) })
    );
  });

  it("previews no shifts for them without reading the roster", async () => {
    const preview = await previewLeave({
      actor: staffActor,
      userId: "staff-1",
      startsOn: "2026-11-03",
      endsOn: "2026-11-14",
    });

    expect(preview).toEqual({ blocker: null, shifts: [] });
    expect(tx.shiftSignup.findMany).not.toHaveBeenCalled();
  });

  it("doesn't push a coordinator about leave they removed themselves", async () => {
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-11-03", "2026-11-14", "staff-1"));

    const result = await deleteLeave({ actor: staffActor, leaveId: "leave-1" });

    expect(result).toMatchObject({ success: true, restoredShifts: 0 });
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("still waits for an application from someone who has only signed up", async () => {
    const own = await saveLeave({
      actor: { kind: "self", userId: "applicant-1" },
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });
    expect(own.error).toMatch(/once your volunteer application is in/);

    const byStaff = await saveLeave({
      actor: staffActor,
      userId: "applicant-1",
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });
    expect(byStaff.error).toMatch(/only be logged for volunteers and the kitchen team/);
    expect(tx.leave.create).not.toHaveBeenCalled();
  });

  it("asks staff who the leave is for when they haven't said", async () => {
    const result = await saveLeave({
      actor: staffActor,
      data: { startsOn: "2026-11-03", endsOn: "2026-11-14" },
    });
    expect(result.error).toBe("Choose who the leave is for.");
  });
});

describe("endLeave", () => {
  it("keeps the days away and ends the leave yesterday", async () => {
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-10-10", "2026-10-25"));

    const result = await endLeave({ actor: volunteerActor, leaveId: "leave-1" });

    expect(result).toMatchObject({ success: true });
    expect(tx.leave.update).toHaveBeenCalledWith({
      where: { id: "leave-1" },
      data: { endsOn: day("2026-10-15") },
    });
  });
});

describe("deleteLeave", () => {
  it("won't let a volunteer erase leave they're on", async () => {
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-10-10", "2026-10-25"));

    const result = await deleteLeave({ actor: volunteerActor, leaveId: "leave-1" });

    expect(result.error).toMatch(/I'm back/);
    expect(tx.leave.delete).not.toHaveBeenCalled();
  });

  it("lets staff remove it, and tells the volunteer", async () => {
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-10-10", "2026-10-25"));

    const result = await deleteLeave({ actor: staffActor, leaveId: "leave-1" });

    expect(result).toMatchObject({ success: true });
    expect(tx.leave.delete).toHaveBeenCalledWith({ where: { id: "leave-1" } });
    expect(sendPushToUsers).toHaveBeenCalledWith(
      ["user-1"],
      expect.objectContaining({ title: "Your leave has changed" })
    );
  });
});

describe("in New Zealand time", () => {
  it("treats Friday morning in Wellington as Friday, though UTC is still Thursday", async () => {
    // Leave for Thursday alone has finished in NZ - even though it's Thursday in UTC.
    const thursday = await saveLeave({
      actor: volunteerActor,
      data: { startsOn: "2026-10-15", endsOn: "2026-10-15" },
    });
    expect(thursday.error).toMatch(/already finished/);

    // Leave for Friday is today's, and clears Friday's roster.
    const friday = await saveLeave({
      actor: volunteerActor,
      data: { startsOn: "2026-10-16", endsOn: "2026-10-16" },
    });
    expect(friday).toMatchObject({ success: true });
    expect(tx.shiftSignup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ shift: { date: { gte: day("2026-10-16"), lte: day("2026-10-16") } } }],
        }),
      })
    );
  });

  it("still says Friday at 11:30pm in Wellington, when UTC has long been Friday too", async () => {
    vi.setSystemTime(new Date("2026-10-16T10:30:00Z"));
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-10-10", "2026-10-25"));

    await endLeave({ actor: volunteerActor, leaveId: "leave-1" });

    // Back early on Friday: the last day away is Thursday.
    expect(tx.leave.update).toHaveBeenCalledWith({
      where: { id: "leave-1" },
      data: { endsOn: day("2026-10-15") },
    });
  });

  it("rolls over at Wellington midnight, not UTC midnight", async () => {
    // 00:30 Saturday in Wellington is 11:30 Friday in UTC.
    vi.setSystemTime(new Date("2026-10-16T11:30:00Z"));
    tx.leave.findUnique.mockResolvedValue(leaveRow("2026-10-10", "2026-10-25"));

    await endLeave({ actor: volunteerActor, leaveId: "leave-1" });

    expect(tx.leave.update).toHaveBeenCalledWith({
      where: { id: "leave-1" },
      data: { endsOn: day("2026-10-16") },
    });
  });

  it("keeps the day straight on the night daylight saving ends", async () => {
    // 01:30 NZST on Sunday 4 April 2027 - clocks went back at 3am NZDT.
    vi.setSystemTime(new Date("2027-04-03T13:30:00Z"));
    tx.leave.findUnique.mockResolvedValue(leaveRow("2027-04-01", "2027-04-10"));

    await endLeave({ actor: volunteerActor, leaveId: "leave-1" });

    expect(tx.leave.update).toHaveBeenCalledWith({
      where: { id: "leave-1" },
      data: { endsOn: day("2027-04-03") },
    });
  });
});
