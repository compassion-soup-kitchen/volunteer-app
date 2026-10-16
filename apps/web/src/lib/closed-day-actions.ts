"use server";

import { after, connection } from "next/server";
import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import { personName } from "@/lib/format";
import {
  closeDaysInput,
  closureBlocker,
  closureNotice,
  holidaySuggestions,
  monthGridRange,
  type ClosureEntry,
} from "@/lib/closed-days";
import {
  dateOnlyOf,
  formatDateOnly,
  parseDateOnly,
  todayInAppZone,
  type DateOnly,
} from "@/lib/date-only";
import {
  nzPublicHolidaysBetween,
  type PublicHoliday,
} from "@/lib/nz-public-holidays";
import {
  notifyRemovedShifts,
  removeShifts,
  type RemovedShift,
} from "@/lib/data/shift-cancellation";
import {
  refillReopenedDay,
  scheduleRosterTopUp,
} from "@/lib/data/shift-patterns";
import { getLeaveBetween } from "@/lib/data/leave";

// ─── Types ──────────────────────────────────────────────

/** One shift as a calendar cell needs it. Days are calendar days. */
export type CalendarShift = {
  id: string;
  date: DateOnly;
  startTime: string;
  endTime: string;
  capacity: number;
  filled: number;
  serviceAreaName: string;
  /** Generated from a repeating shift rather than rostered on its own. */
  isRepeating: boolean;
};

export type CalendarClosedDay = {
  id: string;
  date: DateOnly;
  reason: string;
  createdByName: string | null;
};

/** Someone on leave at some point in the month shown. */
export type CalendarAway = {
  id: string;
  userId: string;
  name: string;
  startsOn: DateOnly;
  endsOn: DateOnly;
};

export type RosterMonth = {
  /** First day of the month shown. */
  month: DateOnly;
  today: DateOnly;
  closedDays: CalendarClosedDay[];
  shifts: CalendarShift[];
  /** Public holidays inside the grid, closed or not - so the cell can say so. */
  holidays: PublicHoliday[];
  /** Public holidays coming up that nobody has closed yet. */
  suggestions: PublicHoliday[];
  /** People on leave during the grid - volunteers and staff - so a day shows who's away. */
  away: CalendarAway[];
};

export type ClosureImpact = {
  date: DateOnly;
  shifts: {
    id: string;
    serviceAreaName: string;
    startTime: string;
    endTime: string;
    /** Who is expected - the app users get a push, offline ones need a call. */
    signedUp: { name: string; isOffline: boolean; phone: string | null }[];
  }[];
  /** Why this day can't be closed, or null. */
  blocker: string | null;
};

export type CloseDaysResult = {
  error?: string;
  success?: boolean;
  closed?: number;
  cancelledShifts?: number;
  notifiedVolunteers?: number;
};

const ATTENDANCE_RECORDED = ["ATTENDED", "NO_SHOW"] as const;

// ─── Reads ──────────────────────────────────────────────

/** Everything the month view shows: shifts, closures and holidays. */
export async function getRosterMonth(month: DateOnly): Promise<RosterMonth | null> {
  await connection();
  const session = await requireStaffSession();
  if (!session) return null;

  scheduleRosterTopUp();
  const { from, to } = monthGridRange(month);
  const today = todayInAppZone();
  const db = getDb();

  const [shifts, closedDays, allClosedAhead, away] = await Promise.all([
    db.shift.findMany({
      where: { date: { gte: parseDateOnly(from), lte: parseDateOnly(to) } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        capacity: true,
        patternId: true,
        serviceArea: { select: { name: true } },
        _count: {
          select: {
            signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } },
          },
        },
      },
    }),
    db.closedDay.findMany({
      where: { date: { gte: parseDateOnly(from), lte: parseDateOnly(to) } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        reason: true,
        createdBy: { select: { name: true } },
      },
    }),
    db.closedDay.findMany({
      where: { date: { gte: parseDateOnly(today) } },
      select: { date: true },
    }),
    getLeaveBetween({ startsOn: from, endsOn: to }),
  ]);

  return {
    month,
    today,
    shifts: shifts.map((shift) => ({
      id: shift.id,
      date: dateOnlyOf(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      capacity: shift.capacity,
      filled: shift._count.signups,
      serviceAreaName: shift.serviceArea.name,
      isRepeating: shift.patternId !== null,
    })),
    closedDays: closedDays.map((day) => ({
      id: day.id,
      date: dateOnlyOf(day.date),
      reason: day.reason,
      createdByName: day.createdBy?.name ?? null,
    })),
    holidays: nzPublicHolidaysBetween(from, to),
    suggestions: holidaySuggestions({
      today,
      closedDates: new Set(allClosedAhead.map((day) => dateOnlyOf(day.date))),
    }),
    away: away.map((leave) => ({
      id: leave.id,
      userId: leave.person.userId,
      name: leave.person.name,
      startsOn: leave.startsOn,
      endsOn: leave.endsOn,
    })),
  };
}

