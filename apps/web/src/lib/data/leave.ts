/**
 * Leave against the database - logging it, changing it, and keeping the
 * roster true to it.
 *
 * Shared by the web Server Actions (volunteer and staff) and the mobile API, so
 * all three log leave the same way. The rules about *who* keeps leave and
 * *which days* are touched live in the pure leave.ts; this file applies them.
 *
 * Leave belongs to the person (`User`). Only someone with a volunteer record is
 * on the roster, so only their leave touches it - a coordinator with no
 * volunteer record just has the dates kept, for the people covering for them:
 *
 * - Days newly covered take the volunteer off shifts there. A seat a pattern
 *   gave them as a regular is deleted, so `rosterRegulars` can seat them again
 *   if the leave goes away; a shift they chose themselves is `CANCELLED`, the
 *   same as if they'd cancelled it, because whether they still want it after
 *   their plans change is theirs to say. Offers waiting on them are declined
 *   so a hold doesn't sit on a spot nobody will take.
 * - Days no longer covered put regulars back on their repeating shifts where
 *   there's still room. One-off shifts are not restored - the spot may well
 *   have gone, and the volunteer can sign up again.
 */

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma, PrismaClient } from "@prisma/client";

import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import { personName } from "@/lib/format";
import {
  dateOnlyOf,
  parseDateOnly,
  todayInAppZone,
  addDaysToDateOnly,
  type DateOnly,
} from "@/lib/date-only";
import {
  deleteLeaveBlocker,
  endLeaveDecision,
  leaveInput,
  leaveLoggedNotice,
  leaveRemovedNotice,
  keepsLeave,
  leaveSaveBlocker,
  rosterChanges,
  type LeaveRange,
} from "@/lib/leave";
import { isSerializationFailure } from "@/lib/data/volunteer-shifts";
import { rosterRegulars } from "@/lib/data/shift-patterns";
import { overlapping, rangeOf } from "@/lib/data/leave-days";

type Db = PrismaClient | Prisma.TransactionClient;

// ─── Types ──────────────────────────────────────────────

/** One stretch of leave, as every screen shows it. Days are calendar days. */
export type LeaveRecord = {
  id: string;
  /** Whose leave it is. */
  userId: string;
  startsOn: DateOnly;
  endsOn: DateOnly;
  reason: string | null;
  createdAt: Date;
  /** Who logged it, or null once their account is gone. */
  loggedBy: { name: string; isSelf: boolean } | null;
};

/** A shift leave takes someone off, for the preview before saving. */
export type LeaveShift = {
  shiftId: string;
  date: DateOnly;
  startTime: string;
  endTime: string;
  serviceAreaName: string;
  /** Their seat came from a repeating shift they're a regular on. */
  isRegular: boolean;
};

export type LeaveOverview = {
  today: DateOnly;
  current: LeaveRecord | null;
  upcoming: LeaveRecord[];
  /** Most recent first, and only the last few - it's a record, not a ledger. */
  past: LeaveRecord[];
};

/**
 * Who is acting. `self` only ever touches their own leave, under the
 * volunteer's rules; `staff` can act on anyone's, their own included.
 */
export type LeaveActor =
  | { kind: "self"; userId: string }
  | { kind: "staff"; userId: string };

export type LeaveMutationResult = {
  error?: string;
  success?: boolean;
  leaveId?: string;
  /** Shifts they came off. */
  removedShifts?: number;
  /** Repeating-shift seats they were given back. */
  restoredShifts?: number;
};

export type LeavePreview = {
  /** Why this leave couldn't be saved as it stands, or null. */
  blocker: string | null;
  /** Shifts saving it would take them off. */
  shifts: LeaveShift[];
};

/** Someone leave can be logged for, in the staff picker. */
export type LeavePersonOption = {
  /** Their user id - leave belongs to the person. */
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isOffline: boolean;
  /** A coordinator or admin. */
  isStaff: boolean;
};

const PAST_SHOWN = 6;

const LEAVE_SELECT = {
  id: true,
  userId: true,
  startsOn: true,
  endsOn: true,
  reason: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { name: true, email: true } },
} satisfies Prisma.LeaveSelect;

