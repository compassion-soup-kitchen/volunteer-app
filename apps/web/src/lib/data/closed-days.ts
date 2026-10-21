/**
 * Reads of the days the kitchen is closed, shared by every path that puts a
 * shift on the roster - one-off, edited or generated from a repeating shift -
 * so none of them can schedule onto a closed day.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  dateOnlyOf,
  formatDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";

type Reader = PrismaClient | Prisma.TransactionClient;

/** The closure on a stored day, if there is one. */
export async function findClosedDay(
  db: Reader,
  date: Date
): Promise<{ date: Date; reason: string } | null> {
  return db.closedDay.findUnique({
    where: { date },
    select: { date: true, reason: true },
  });
}

/** Every closed day in a range, inclusive, as calendar days. */
export async function closedDatesBetween(
  db: Reader,
  from: Date,
  to: Date
): Promise<Set<DateOnly>> {
  const rows = await db.closedDay.findMany({
    where: { date: { gte: from, lte: to } },
    select: { date: true },
  });
  return new Set(rows.map((row) => dateOnlyOf(row.date)));
}

/** "The kitchen is closed on Mon 26 Oct (Labour Day)." */
export function closedDayMessage(closure: { date: Date; reason: string }): string {
  const day = formatDateOnly(closure.date, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `The kitchen is closed on ${day} (${closure.reason}).`;
}

/** Every closure in a range, inclusive, with the reason staff gave for it. */
export async function closuresBetween(
  db: Reader,
  from: DateOnly,
  to: DateOnly
): Promise<{ date: DateOnly; reason: string }[]> {
  const rows = await db.closedDay.findMany({
    where: { date: { gte: parseDateOnly(from), lte: parseDateOnly(to) } },
    select: { date: true, reason: true },
    orderBy: { date: "asc" },
  });
  return rows.map((row) => ({ date: dateOnlyOf(row.date), reason: row.reason }));
}