/** What closing a day would cancel, for the confirmation step. */
export async function getClosureImpact(date: DateOnly): Promise<ClosureImpact | null> {
  const session = await requireStaffSession();
  if (!session) return null;

  let stored: Date;
  try {
    stored = parseDateOnly(date);
  } catch {
    return null;
  }

  const db = getDb();
  const [shifts, existing] = await Promise.all([
    db.shift.findMany({
      where: { date: stored },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        serviceArea: { select: { name: true } },
        signups: {
          where: { status: { in: ["SIGNED_UP", ...ATTENDANCE_RECORDED] } },
          select: {
            status: true,
            volunteer: {
              select: {
                phone: true,
                user: { select: { name: true, email: true, isOffline: true } },
              },
            },
          },
        },
      },
    }),
    db.closedDay.findUnique({ where: { date: stored }, select: { id: true } }),
  ]);

  const recordedAttendance = shifts
    .flatMap((shift) => shift.signups)
    .filter((signup) => signup.status !== "SIGNED_UP").length;

  return {
    date,
    shifts: shifts.map((shift) => ({
      id: shift.id,
      serviceAreaName: shift.serviceArea.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      signedUp: shift.signups
        .filter((signup) => signup.status === "SIGNED_UP")
        .map((signup) => ({
          name: personName(signup.volunteer.user),
          isOffline: signup.volunteer.user.isOffline,
          phone: signup.volunteer.phone,
        })),
    })),
    blocker: closureBlocker({
      date,
      today: todayInAppZone(),
      alreadyClosed: existing !== null,
      recordedAttendance,
    }),
  };
}

// ─── Writes ─────────────────────────────────────────────

class ClosureRefused extends Error {}

function shortDay(date: DateOnly): string {
  return formatDateOnly(parseDateOnly(date), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Closes one or more days: records each closure, cancels the shifts already
 * on it, and tells the volunteers who were signed up. All or nothing - if any
 * day can't be closed, none are.
 */
export async function closeDays(entries: ClosureEntry[]): Promise<CloseDaysResult> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const parsed = closeDaysInput.safeParse(entries);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the days." };
  }

  const today = todayInAppZone();
  const db = getDb();

  let removed: RemovedShift[] = [];
  try {
    removed = await db.$transaction(async (tx) => {
      const cancelled: RemovedShift[] = [];

      for (const entry of parsed.data) {
        const date = parseDateOnly(entry.date);
        const [existing, shifts] = await Promise.all([
          tx.closedDay.findUnique({ where: { date }, select: { id: true } }),
          tx.shift.findMany({
            where: { date },
            select: {
              id: true,
              _count: {
                select: {
                  signups: { where: { status: { in: [...ATTENDANCE_RECORDED] } } },
                },
              },
            },
          }),
        ]);

        const blocker = closureBlocker({
          date: entry.date,
          today,
          alreadyClosed: existing !== null,
          recordedAttendance: shifts.reduce((n, s) => n + s._count.signups, 0),
        });
        if (blocker) throw new ClosureRefused(`${shortDay(entry.date)}: ${blocker}`);

        await tx.closedDay.create({
          data: { date, reason: entry.reason, createdById: session.user.id },
        });
        cancelled.push(...(await removeShifts(tx, shifts.map((s) => s.id))));
      }

      return cancelled;
    });
  } catch (error) {
    if (error instanceof ClosureRefused) return { error: error.message };
    // Two coordinators closing the same day at once: the unique date wins.
    if ((error as { code?: unknown }).code === "P2002") {
      return { error: "One of those days was closed a moment ago. Refresh and try again." };
    }
    console.error("closeDays failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  const reasons = new Map(parsed.data.map((entry) => [entry.date, entry.reason]));
  after(() =>
    notifyRemovedShifts(removed, (shift) =>
      closureNotice({
        reason: reasons.get(dateOnlyOf(shift.date)) ?? "the kitchen is closed",
        serviceAreaName: shift.serviceAreaName,
        dayLabel: shift.dayLabel,
      })
    )
  );

  revalidateRoster();
  return {
    success: true,
    closed: parsed.data.length,
    cancelledShifts: removed.length,
    notifiedVolunteers: new Set(removed.flatMap((shift) => shift.userIds)).size,
  };
}

/**
 * Opens a closed day again. Repeating shifts that would have run that day are
 * put back on the roster; one-off shifts cancelled by the closure are gone and
 * have to be rostered again by hand.
 */
export async function reopenClosedDay(
  id: string
): Promise<{ error?: string; success?: boolean; restoredShifts?: number }> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const closure = await db.closedDay.findUnique({
    where: { id },
    select: { date: true },
  });
  if (!closure) return { error: "That day isn't closed any more." };

  if (dateOnlyOf(closure.date) < todayInAppZone()) {
    return { error: "That day has already been and gone." };
  }

  try {
    await db.closedDay.delete({ where: { id } });
    const restoredShifts = await refillReopenedDay(db, closure.date);
    revalidateRoster();
    return { success: true, restoredShifts };
  } catch (error) {
    console.error("reopenClosedDay failed:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

function revalidateRoster() {
  revalidatePath("/staff/calendar");
  revalidatePath("/staff/shifts");
  revalidatePath("/staff/dashboard");
  revalidatePath("/shifts");
  revalidatePath("/dashboard");
}