type LeaveRow = Prisma.LeaveGetPayload<{ select: typeof LEAVE_SELECT }>;

function toRecord(row: LeaveRow): LeaveRecord {
  return {
    id: row.id,
    userId: row.userId,
    startsOn: dateOnlyOf(row.startsOn),
    endsOn: dateOnlyOf(row.endsOn),
    reason: row.reason,
    createdAt: row.createdAt,
    loggedBy: row.createdBy
      ? {
          name: personName(row.createdBy),
          isSelf: row.createdById === row.userId,
        }
      : null,
  };
}

// ─── Roster reads ───────────────────────────────────────

/** Shifts a volunteer is signed up to across some stretches of days. */
export async function shiftsOnLeaveDays(
  db: Db,
  volunteerId: string,
  windows: LeaveRange[]
): Promise<LeaveShift[]> {
  if (windows.length === 0) return [];

  const signups = await db.shiftSignup.findMany({
    where: {
      volunteerId,
      status: "SIGNED_UP",
      OR: windows.map((window) => ({
        shift: {
          date: {
            gte: parseDateOnly(window.startsOn),
            lte: parseDateOnly(window.endsOn),
          },
        },
      })),
    },
    select: {
      shift: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          serviceArea: { select: { name: true } },
          pattern: {
            select: { regulars: { where: { id: volunteerId }, select: { id: true } } },
          },
        },
      },
    },
  });

  return signups
    .map(({ shift }) => ({
      shiftId: shift.id,
      date: dateOnlyOf(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      serviceAreaName: shift.serviceArea.name,
      isRegular: (shift.pattern?.regulars.length ?? 0) > 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

// ─── Roster writes ──────────────────────────────────────

/** Takes a volunteer off every shift in the windows. Returns what they came off. */
export async function takeOffRoster(
  tx: Prisma.TransactionClient,
  volunteerId: string,
  windows: LeaveRange[]
): Promise<LeaveShift[]> {
  if (windows.length === 0) return [];

  const shifts = await shiftsOnLeaveDays(tx, volunteerId, windows);
  const seats = shifts.filter((shift) => shift.isRegular).map((shift) => shift.shiftId);
  const chosen = shifts.filter((shift) => !shift.isRegular).map((shift) => shift.shiftId);

  if (seats.length > 0) {
    await tx.shiftSignup.deleteMany({
      where: { volunteerId, status: "SIGNED_UP", shiftId: { in: seats } },
    });
  }
  if (chosen.length > 0) {
    await tx.shiftSignup.updateMany({
      where: { volunteerId, status: "SIGNED_UP", shiftId: { in: chosen } },
      data: { status: "CANCELLED" },
    });
  }

  // A hold on a shift they won't be there for is a spot nobody can take.
  await tx.shiftOffer.updateMany({
    where: {
      volunteerId,
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: windows.map((window) => ({
        shift: {
          date: {
            gte: parseDateOnly(window.startsOn),
            lte: parseDateOnly(window.endsOn),
          },
        },
      })),
    },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  return shifts;
}

/**
 * Seats a regular again on their repeating shifts in the windows, where
 * there's room and they haven't a row already. Returns how many seats.
 */
export async function putBackOnRoster(
  tx: Prisma.TransactionClient,
  volunteerId: string,
  windows: LeaveRange[]
): Promise<number> {
  if (windows.length === 0) return 0;

  const volunteer = await tx.volunteerProfile.findUnique({
    where: { id: volunteerId },
    select: { status: true, user: { select: { status: true } } },
  });
  // The same people generation seats - an inactive regular waits for later.
  if (volunteer?.status !== "ACTIVE" || volunteer.user.status !== "ACTIVE") return 0;

  const shifts = await tx.shift.findMany({
    where: {
      pattern: { regulars: { some: { id: volunteerId } } },
      OR: windows.map((window) => ({
        date: {
          gte: parseDateOnly(window.startsOn),
          lte: parseDateOnly(window.endsOn),
        },
      })),
    },
    select: { id: true },
  });

  return rosterRegulars(
    tx,
    shifts.map((shift) => shift.id),
    [volunteerId]
  );
}

// ─── Personal reads ─────────────────────────────────────

/** Someone's leave, split the way their screen shows it. */
export async function getLeaveOverview(
  userId: string,
  today: DateOnly = todayInAppZone()
): Promise<LeaveOverview> {
  const db = getDb();
  const day = parseDateOnly(today);

  const [ahead, past] = await Promise.all([
    db.leave.findMany({
      where: { userId, endsOn: { gte: day } },
      orderBy: { startsOn: "asc" },
      select: LEAVE_SELECT,
    }),
    db.leave.findMany({
      where: { userId, endsOn: { lt: day } },
      orderBy: { endsOn: "desc" },
      take: PAST_SHOWN,
      select: LEAVE_SELECT,
    }),
  ]);

  const records = ahead.map(toRecord);
  return {
    today,
    current: records.find((leave) => leave.startsOn <= today) ?? null,
    upcoming: records.filter((leave) => leave.startsOn > today),
    past: past.map(toRecord),
  };
}

/**
 * Someone's leave, or null when they aren't someone who keeps it - an
 * applicant who hasn't applied yet, say.
 */
export async function getPersonLeave(
  userId: string,
  today: DateOnly = todayInAppZone()
): Promise<LeaveOverview | null> {
  const owner = await findOwner(getDb(), userId);
  return owner?.keepsLeave ? getLeaveOverview(userId, today) : null;
}

// ─── Owners ─────────────────────────────────────────────

/** Whose leave it is, and where they sit on the roster. */
type LeaveOwner = {
  userId: string;
  /** Their volunteer record, if they have one - only then is there a roster to change. */
  volunteerId: string | null;
  keepsLeave: boolean;
};

async function findOwner(db: Db, userId: string): Promise<LeaveOwner | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, volunteerProfile: { select: { id: true } } },
  });
  if (!user) return null;
  const volunteerId = user.volunteerProfile?.id ?? null;
  return {
    userId: user.id,
    volunteerId,
    keepsLeave: keepsLeave({ role: user.role, hasVolunteerProfile: volunteerId !== null }),
  };
}

// ─── Writes ─────────────────────────────────────────────

class LeaveRefused extends Error {}

/** The leave being acted on, checked against who is acting. */
async function loadOwnedLeave(
  tx: Db,
  actor: LeaveActor,
  leaveId: string
): Promise<LeaveRow> {
  const row = await tx.leave.findUnique({
    where: { id: leaveId },
    select: LEAVE_SELECT,
  });
  // Someone else's leave reads as missing, not forbidden - it isn't theirs to know about.
  if (!row || (actor.kind === "self" && row.userId !== actor.userId)) {
    throw new LeaveRefused("That leave couldn't be found. It may have been removed.");
  }
  return row;
}

/** Whose leave a new entry is for: staff name the person, everyone else is themselves. */
async function targetOwner(
  tx: Db,
  actor: LeaveActor,
  userId: string | null
): Promise<LeaveOwner> {
  if (actor.kind === "self") {
    const owner = await findOwner(tx, actor.userId);
    if (!owner?.keepsLeave) {
      throw new LeaveRefused("Leave can be logged once your volunteer application is in.");
    }
    return owner;
  }
  if (!userId) throw new LeaveRefused("Choose who the leave is for.");
  const owner = await findOwner(tx, userId);
  if (!owner?.keepsLeave) {
    throw new LeaveRefused("Leave can only be logged for volunteers and the kitchen team.");
  }
  return owner;
}

/** The owner of leave already logged. */
async function ownerOfLeave(tx: Db, row: LeaveRow): Promise<LeaveOwner> {
  return (
    (await findOwner(tx, row.userId)) ?? { userId: row.userId, volunteerId: null, keepsLeave: false }
  );
}

/** Runs a Serializable transaction, retrying once if it lost a race. */
async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const db = getDb();
  const attempt = () => db.$transaction(work, { isolationLevel: "Serializable" });
  try {
    return await attempt();
  } catch (error) {
    if (!isSerializationFailure(error)) throw error;
    return attempt();
  }
}

function refusedOrFailed(error: unknown, where: string): LeaveMutationResult {
  if (error instanceof LeaveRefused) return { error: error.message };
  console.error(`${where} failed:`, error);
  return { error: "Something went wrong. Please try again." };
}

/**
 * What saving this leave would do, before it's saved - the shifts the
 * volunteer would come off, and anything that would stop it saving.
 */
export async function previewLeave(input: {
  actor: LeaveActor;
  /** Whose leave - staff only, for new leave. */
  userId?: string | null;
  leaveId?: string | null;
  startsOn: string;
  endsOn: string;
}): Promise<LeavePreview | { error: string }> {
  const parsed = leaveInput.safeParse({ startsOn: input.startsOn, endsOn: input.endsOn });
  if (!parsed.success) {
    return { blocker: parsed.error.issues[0]?.message ?? "Check the dates.", shifts: [] };
  }

  const db = getDb();
  const today = todayInAppZone();
  const range = { startsOn: parsed.data.startsOn, endsOn: parsed.data.endsOn };

  try {
    const existing = input.leaveId ? await loadOwnedLeave(db, input.actor, input.leaveId) : null;
    const owner = existing
      ? await ownerOfLeave(db, existing)
      : await targetOwner(db, input.actor, input.userId ?? null);

    const others = await db.leave.findMany({
      where: {
        userId: owner.userId,
        ...(existing ? { id: { not: existing.id } } : {}),
        ...overlapping(range),
      },
      select: { startsOn: true, endsOn: true },
    });

    const before = existing ? rangeOf(existing) : null;
    const blocker = leaveSaveBlocker({ range, today, existing: before, others: others.map(rangeOf) });
    const { takeOff } = rosterChanges({ before, after: range, today });

    const shifts = owner.volunteerId ? await shiftsOnLeaveDays(db, owner.volunteerId, takeOff) : [];
    return { blocker, shifts };
  } catch (error) {
    if (error instanceof LeaveRefused) return { error: error.message };
    throw error;
  }
}

/**
 * Logs new leave, or changes leave already logged, and brings the roster in
 * line: off shifts on newly covered days, back on repeating shifts on days no
 * longer covered.
 */
export async function saveLeave(input: {
  actor: LeaveActor;
  /** Whose leave - staff only, for new leave. */
  userId?: string | null;
  /** Null to log new leave. */
  leaveId?: string | null;
  data: unknown;
}): Promise<LeaveMutationResult> {
  const parsed = leaveInput.safeParse(input.data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the dates." };
  }
  const { startsOn, endsOn, reason } = parsed.data;
  const range = { startsOn, endsOn };
  const today = todayInAppZone();
  const { actor } = input;

  let outcome: {
    leaveId: string;
    ownerUserId: string;
    removed: LeaveShift[];
    restored: number;
    isNew: boolean;
  };
  try {
    outcome = await serializable(async (tx) => {
      const existing = input.leaveId ? await loadOwnedLeave(tx, actor, input.leaveId) : null;
      const owner = existing
        ? await ownerOfLeave(tx, existing)
        : await targetOwner(tx, actor, input.userId ?? null);

      const others = await tx.leave.findMany({
        where: {
          userId: owner.userId,
          ...(existing ? { id: { not: existing.id } } : {}),
          ...overlapping(range),
        },
        select: { startsOn: true, endsOn: true },
      });

      const before = existing ? rangeOf(existing) : null;
      const blocker = leaveSaveBlocker({ range, today, existing: before, others: others.map(rangeOf) });
      if (blocker) throw new LeaveRefused(blocker);

      const data = {
        startsOn: parseDateOnly(startsOn),
        endsOn: parseDateOnly(endsOn),
        reason,
      };
      const saved = existing
        ? await tx.leave.update({ where: { id: existing.id }, data, select: { id: true } })
        : await tx.leave.create({
            data: { ...data, userId: owner.userId, createdById: actor.userId },
            select: { id: true },
          });

      let removed: LeaveShift[] = [];
      let restored = 0;
      if (owner.volunteerId) {
        const changes = rosterChanges({ before, after: range, today });
        removed = await takeOffRoster(tx, owner.volunteerId, changes.takeOff);
        restored = await putBackOnRoster(tx, owner.volunteerId, changes.putBack);
      }

      return { leaveId: saved.id, ownerUserId: owner.userId, removed, restored, isNew: !existing };
    });
  } catch (error) {
    return refusedOrFailed(error, "saveLeave");
  }

  if (loggedForSomeoneElse(actor, outcome.ownerUserId)) {
    const { title, body } = leaveLoggedNotice({
      range,
      removedShifts: outcome.removed.length,
      isNew: outcome.isNew,
    });
    notifyOwner(outcome.ownerUserId, title, body);
  }

  revalidateLeave();
  return {
    success: true,
    leaveId: outcome.leaveId,
    removedShifts: outcome.removed.length,
    restoredShifts: outcome.restored,
  };
}

/** Back early: leave under way ends yesterday, and the roster opens up again. */
export async function endLeave(input: {
  actor: LeaveActor;
  leaveId: string;
}): Promise<LeaveMutationResult> {
  const today = todayInAppZone();

  let restored: number;
  try {
    restored = await serializable(async (tx) => {
      const existing = await loadOwnedLeave(tx, input.actor, input.leaveId);
      const before = rangeOf(existing);
      const decision = endLeaveDecision(before, today);
      if (decision.action === "reject") throw new LeaveRefused(decision.error);

      if (decision.action === "delete") {
        await tx.leave.delete({ where: { id: existing.id } });
      } else {
        await tx.leave.update({
          where: { id: existing.id },
          data: { endsOn: parseDateOnly(decision.endsOn) },
        });
      }

      const { volunteerId } = await ownerOfLeave(tx, existing);
      if (!volunteerId) return 0;
      const after = decision.action === "delete" ? null : { ...before, endsOn: decision.endsOn };
      const { putBack } = rosterChanges({ before, after, today });
      return putBackOnRoster(tx, volunteerId, putBack);
    });
  } catch (error) {
    return refusedOrFailed(error, "endLeave");
  }

  revalidateLeave();
  return { success: true, restoredShifts: restored };
}

/** Removes leave outright - a volunteer cancelling plans, or staff fixing a mistake. */
export async function deleteLeave(input: {
  actor: LeaveActor;
  leaveId: string;
}): Promise<LeaveMutationResult> {
  const today = todayInAppZone();

  let outcome: { restored: number; range: LeaveRange; ownerUserId: string };
  try {
    outcome = await serializable(async (tx) => {
      const existing = await loadOwnedLeave(tx, input.actor, input.leaveId);
      const before = rangeOf(existing);
      const blocker = deleteLeaveBlocker({
        range: before,
        today,
        isStaff: input.actor.kind === "staff",
      });
      if (blocker) throw new LeaveRefused(blocker);

      await tx.leave.delete({ where: { id: existing.id } });
      const { volunteerId } = await ownerOfLeave(tx, existing);
      const { putBack } = rosterChanges({ before, after: null, today });
      const restored = volunteerId ? await putBackOnRoster(tx, volunteerId, putBack) : 0;
      return { restored, range: before, ownerUserId: existing.userId };
    });
  } catch (error) {
    return refusedOrFailed(error, "deleteLeave");
  }

  // Taking away leave that's still ahead changes their plans; tell them.
  if (loggedForSomeoneElse(input.actor, outcome.ownerUserId) && outcome.range.endsOn >= today) {
    const { title, body } = leaveRemovedNotice(outcome.range);
    notifyOwner(outcome.ownerUserId, title, body);
  }

  revalidateLeave();
  return { success: true, restoredShifts: outcome.restored };
}

/** Staff changing someone else's leave - the only change its owner didn't make themselves. */
function loggedForSomeoneElse(actor: LeaveActor, ownerUserId: string): boolean {
  return actor.kind === "staff" && actor.userId !== ownerUserId;
}

/** A push to the person whose leave staff changed. Offline volunteers have no device, so it reaches no one. */
function notifyOwner(userId: string, title: string, body: string) {
  after(() => sendPushToUsers([userId], { title, body, data: { url: "/leave" } }));
}

function revalidateLeave() {
  revalidatePath("/profile");
  revalidatePath("/profile/leave");
  revalidatePath("/dashboard");
  revalidatePath("/shifts");
  revalidatePath("/staff/leave");
  revalidatePath("/staff/volunteers", "layout");
  revalidatePath("/staff/shifts", "layout");
  revalidatePath("/staff/calendar");
  revalidatePath("/staff/dashboard");
}

// ─── Staff reads ────────────────────────────────────────

/** A stretch of leave with the person it belongs to, for staff screens. */
export type StaffLeaveRecord = LeaveRecord & {
  person: {
    userId: string;
    /** Their volunteer record - null for staff who don't volunteer. */
    volunteerId: string | null;
    name: string;
    phone: string | null;
    isOffline: boolean;
    /** A coordinator or admin. */
    isStaff: boolean;
  };
};

export type StaffLeaveOverview = {
  today: DateOnly;
  current: StaffLeaveRecord[];
  upcoming: StaffLeaveRecord[];
  /** Ended in the last `RECENT_DAYS`, most recent first. */
  recent: StaffLeaveRecord[];
};

/** How far back the "recently back" list reaches. */
export const RECENT_DAYS = 30;

const PERSON_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isOffline: true,
  volunteerProfile: { select: { id: true, phone: true } },
} satisfies Prisma.UserSelect;

