"use server";

import { after, connection } from "next/server";
import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import { formatTimeRange } from "@/lib/format";
import { sendPushToUsers } from "@/lib/push";
import {
  dateOnlyOf,
  parseDateOnly,
  todayInAppZone,
  type DateOnly,
} from "@/lib/date-only";
import {
  describeRecurrence,
  diffRegulars,
  endsOnError,
  firstIssue,
  patternStoppedNotice,
  regularWelcomeNotice,
  shiftPatternInput,
  shiftPatternUpdateInput,
  startsOnError,
  type ShiftPatternFormData,
  type ShiftPatternUpdateData,
} from "@/lib/shift-patterns";
import {
  materialisePattern,
  patternForGeneration,
  releaseRegulars,
  removePatternShiftsAfter,
  rosterRegulars,
} from "@/lib/data/shift-patterns";
import {
  notifyRemovedShifts,
  type RemovedShift,
} from "@/lib/data/shift-cancellation";
import type { GroupChip } from "@/lib/volunteer-groups";

// ─── Types ──────────────────────────────────────────────

export type ShiftPatternSummary = {
  id: string;
  serviceArea: { id: string; name: string };
  weekdays: number[];
  interval: number;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  startsOn: DateOnly;
  endsOn: DateOnly | null;
  regulars: {
    id: string;
    name: string | null;
    email: string | null;
    isOffline: boolean;
    groups: GroupChip[];
  }[];
  /** Shifts from today on that came from this pattern. */
  upcomingShiftCount: number;
  /** The soonest of those, if any. */
  nextShift: { id: string; date: DateOnly } | null;
};

type Result = { error?: string; success?: boolean };

// ─── Reads ──────────────────────────────────────────────

const summarySelect = (today: Date) =>
  ({
    id: true,
    serviceArea: { select: { id: true, name: true } },
    weekdays: true,
    interval: true,
    startTime: true,
    endTime: true,
    capacity: true,
    notes: true,
    startsOn: true,
    endsOn: true,
    regulars: {
      orderBy: { user: { name: "asc" } },
      select: {
        id: true,
        user: { select: { name: true, email: true, isOffline: true } },
        groups: {
          where: { isArchived: false },
          orderBy: { name: "asc" },
          select: { id: true, name: true, tone: true },
        },
      },
    },
    shifts: {
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      take: 1,
      select: { id: true, date: true },
    },
    _count: { select: { shifts: { where: { date: { gte: today } } } } },
  }) as const;

type SummaryRow = {
  id: string;
  serviceArea: { id: string; name: string };
  weekdays: number[];
  interval: number;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  startsOn: Date;
  endsOn: Date | null;
  regulars: {
    id: string;
    user: { name: string | null; email: string | null; isOffline: boolean };
    groups: GroupChip[];
  }[];
  shifts: { id: string; date: Date }[];
  _count: { shifts: number };
};

function toSummary(row: SummaryRow): ShiftPatternSummary {
  return {
    id: row.id,
    serviceArea: row.serviceArea,
    weekdays: [...row.weekdays].sort((a, b) => a - b),
    interval: row.interval,
    startTime: row.startTime,
    endTime: row.endTime,
    capacity: row.capacity,
    notes: row.notes,
    startsOn: dateOnlyOf(row.startsOn),
    endsOn: row.endsOn ? dateOnlyOf(row.endsOn) : null,
    regulars: row.regulars.map((regular) => ({
      id: regular.id,
      name: regular.user.name,
      email: regular.user.email,
      isOffline: regular.user.isOffline,
      groups: regular.groups,
    })),
    upcomingShiftCount: row._count.shifts,
    nextShift: row.shifts[0]
      ? { id: row.shifts[0].id, date: dateOnlyOf(row.shifts[0].date) }
      : null,
  };
}

/** Every repeating shift, running ones first. */
export async function getShiftPatterns(): Promise<ShiftPatternSummary[]> {
  await connection();
  const session = await requireStaffSession();
  if (!session) return [];

  const today = parseDateOnly(todayInAppZone());
  const rows = await getDb().shiftPattern.findMany({
    orderBy: [{ serviceArea: { name: "asc" } }, { startTime: "asc" }],
    select: summarySelect(today),
  });

  const summaries = rows.map(toSummary);
  const todayKey = dateOnlyOf(today);
  const running = (p: ShiftPatternSummary) => p.endsOn === null || p.endsOn >= todayKey;
  return [...summaries.filter(running), ...summaries.filter((p) => !running(p))];
}

