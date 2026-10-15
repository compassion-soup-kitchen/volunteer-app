/**
 * Reads of the days volunteers are on leave, shared by every path that puts
 * someone on a shift - signing themselves up, staff rostering them, or a
 * repeating shift seating its regulars - so none of them can seat someone
 * who's away. The counterpart to closed-days.ts, for people instead of days.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { dateOnlyOf, parseDateOnly } from "@/lib/date-only";
import type { LeaveRange } from "@/lib/volunteer-leave";

type Reader = PrismaClient | Prisma.TransactionClient;

export function rangeOf(row: { startsOn: Date; endsOn: Date }): LeaveRange {
  return { startsOn: dateOnlyOf(row.startsOn), endsOn: dateOnlyOf(row.endsOn) };
}

/** Prisma filter for leave overlapping a stretch of days. */
export function overlapping(range: LeaveRange) {
  return {
    startsOn: { lte: parseDateOnly(range.endsOn) },
    endsOn: { gte: parseDateOnly(range.startsOn) },
  };
}

/**
 * Each volunteer's leave touching a stretch of days. Volunteers with none are
 * simply absent from the map.
 */
export async function leaveForVolunteers(
  db: Reader,
  volunteerIds: string[],
  range: LeaveRange
): Promise<Map<string, LeaveRange[]>> {
  const byVolunteer = new Map<string, LeaveRange[]>();
  if (volunteerIds.length === 0) return byVolunteer;

  const rows = await db.volunteerLeave.findMany({
    where: { volunteerId: { in: volunteerIds }, ...overlapping(range) },
    select: { volunteerId: true, startsOn: true, endsOn: true },
  });
  for (const row of rows) {
    const list = byVolunteer.get(row.volunteerId) ?? [];
    list.push(rangeOf(row));
    byVolunteer.set(row.volunteerId, list);
  }
  return byVolunteer;
}

/** The volunteer's leave covering one stored day, if any. */
export async function leaveCovering(
  db: Reader,
  volunteerId: string,
  date: Date
): Promise<LeaveRange | null> {
  const row = await db.volunteerLeave.findFirst({
    where: { volunteerId, startsOn: { lte: date }, endsOn: { gte: date } },
    select: { startsOn: true, endsOn: true },
  });
  return row ? rangeOf(row) : null;
}