type PersonRow = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>;

const isStaffRole = (role: PersonRow["role"]) => role === "COORDINATOR" || role === "ADMIN";

const STAFF_LEAVE_SELECT = {
  ...LEAVE_SELECT,
  user: { select: PERSON_SELECT },
} satisfies Prisma.LeaveSelect;

type StaffLeaveRow = Prisma.LeaveGetPayload<{ select: typeof STAFF_LEAVE_SELECT }>;

function toStaffRecord(row: StaffLeaveRow): StaffLeaveRecord {
  return {
    ...toRecord(row),
    person: {
      userId: row.user.id,
      volunteerId: row.user.volunteerProfile?.id ?? null,
      name: personName(row.user),
      phone: row.user.volunteerProfile?.phone ?? null,
      isOffline: row.user.isOffline,
      isStaff: isStaffRole(row.user.role),
    },
  };
}

/** Who's away now, who's going, and who's just back. */
export async function getStaffLeaveOverview(
  today: DateOnly = todayInAppZone()
): Promise<StaffLeaveOverview> {
  const db = getDb();
  const day = parseDateOnly(today);

  const [ahead, recent] = await Promise.all([
    db.leave.findMany({
      where: { endsOn: { gte: day } },
      orderBy: [{ startsOn: "asc" }, { endsOn: "asc" }],
      select: STAFF_LEAVE_SELECT,
    }),
    db.leave.findMany({
      where: {
        endsOn: { lt: day, gte: parseDateOnly(addDaysToDateOnly(today, -RECENT_DAYS)) },
      },
      orderBy: { endsOn: "desc" },
      select: STAFF_LEAVE_SELECT,
    }),
  ]);

  const records = ahead.map(toStaffRecord);
  return {
    today,
    // Back soonest first: who to expect again is the useful order.
    current: records
      .filter((leave) => leave.startsOn <= today)
      .sort((a, b) => a.endsOn.localeCompare(b.endsOn)),
    upcoming: records.filter((leave) => leave.startsOn > today),
    recent: recent.map(toStaffRecord),
  };
}

/** Everyone away at some point in a stretch of days - for the calendar and rosters. */
export async function getLeaveBetween(range: LeaveRange): Promise<StaffLeaveRecord[]> {
  const rows = await getDb().leave.findMany({
    where: overlapping(range),
    orderBy: [{ startsOn: "asc" }],
    select: STAFF_LEAVE_SELECT,
  });
  return rows.map(toStaffRecord);
}

/**
 * Everyone leave can be logged for: the active volunteers on the roster, and
 * the kitchen team - the same people `keepsLeave` allows, less anyone archived
 * or not yet active.
 */
export async function getLeavePeople(): Promise<LeavePersonOption[]> {
  const people = await getDb().user.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { role: { in: ["COORDINATOR", "ADMIN"] } },
        { volunteerProfile: { status: "ACTIVE" } },
      ],
    },
    select: PERSON_SELECT,
    orderBy: { name: "asc" },
  });
  return people.map((person) => ({
    id: person.id,
    name: personName(person),
    email: person.email,
    phone: person.volunteerProfile?.phone ?? null,
    isOffline: person.isOffline,
    isStaff: isStaffRole(person.role),
  }));
}
