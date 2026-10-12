/**
 * The rules for closing the kitchen on a day - a public holiday, a staff day,
 * a building closure - kept pure so they can be tested without a database.
 *
 * Closing a day is not just a label on the calendar: the shifts already on it
 * are cancelled and their volunteers told, and repeating shifts skip it from
 * then on (see shift-patterns.ts).
 */

import { z } from "zod";

import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  endOfMonthOf,
  isDateOnly,
  startOfMonthOf,
  type DateOnly,
} from "@/lib/date-only";
import {
  nzPublicHolidaysBetween,
  type PublicHoliday,
} from "@/lib/nz-public-holidays";

/** Long enough for "Staff training day - building closed", short enough for a calendar cell. */
export const CLOSURE_REASON_MAX = 80;

/** How far ahead the calendar suggests public holidays to close. */
export const HOLIDAY_SUGGESTION_MONTHS = 12;

/** Most days one request may close - a year of public holidays, with room. */
export const MAX_CLOSURES_PER_REQUEST = 31;

export const closureEntrySchema = z.object({
  date: z.string().refine(isDateOnly, "Choose the day the kitchen is closed."),
  reason: z
    .string()
    .trim()
    .min(1, "Say why the kitchen is closed - volunteers are told.")
    .max(CLOSURE_REASON_MAX, `Keep the reason under ${CLOSURE_REASON_MAX} characters.`),
});

export const closeDaysInput = z
  .array(closureEntrySchema)
  .min(1, "Choose at least one day to close.")
  .max(MAX_CLOSURES_PER_REQUEST, "That's too many days at once.")
  .refine(
    (entries) => new Set(entries.map((e) => e.date)).size === entries.length,
    "The same day is listed twice."
  );

export type ClosureEntry = z.infer<typeof closureEntrySchema>;

/**
 * Why a day can't be closed, or null when it can.
 *
 * A past day is history, not a plan. And once attendance has been marked on a
 * day, closing it would delete the hours people actually gave - that day
 * clearly wasn't closed.
 */
export function closureBlocker(input: {
  date: DateOnly;
  today: DateOnly;
  alreadyClosed: boolean;
  recordedAttendance: number;
}): string | null {
  if (input.date < input.today) return "That day has already been and gone.";
  if (input.alreadyClosed) return "The kitchen is already closed that day.";
  if (input.recordedAttendance > 0) {
    return "Attendance has already been marked that day, so its shifts can't be cancelled.";
  }
  return null;
}

/**
 * Public holidays coming up that haven't been closed yet - what the calendar
 * offers to block out in one go.
 */
export function holidaySuggestions(input: {
  today: DateOnly;
  closedDates: ReadonlySet<DateOnly>;
}): PublicHoliday[] {
  const until = addMonthsToDateOnly(input.today, HOLIDAY_SUGGESTION_MONTHS);
  return nzPublicHolidaysBetween(input.today, until).filter(
    (holiday) => !input.closedDates.has(holiday.date)
  );
}

/** What a volunteer is told when their shift goes with a closed day. */
export function closureNotice(input: {
  reason: string;
  serviceAreaName: string;
  dayLabel: string;
}): { title: string; body: string } {
  return {
    title: "Your shift is cancelled - the kitchen is closed",
    body: `${input.serviceAreaName} on ${input.dayLabel} is off: ${input.reason}. Thank you for being ready to help.`,
  };
}

// ─── Month grid ─────────────────────────────────────────

export type CalendarDay = {
  date: DateOnly;
  /** False for the spill-over days that pad the first and last weeks. */
  inMonth: boolean;
};

/**
 * The weeks a month view shows, Monday first as NZ calendars are. Padded to
 * whole weeks with the neighbouring months' days so every row has seven.
 */
export function monthGrid(month: DateOnly): CalendarDay[][] {
  const first = startOfMonthOf(month);
  const last = endOfMonthOf(month);

  const leading = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const trailing = 6 - ((new Date(`${last}T00:00:00Z`).getUTCDay() + 6) % 7);

  const start = addDaysToDateOnly(first, -leading);
  const end = addDaysToDateOnly(last, trailing);

  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];
  for (let d = start; d <= end; d = addDaysToDateOnly(d, 1)) {
    week.push({ date: d, inMonth: d >= first && d <= last });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  return weeks;
}

/** First and last day a month view covers, padding included. */
export function monthGridRange(month: DateOnly): { from: DateOnly; to: DateOnly } {
  const weeks = monthGrid(month);
  return { from: weeks[0][0].date, to: weeks[weeks.length - 1][6].date };
}

/** `"2026-10"` or `"2026-10-13"` → the month's first day, else null. */
export function parseMonthParam(value: string | undefined): DateOnly | null {
  if (!value) return null;
  const candidate = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  return isDateOnly(candidate) ? startOfMonthOf(candidate) : null;
}
