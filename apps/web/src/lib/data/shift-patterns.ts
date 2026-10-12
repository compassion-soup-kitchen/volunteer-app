/**
 * Turning repeating shifts into roster days.
 *
 * A pattern can run forever, so its shifts are generated a window at a time:
 * on creation, whenever it is edited, and by a top-up that rides along with
 * the pages that read the roster (`scheduleRosterTopUp`). Each top-up only
 * reaches *forward* of `generatedThrough`, so deleting a generated shift or
 * closing a day is never undone behind the coordinator's back.
 *
 * No cron is needed: the roster is generated twelve weeks ahead, and the
 * top-up runs whenever anyone - staff or volunteer - looks at shifts, which
 * at a working kitchen is many times a day.
 */

import { after } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";

import { getDb } from "@/lib/db";
import {
  addDaysToDateOnly,
  dateOnlyOf,
  parseDateOnly,
  todayInAppZone,
  type DateOnly,
} from "@/lib/date-only";
import {
  materialisationWindow,
  patternDatesBetween,
  PATTERN_HORIZON_DAYS,
  regularsToSeat,
  type PatternSchedule,
} from "@/lib/shift-patterns";
import { closedDatesBetween } from "@/lib/data/closed-days";
import { removeShifts, type RemovedShift } from "@/lib/data/shift-cancellation";

type Db = PrismaClient | Prisma.TransactionClient;

