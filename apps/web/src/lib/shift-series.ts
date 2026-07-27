/**
 * Expanding a repeating shift into the calendar days it covers — "every
 * Tuesday and Thursday breakfast through August", scheduled in one go instead
 * of one shift at a time.
 *
 * Pure, and works entirely in `DateOnly` strings so a month of shifts can't
 * drift across midnight the way raw `Date` arithmetic does (see date-only.ts).
 */

import {
  addDaysToDateOnly,
  dateOnlyOf,
  isDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";

/** Sunday-indexed, matching `Date.prototype.getUTCDay`. */
export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

/**
 * A ceiling on one series. High enough for the year of weekly shifts someone
 * might reasonably want, low enough that a slipped date can't create thousands
 * of rows in a single click.
 */
export const MAX_SERIES_SHIFTS = 120;

/** How far ahead a series may run, as a guard on the end date. */
export const MAX_SERIES_DAYS = 400;

export type RecurrenceInput = {
  /** First candidate day, inclusive. */
  startDate: string;
  /** Last candidate day, inclusive. */
  endDate: string;
  /**
   * Days of the week to schedule on, Sunday-indexed. Empty means "just the
   * start date" — a one-off, which is how the single-shift form behaves.
   */
  weekdays: number[];
  /** 1 = every week, 2 = every other week, counted from the start date's week. */
  interval?: number;
};

export type ExpandResult =
  | { ok: true; dates: DateOnly[] }
  | { ok: false; error: string };

/** The day of the week a calendar day falls on, Sunday-indexed. */
export function weekdayOf(value: DateOnly): number {
  return parseDateOnly(value).getUTCDay();
}

/** Whole weeks between two calendar days, floored. */
function weeksBetween(from: DateOnly, to: DateOnly): number {
  const days = Math.round(
    (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000
  );
  return Math.floor(days / 7);
}

/**
 * The Sunday that starts a day's week — the anchor every-other-week counts
 * from, so an interval doesn't shift depending on which weekday you picked
 * first.
 */
function startOfWeek(value: DateOnly): DateOnly {
  return addDaysToDateOnly(value, -weekdayOf(value));
}

/**
 * Every calendar day a recurrence covers, in order.
 *
 * The start date is included only if it falls on a selected weekday — picking
 * "Mondays" from a Wednesday means the series starts the following Monday,
 * which is what people mean by it.
 */
export function expandRecurrence(input: RecurrenceInput): ExpandResult {
  const { startDate, endDate } = input;
  const interval = input.interval ?? 1;

  if (!isDateOnly(startDate)) return { ok: false, error: "Please select a start date." };
  if (!isDateOnly(endDate)) return { ok: false, error: "Please select an end date." };
  if (endDate < startDate) {
    return { ok: false, error: "The last date must be on or after the first." };
  }
  if (!Number.isInteger(interval) || interval < 1 || interval > 8) {
    return { ok: false, error: "Choose how often the shift repeats." };
  }

  const spanDays = Math.round(
    (parseDateOnly(endDate).getTime() - parseDateOnly(startDate).getTime()) /
      86_400_000
  );
  if (spanDays > MAX_SERIES_DAYS) {
    return {
      ok: false,
      error: `That range is longer than ${Math.floor(MAX_SERIES_DAYS / 7)} weeks — shorten it and repeat later if you need to.`,
    };
  }

  // No weekdays chosen is a single shift on the start date.
  const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b);
  if (weekdays.length === 0) return { ok: true, dates: [startDate] };

  if (weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return { ok: false, error: "Choose which days of the week the shift runs." };
  }

  const anchorWeek = startOfWeek(startDate);
  const dates: DateOnly[] = [];

  for (let day = startDate; day <= endDate; day = addDaysToDateOnly(day, 1)) {
    if (!weekdays.includes(weekdayOf(day))) continue;
    if (interval > 1 && weeksBetween(anchorWeek, startOfWeek(day)) % interval !== 0) {
      continue;
    }

    dates.push(day);
    if (dates.length > MAX_SERIES_SHIFTS) {
      return {
        ok: false,
        error: `That would create more than ${MAX_SERIES_SHIFTS} shifts. Shorten the date range or pick fewer days.`,
      };
    }
  }

  if (dates.length === 0) {
    return {
      ok: false,
      error: "No dates fall in that range — check the days and the end date.",
    };
  }

  return { ok: true, dates };
}

/**
 * Splits candidate days into the ones to create and the ones already taken.
 *
 * A repeat that overlaps shifts already on the roster is normal — extending a
 * pattern by a month, say — so the clash is reported and skipped rather than
 * failing the whole series or creating a duplicate.
 */
export function partitionExistingDates(
  candidates: DateOnly[],
  existing: Date[]
): { toCreate: DateOnly[]; skipped: DateOnly[] } {
  const taken = new Set(existing.map(dateOnlyOf));
  const toCreate: DateOnly[] = [];
  const skipped: DateOnly[] = [];

  for (const date of candidates) {
    (taken.has(date) ? skipped : toCreate).push(date);
  }

  return { toCreate, skipped };
}

/** What to tell someone after a series is created. */
export function summariseSeriesResult(
  created: number,
  skipped: number
): string {
  const shifts = `${created} ${created === 1 ? "shift" : "shifts"}`;
  if (skipped === 0) return `${shifts} created.`;
  return `${shifts} created — ${skipped} skipped, already on the roster.`;
}
