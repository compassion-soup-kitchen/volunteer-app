/**
 * Repeating shifts - "breakfast every Monday, 7 till 10, with David" - and the
 * rules for turning one into roster days.
 *
 * A pattern may run forever, so it is never expanded in full. The roster is
 * generated `PATTERN_HORIZON_DAYS` ahead and topped up as time passes (see
 * data/shift-patterns.ts); this file only answers "which days, in this window".
 *
 * Pure, and in `DateOnly` strings throughout so a run of weeks can't drift
 * across midnight the way `Date` arithmetic does (see date-only.ts).
 */

import { z } from "zod";

import {
  addDaysToDateOnly,
  formatDateOnly,
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

/** Monday first, the way the form lays the week out. */
export const WEEKDAYS_FROM_MONDAY = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

/**
 * How far ahead a pattern's shifts are put on the roster. Twelve weeks lets
 * volunteers plan a season ahead without committing the kitchen to a year of
 * rows that a change of plan would have to unpick.
 */
export const PATTERN_HORIZON_DAYS = 84;

/** Most weeks between runs - "every 4 weeks" is the slowest rhythm offered. */
export const MAX_PATTERN_INTERVAL = 4;

/** Regulars per pattern; capacity is capped at 50 anyway. */
export const MAX_PATTERN_REGULARS = 50;

export type PatternSchedule = {
  /** Sunday-indexed days of the week. */
  weekdays: number[];
  /** 1 = every week, 2 = every other week, counted from `startsOn`'s week. */
  interval: number;
  startsOn: DateOnly;
  /** Null for a pattern that carries on until someone stops it. */
  endsOn: DateOnly | null;
};

/** The day of the week a calendar day falls on, Sunday-indexed. */
export function weekdayOf(value: DateOnly): number {
  return parseDateOnly(value).getUTCDay();
}

/**
 * The Sunday that starts a day's week - what every-other-week counts from, so
 * the rhythm doesn't depend on which of the chosen weekdays came first.
 */
function startOfSundayWeek(value: DateOnly): DateOnly {
  return addDaysToDateOnly(value, -weekdayOf(value));
}

function weeksBetween(from: DateOnly, to: DateOnly): number {
  const days = Math.round(
    (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000
  );
  return Math.floor(days / 7);
}

/**
 * Every day in `[from, to]` the pattern runs on, in order. Bounded by the
 * pattern's own start and end, and anchored to `startsOn`'s week whatever
 * window is asked for, so topping up the roster week by week keeps an
 * every-other-week pattern on the same weeks.
 */
export function patternDatesBetween(
  pattern: PatternSchedule,
  from: DateOnly,
  to: DateOnly
): DateOnly[] {
  const lo = from > pattern.startsOn ? from : pattern.startsOn;
  const hi = pattern.endsOn && pattern.endsOn < to ? pattern.endsOn : to;
  if (lo > hi) return [];

  const weekdays = new Set(pattern.weekdays);
  const anchor = startOfSundayWeek(pattern.startsOn);
  const dates: DateOnly[] = [];

  for (let day = lo; day <= hi; day = addDaysToDateOnly(day, 1)) {
    if (!weekdays.has(weekdayOf(day))) continue;
    if (
      pattern.interval > 1 &&
      weeksBetween(anchor, startOfSundayWeek(day)) % pattern.interval !== 0
    ) {
      continue;
    }
    dates.push(day);
  }
  return dates;
}

/**
 * The days the next top-up should generate, or null when the roster already
 * reaches as far as it should.
 *
 * Never reaches back behind `generatedThrough`: a shift the coordinator
 * deleted, or a day that was closed, stays that way rather than reappearing on
 * the next page load. Nor behind today - nobody needs last week rostered.
 */
export function materialisationWindow(
  pattern: Pick<PatternSchedule, "startsOn" | "endsOn"> & {
    generatedThrough: DateOnly | null;
  },
  today: DateOnly,
  horizonDays: number = PATTERN_HORIZON_DAYS
): { from: DateOnly; to: DateOnly } | null {
  const candidates = [pattern.startsOn, today];
  if (pattern.generatedThrough) {
    candidates.push(addDaysToDateOnly(pattern.generatedThrough, 1));
  }
  const from = candidates.reduce((a, b) => (a > b ? a : b));

  const horizon = addDaysToDateOnly(today, horizonDays);
  const to = pattern.endsOn && pattern.endsOn < horizon ? pattern.endsOn : horizon;

  return from <= to ? { from, to } : null;
}

/** Whether a pattern still has days to come. */
export function isPatternRunning(
  pattern: Pick<PatternSchedule, "endsOn">,
  today: DateOnly
): boolean {
  return pattern.endsOn === null || pattern.endsOn >= today;
}

// ─── Form contract ──────────────────────────────────────

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleFields = {
  serviceAreaId: z.string().min(1, "Please select a service area."),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day of the week.")
    .max(7)
    .refine((days) => new Set(days).size === days.length, "Each day once, please."),
  interval: z.number().int().min(1).max(MAX_PATTERN_INTERVAL, "Choose how often it repeats."),
  startTime: z.string().regex(TIME_PATTERN, "Start time is required."),
  endTime: z.string().regex(TIME_PATTERN, "End time is required."),
  startsOn: z.string().refine(isDateOnly, "Choose the first day."),
};

const editableFields = {
  capacity: z
    .number()
    .int("Capacity must be a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(50, "Capacity can't be more than 50."),
  notes: z.string().trim().max(2000).optional(),
  endsOn: z.string().refine(isDateOnly, "Choose the last day.").nullable(),
  regularIds: z
    .array(z.string().min(1))
    .max(MAX_PATTERN_REGULARS)
    .refine((ids) => new Set(ids).size === ids.length, "Each regular once, please."),
};

const regularsFit = (data: { capacity: number; regularIds: string[] }) =>
  data.regularIds.length <= data.capacity;
const regularsFitMessage = {
  message: "There are more regulars than places - raise the capacity.",
  path: ["capacity"],
};

export const shiftPatternInput = z
  .object({ ...scheduleFields, ...editableFields })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  })
  .refine((data) => data.endsOn === null || data.endsOn >= data.startsOn, {
    message: "The last day must be on or after the first.",
    path: ["endsOn"],
  })
  .refine(regularsFit, regularsFitMessage);

export type ShiftPatternFormData = z.input<typeof shiftPatternInput>;

/** What can change on a running pattern. Day, time and place can't. */
export const shiftPatternUpdateInput = z
  .object(editableFields)
  .refine(regularsFit, regularsFitMessage);

export type ShiftPatternUpdateData = z.input<typeof shiftPatternUpdateInput>;

/** The first error zod found, in the wording the form shows inline. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the details and try again.";
}

/**
 * Whether a new pattern's start day is acceptable: not in the past, since the
 * roster is never generated behind today anyway.
 */
export function startsOnError(startsOn: DateOnly, today: DateOnly): string | null {
  return startsOn < today ? "The first day can't be in the past." : null;
}

/** An end date that cuts into days already worked would rewrite history. */
export function endsOnError(endsOn: DateOnly | null, today: DateOnly): string | null {
  return endsOn !== null && endsOn < today
    ? "The last day can't be in the past."
    : null;
}

// ─── Regulars ───────────────────────────────────────────

/** Who joins and who leaves when a pattern's regulars are replaced. */
export function diffRegulars(
  before: string[],
  after: string[]
): { added: string[]; removed: string[] } {
  const was = new Set(before);
  const now = new Set(after);
  return {
    added: after.filter((id) => !was.has(id)),
    removed: before.filter((id) => !now.has(id)),
  };
}

/**
 * Which regulars still fit on a shift, in the order given. A shift that has
 * filled up with other volunteers keeps them - regulars only take free places.
 */
export function regularsToSeat(input: {
  capacity: number;
  /** Everyone currently holding a place. */
  seatedVolunteerIds: string[];
  /** Everyone with any signup row at all, including cancelled ones. */
  signupVolunteerIds: string[];
  regularIds: string[];
}): string[] {
  const hasRow = new Set(input.signupVolunteerIds);
  let free = input.capacity - input.seatedVolunteerIds.length;
  const seat: string[] = [];
  for (const id of input.regularIds) {
    if (free <= 0) break;
    // An existing row is a choice already made - including a regular who
    // cancelled this one week - so it's never overwritten.
    if (hasRow.has(id)) continue;
    seat.push(id);
    free--;
  }
  return seat;
}

// ─── Describing a pattern ───────────────────────────────

function joinDays(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "Every Monday", "Every other Tuesday and Thursday", "Every 3 weeks on Saturday". */
export function describeRecurrence(weekdays: number[], interval: number): string {
  const ordered = WEEKDAYS_FROM_MONDAY.filter((day) => weekdays.includes(day.value));
  if (ordered.length === 7 && interval === 1) return "Every day";

  const names = ordered.map((day) =>
    ordered.length > 2 ? day.short : day.label
  );
  const days = joinDays(names);

  if (interval === 1) return `Every ${days}`;
  if (interval === 2) return `Every other ${days}`;
  return `Every ${interval} weeks on ${days}`;
}

const SHORT_DAY: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
};

/** "Ongoing", "Until Fri, 18 Dec", "Ended Mon, 5 Oct". */
export function describePatternSpan(
  endsOn: DateOnly | null,
  today: DateOnly
): string {
  if (endsOn === null) return "Ongoing";
  const day = formatDateOnly(parseDateOnly(endsOn), SHORT_DAY);
  return endsOn < today ? `Ended ${day}` : `Until ${day}`;
}

// ─── What volunteers are told ───────────────────────────

/** For a volunteer made a regular on a repeating shift. */
export function regularWelcomeNotice(input: {
  serviceAreaName: string;
  recurrence: string;
  timeRange: string;
}): { title: string; body: string } {
  return {
    title: `You're a regular on ${input.serviceAreaName}`,
    body: `${input.recurrence}, ${input.timeRange}. You're on the roster - cancel any week you can't make it.`,
  };
}

/** For a volunteer whose shift went when its repeating shift was stopped. */
export function patternStoppedNotice(input: {
  serviceAreaName: string;
  dayLabel: string;
}): { title: string; body: string } {
  return {
    title: "A shift you were on is no longer running",
    body: `${input.serviceAreaName} on ${input.dayLabel} has been taken off the roster. Thank you for being ready to help.`,
  };
}