/** Everything generation needs about a pattern, regulars included. */
export const patternForGeneration = {
  id: true,
  serviceAreaId: true,
  weekdays: true,
  interval: true,
  startTime: true,
  endTime: true,
  capacity: true,
  notes: true,
  startsOn: true,
  endsOn: true,
  generatedThrough: true,
  createdById: true,
  // Only people who can actually work a shift get seated on new ones; an
  // archived or paused regular keeps their place on the pattern for later.
  regulars: {
    where: { status: "ACTIVE", user: { status: "ACTIVE" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  },
} satisfies Prisma.ShiftPatternSelect;

export type PatternForGeneration = Prisma.ShiftPatternGetPayload<{
  select: typeof patternForGeneration;
}>;

export function scheduleOf(pattern: {
  weekdays: number[];
  interval: number;
  startsOn: Date;
  endsOn: Date | null;
}): PatternSchedule {
  return {
    weekdays: pattern.weekdays,
    interval: pattern.interval,
    startsOn: dateOnlyOf(pattern.startsOn),
    endsOn: pattern.endsOn ? dateOnlyOf(pattern.endsOn) : null,
  };
}

const HOLDS_A_PLACE = ["SIGNED_UP", "ATTENDED"];
const ATTENDANCE_RECORDED = ["ATTENDED", "NO_SHOW"] as const;

/**
 * Seats regulars on the given shifts wherever there is room and they have no
 * signup yet. Never overwrites an existing row - a regular who cancelled one
 * week stays cancelled that week. Returns how many signups were made.
 */
export async function rosterRegulars(
  db: Db,
  shiftIds: string[],
  regularIds: string[]
): Promise<number> {
  if (shiftIds.length === 0 || regularIds.length === 0) return 0;

  const shifts = await db.shift.findMany({
    where: { id: { in: shiftIds } },
    select: {
      id: true,
      capacity: true,
      signups: { select: { volunteerId: true, status: true } },
    },
  });

  const rows = shifts.flatMap((shift) =>
    regularsToSeat({
      capacity: shift.capacity,
      seatedVolunteerIds: shift.signups
        .filter((signup) => HOLDS_A_PLACE.includes(signup.status))
        .map((signup) => signup.volunteerId),
      signupVolunteerIds: shift.signups.map((signup) => signup.volunteerId),
      regularIds,
    }).map((volunteerId) => ({ shiftId: shift.id, volunteerId }))
  );

  if (rows.length === 0) return 0;
  const result = await db.shiftSignup.createMany({
    data: rows,
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Puts a pattern's shift on each of `dates` and seats its regulars.
 *
 * A one-off shift already rostered in the same area at the same start time is
 * adopted rather than doubled: a coordinator who rostered Monday breakfasts to
 * Christmas and then sets breakfast up as a repeating shift wants one Monday
 * breakfast, not two. Returns how many days now carry the pattern's shift.
 */
async function placePatternShifts(
  db: PrismaClient,
  pattern: PatternForGeneration,
  dates: DateOnly[]
): Promise<number> {
  if (dates.length === 0) return 0;

  return db.$transaction(async (tx) => {
    const stored = dates.map(parseDateOnly);

    const linked = await tx.shift.findMany({
      where: { patternId: pattern.id, date: { in: stored } },
      select: { date: true },
    });
    const done = new Set(linked.map((shift) => dateOnlyOf(shift.date)));
    const pending = dates.filter((date) => !done.has(date));
    if (pending.length === 0) return 0;

    const orphans = await tx.shift.findMany({
      where: {
        patternId: null,
        serviceAreaId: pattern.serviceAreaId,
        startTime: pattern.startTime,
        date: { in: pending.map(parseDateOnly) },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, date: true },
    });

    // One adoption per day: two identical one-offs on a day is a mistake the
    // pattern shouldn't paper over by claiming both.
    const adopted = new Map<DateOnly, string>();
    for (const orphan of orphans) {
      const day = dateOnlyOf(orphan.date);
      if (!adopted.has(day)) adopted.set(day, orphan.id);
    }
    if (adopted.size > 0) {
      await tx.shift.updateMany({
        where: { id: { in: [...adopted.values()] } },
        data: { patternId: pattern.id },
      });
    }

    const toCreate = pending.filter((date) => !adopted.has(date));
    if (toCreate.length > 0) {
      await tx.shift.createMany({
        data: toCreate.map((date) => ({
          patternId: pattern.id,
          serviceAreaId: pattern.serviceAreaId,
          date: parseDateOnly(date),
          startTime: pattern.startTime,
          endTime: pattern.endTime,
          capacity: pattern.capacity,
          notes: pattern.notes,
          createdById: pattern.createdById,
        })),
        skipDuplicates: true,
      });
    }

    const placed = await tx.shift.findMany({
      where: { patternId: pattern.id, date: { in: pending.map(parseDateOnly) } },
      select: { id: true },
    });
    await rosterRegulars(
      tx,
      placed.map((shift) => shift.id),
      pattern.regulars.map((regular) => regular.id)
    );

    return placed.length;
  });
}

/**
 * Generates whatever a pattern is missing between `generatedThrough` and the
 * horizon, skipping closed days, and moves the watermark forward. Returns how
 * many days were added.
 */
export async function materialisePattern(
  db: PrismaClient,
  pattern: PatternForGeneration,
  today: DateOnly = todayInAppZone()
): Promise<number> {
  const schedule = scheduleOf(pattern);
  const window = materialisationWindow(
    {
      ...schedule,
      generatedThrough: pattern.generatedThrough
        ? dateOnlyOf(pattern.generatedThrough)
        : null,
    },
    today
  );
  if (!window) return 0;

  const closed = await closedDatesBetween(
    db,
    parseDateOnly(window.from),
    parseDateOnly(window.to)
  );
  const dates = patternDatesBetween(schedule, window.from, window.to).filter(
    (date) => !closed.has(date)
  );

  const placed = await placePatternShifts(db, pattern, dates);

  // Only ever forward, so a slower concurrent top-up can't drag it back.
  const through = parseDateOnly(window.to);
  await db.shiftPattern.updateMany({
    where: {
      id: pattern.id,
      OR: [{ generatedThrough: null }, { generatedThrough: { lt: through } }],
    },
    data: { generatedThrough: through },
  });

  return placed;
}

/** Tops up every pattern that hasn't reached the horizon yet. */
export async function materialiseDuePatterns(
  db: PrismaClient,
  today: DateOnly = todayInAppZone()
): Promise<number> {
  const horizon = parseDateOnly(addDaysToDateOnly(today, PATTERN_HORIZON_DAYS));
  const due = await db.shiftPattern.findMany({
    where: {
      OR: [{ endsOn: null }, { endsOn: { gte: parseDateOnly(today) } }],
      AND: [
        { OR: [{ generatedThrough: null }, { generatedThrough: { lt: horizon } }] },
      ],
    },
    select: patternForGeneration,
  });

  let placed = 0;
  for (const pattern of due) {
    placed += await materialisePattern(db, pattern, today);
  }
  return placed;
}

// Per server process. A top-up is idempotent and cheap when there is nothing
// to do, so this only stops a busy page hammering the same query.
const TOP_UP_EVERY_MS = 10 * 60 * 1000;
let lastTopUpAt = 0;

/**
 * Keeps the roster generated ahead, after the current response is sent. Call
 * it from anything that reads shifts; it is throttled, so calling it freely is
 * fine.
 */
export function scheduleRosterTopUp(): void {
  const now = Date.now();
  if (now - lastTopUpAt < TOP_UP_EVERY_MS) return;
  lastTopUpAt = now;

  try {
    after(async () => {
      try {
        await materialiseDuePatterns(getDb());
      } catch (error) {
        lastTopUpAt = 0;
        console.error("[shift-patterns] roster top-up failed:", error);
      }
    });
  } catch {
    // Outside a request (a script, a test) there is no `after` - nothing to do.
    lastTopUpAt = 0;
  }
}

/**
 * A closed day opened again: puts back the shifts of any pattern that would
 * have run that day and had already been generated past it. Returns how many.
 */
export async function refillReopenedDay(
  db: PrismaClient,
  date: Date
): Promise<number> {
  const day = dateOnlyOf(date);
  const patterns = await db.shiftPattern.findMany({
    where: {
      startsOn: { lte: date },
      generatedThrough: { gte: date },
      OR: [{ endsOn: null }, { endsOn: { gte: date } }],
    },
    select: patternForGeneration,
  });

  let placed = 0;
  for (const pattern of patterns) {
    if (patternDatesBetween(scheduleOf(pattern), day, day).length === 0) continue;
    placed += await placePatternShifts(db, pattern, [day]);
  }
  return placed;
}

/**
 * Takes a pattern's shifts after `lastDay` off the roster - when it is stopped
 * or ended sooner. A shift whose attendance was already marked is history, so
 * it is unlinked and kept rather than deleted. Returns what was removed, for
 * the caller to notify once the transaction commits.
 */
export async function removePatternShiftsAfter(
  tx: Prisma.TransactionClient,
  patternId: string,
  lastDay: DateOnly
): Promise<RemovedShift[]> {
  const later = await tx.shift.findMany({
    where: { patternId, date: { gt: parseDateOnly(lastDay) } },
    select: {
      id: true,
      _count: {
        select: { signups: { where: { status: { in: [...ATTENDANCE_RECORDED] } } } },
      },
    },
  });

  const recorded = later.filter((shift) => shift._count.signups > 0);
  if (recorded.length > 0) {
    await tx.shift.updateMany({
      where: { id: { in: recorded.map((shift) => shift.id) } },
      data: { patternId: null },
    });
  }

  return removeShifts(
    tx,
    later.filter((shift) => shift._count.signups === 0).map((shift) => shift.id)
  );
}