export async function getShiftPattern(id: string): Promise<ShiftPatternSummary | null> {
  await connection();
  const session = await requireStaffSession();
  if (!session) return null;

  const today = parseDateOnly(todayInAppZone());
  const row = await getDb().shiftPattern.findUnique({
    where: { id },
    select: summarySelect(today),
  });
  return row ? toSummary(row) : null;
}

// ─── Writes ─────────────────────────────────────────────

/** Regulars must be people who can actually be rostered. */
async function checkRegulars(ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;
  const count = await getDb().volunteerProfile.count({
    where: { id: { in: ids }, status: "ACTIVE", user: { status: "ACTIVE" } },
  });
  return count === ids.length
    ? null
    : "Someone you picked as a regular can't be rostered right now - they may have been archived or paused.";
}

/** Lets each new regular know they're on the roster. */
function welcomeRegulars(
  profileIds: string[],
  pattern: {
    serviceAreaName: string;
    weekdays: number[];
    interval: number;
    startTime: string;
    endTime: string;
  }
) {
  if (profileIds.length === 0) return;
  const notice = regularWelcomeNotice({
    serviceAreaName: pattern.serviceAreaName,
    recurrence: describeRecurrence(pattern.weekdays, pattern.interval),
    timeRange: formatTimeRange(pattern.startTime, pattern.endTime),
  });
  after(async () => {
    const profiles = await getDb().volunteerProfile.findMany({
      where: { id: { in: profileIds } },
      select: { userId: true },
    });
    await sendPushToUsers(
      profiles.map((profile) => profile.userId),
      { ...notice, data: { url: "/schedule" } }
    );
  });
}

function notifyStopped(removed: RemovedShift[]) {
  if (removed.length === 0) return;
  after(() =>
    notifyRemovedShifts(removed, (shift) =>
      patternStoppedNotice({
        serviceAreaName: shift.serviceAreaName,
        dayLabel: shift.dayLabel,
      })
    )
  );
}

function revalidatePatterns(id?: string) {
  revalidatePath("/staff/shifts");
  revalidatePath("/staff/shifts/repeating");
  if (id) revalidatePath(`/staff/shifts/repeating/${id}`);
  revalidatePath("/staff/calendar");
  revalidatePath("/shifts");
  revalidatePath("/dashboard");
}

/**
 * Sets up a repeating shift and puts its first twelve weeks on the roster,
 * regulars and all.
 */
export async function createShiftPattern(
  data: ShiftPatternFormData
): Promise<Result & { id?: string; placed?: number }> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const parsed = shiftPatternInput.safeParse(data);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const input = parsed.data;

  const today = todayInAppZone();
  const dateError = startsOnError(input.startsOn, today) ?? endsOnError(input.endsOn, today);
  if (dateError) return { error: dateError };

  const regularsError = await checkRegulars(input.regularIds);
  if (regularsError) return { error: regularsError };

  const db = getDb();
  const area = await db.serviceArea.findUnique({
    where: { id: input.serviceAreaId },
    select: { name: true, isArchived: true },
  });
  if (!area || area.isArchived) return { error: "Please select a service area." };

  try {
    const pattern = await db.shiftPattern.create({
      data: {
        serviceAreaId: input.serviceAreaId,
        weekdays: input.weekdays,
        interval: input.interval,
        startTime: input.startTime,
        endTime: input.endTime,
        capacity: input.capacity,
        notes: input.notes || null,
        startsOn: parseDateOnly(input.startsOn),
        endsOn: input.endsOn ? parseDateOnly(input.endsOn) : null,
        createdById: session.user.id,
        regulars: { connect: input.regularIds.map((id) => ({ id })) },
      },
      select: patternForGeneration,
    });

    const placed = await materialisePattern(db, pattern, today);

    welcomeRegulars(input.regularIds, {
      serviceAreaName: area.name,
      weekdays: input.weekdays,
      interval: input.interval,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    revalidatePatterns(pattern.id);
    return { success: true, id: pattern.id, placed };
  } catch (error) {
    console.error("createShiftPattern failed:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Changes what a running pattern can change - capacity, notes, end date and
 * regulars - and carries it onto the shifts already rostered from today on.
 * Day, time and service area are fixed: changing those is a different shift,
 * so the coordinator stops this one and sets up the new one.
 */
export async function updateShiftPattern(
  id: string,
  data: ShiftPatternUpdateData
): Promise<Result & { capacitySkipped?: number }> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const parsed = shiftPatternUpdateInput.safeParse(data);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const input = parsed.data;

  const today = todayInAppZone();
  const endError = endsOnError(input.endsOn, today);
  if (endError) return { error: endError };

  const db = getDb();
  const existing = await db.shiftPattern.findUnique({
    where: { id },
    select: {
      startsOn: true,
      endsOn: true,
      weekdays: true,
      interval: true,
      startTime: true,
      endTime: true,
      serviceArea: { select: { name: true } },
      regulars: { select: { id: true } },
    },
  });
  if (!existing) return { error: "That repeating shift no longer exists." };
  if (input.endsOn && input.endsOn < dateOnlyOf(existing.startsOn)) {
    return { error: "The last day must be on or after the first." };
  }

  const { added, removed } = diffRegulars(
    existing.regulars.map((regular) => regular.id),
    input.regularIds
  );
  const regularsError = await checkRegulars(added);
  if (regularsError) return { error: regularsError };

  const fromToday = parseDateOnly(today);
  let removedShifts: RemovedShift[] = [];
  let capacitySkipped = 0;

  try {
    removedShifts = await db.$transaction(async (tx) => {
      await tx.shiftPattern.update({
        where: { id },
        data: {
          capacity: input.capacity,
          notes: input.notes || null,
          endsOn: input.endsOn ? parseDateOnly(input.endsOn) : null,
          regulars: { set: input.regularIds.map((regularId) => ({ id: regularId })) },
        },
      });

      // An earlier end takes the days after it off the roster.
      const cut = input.endsOn
        ? await removePatternShiftsAfter(tx, id, input.endsOn)
        : [];

      // Regulars who left give up the places they were holding from today.
      await releaseRegulars(tx, id, removed, today);

      // Capacity and notes follow onto rostered days, unless a day already
      // has more people than the new capacity - it keeps its own.
      const upcoming = await tx.shift.findMany({
        where: { patternId: id, date: { gte: fromToday } },
        select: {
          id: true,
          _count: {
            select: { signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } } },
          },
        },
      });
      const fits = upcoming.filter((shift) => shift._count.signups <= input.capacity);
      capacitySkipped = upcoming.length - fits.length;
      await tx.shift.updateMany({
        where: { id: { in: fits.map((shift) => shift.id) } },
        data: { capacity: input.capacity, notes: input.notes || null },
      });

      // New regulars join every day already rostered.
      await rosterRegulars(
        tx,
        upcoming.map((shift) => shift.id),
        added
      );

      return cut;
    });

    // A later (or removed) end date may leave days to generate.
    const pattern = await db.shiftPattern.findUnique({
      where: { id },
      select: patternForGeneration,
    });
    if (pattern) await materialisePattern(db, pattern, today);
  } catch (error) {
    console.error("updateShiftPattern failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  notifyStopped(removedShifts);
  welcomeRegulars(added, {
    serviceAreaName: existing.serviceArea.name,
    weekdays: existing.weekdays,
    interval: existing.interval,
    startTime: existing.startTime,
    endTime: existing.endTime,
  });

  revalidatePatterns(id);
  return { success: true, capacitySkipped };
}

/**
 * Stops a repeating shift after today. Today's shift, if any, still happens;
 * everything after it comes off the roster and the people signed up are told.
 */
export async function stopShiftPattern(
  id: string
): Promise<Result & { removedShifts?: number }> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const today = todayInAppZone();
  const db = getDb();

  let removed: RemovedShift[] = [];
  try {
    removed = await db.$transaction(async (tx) => {
      const pattern = await tx.shiftPattern.findUnique({
        where: { id },
        select: { endsOn: true },
      });
      if (!pattern) throw new PatternGone();

      // Already finished before today: nothing left to stop.
      if (pattern.endsOn && dateOnlyOf(pattern.endsOn) < today) return [];

      await tx.shiftPattern.update({
        where: { id },
        data: { endsOn: parseDateOnly(today) },
      });
      return removePatternShiftsAfter(tx, id, today);
    });
  } catch (error) {
    if (error instanceof PatternGone) {
      return { error: "That repeating shift no longer exists." };
    }
    console.error("stopShiftPattern failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  notifyStopped(removed);
  revalidatePatterns(id);
  return { success: true, removedShifts: removed.length };
}

class PatternGone extends Error {}
