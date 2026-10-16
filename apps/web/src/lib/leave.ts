/**
 * The rules for leave - time someone is away from the kitchen - kept pure so
 * they can be tested without a database.
 *
 * Volunteers and the kitchen team both keep leave. For anyone on the roster it
 * changes the roster, not just a record: while it runs they can't be signed up
 * or rostered, regulars aren't seated on their repeating shifts, and logging
 * it takes them off shifts they were already on. This file answers *who* keeps
 * leave and *which days* those effects reach; data/leave.ts applies them.
 *
 * Everything is in `DateOnly` strings, so a stretch of days can't drift
 * across midnight the way `Date` arithmetic does (see date-only.ts). A range
 * is inclusive at both ends - "3 to 14 November" means back on the 15th.
 */

import type { Role } from "@prisma/client";
import { z } from "zod";

import {
  addDaysToDateOnly,
  formatDateOnly,
  isDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";

/** Room for "Overseas - back for the Christmas rush", not a medical history. */
export const LEAVE_REASON_MAX = 120;

/** Longer than a year is a pause, not leave - that's the volunteer's status. */
export const MAX_LEAVE_DAYS = 366;

/** How far ahead leave can start. Catches a mistyped year more than anything. */
export const MAX_LEAVE_LEAD_DAYS = 730;

export type LeaveRange = { startsOn: DateOnly; endsOn: DateOnly };

const STAFF_ROLES: readonly Role[] = ["COORDINATOR", "ADMIN"];

/**
 * Who keeps leave: anyone with a volunteer record (it starts with their
 * application), and the kitchen team whether or not they volunteer too - the
 * people covering for a coordinator need to know they're away. Someone who has
 * only signed up has nothing to be away from yet.
 */
export function keepsLeave(person: { role: Role; hasVolunteerProfile: boolean }): boolean {
  return person.hasVolunteerProfile || STAFF_ROLES.includes(person.role);
}

export type LeaveStage = "upcoming" | "current" | "past";

function bothDays(value: { startsOn: string; endsOn: string }): boolean {
  return isDateOnly(value.startsOn) && isDateOnly(value.endsOn);
}

export const leaveInput = z
  .object({
    startsOn: z.string().refine(isDateOnly, "Choose the first day you're away."),
    endsOn: z.string().refine(isDateOnly, "Choose the last day you're away."),
    reason: z
      .string()
      .trim()
      .max(LEAVE_REASON_MAX, `Keep the reason under ${LEAVE_REASON_MAX} characters.`)
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  // Zod still runs these when a day above failed, so each guards for it.
  .refine((value) => !bothDays(value) || value.endsOn >= value.startsOn, {
    message: "The last day away can't be before the first.",
    path: ["endsOn"],
  })
  .refine((value) => !bothDays(value) || leaveLength(value) <= MAX_LEAVE_DAYS, {
    message: "Leave can be up to a year at a time. For longer, talk to the kitchen.",
    path: ["endsOn"],
  });

export type LeaveInput = z.infer<typeof leaveInput>;

/** How many days a stretch of leave covers, both ends included. */
export function leaveLength(range: LeaveRange): number {
  const ms = parseDateOnly(range.endsOn).getTime() - parseDateOnly(range.startsOn).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Where a stretch of leave sits against today. */
export function leaveStage(range: LeaveRange, today: DateOnly): LeaveStage {
  if (range.endsOn < today) return "past";
  if (range.startsOn > today) return "upcoming";
  return "current";
}

/** Whether a calendar day falls inside a stretch of leave. */
export function coversDay(range: LeaveRange, date: DateOnly): boolean {
  return range.startsOn <= date && date <= range.endsOn;
}

/** The leave covering a day, if any. */
export function leaveOn<T extends LeaveRange>(ranges: readonly T[], date: DateOnly): T | null {
  return ranges.find((range) => coversDay(range, date)) ?? null;
}

export function rangesOverlap(a: LeaveRange, b: LeaveRange): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

/** The days of `a` that `b` doesn't cover - none, one or two stretches. */
export function subtractRange(a: LeaveRange, b: LeaveRange | null): LeaveRange[] {
  if (!b || !rangesOverlap(a, b)) return [a];
  const parts: LeaveRange[] = [];
  if (a.startsOn < b.startsOn) {
    parts.push({ startsOn: a.startsOn, endsOn: addDaysToDateOnly(b.startsOn, -1) });
  }
  if (a.endsOn > b.endsOn) {
    parts.push({ startsOn: addDaysToDateOnly(b.endsOn, 1), endsOn: a.endsOn });
  }
  return parts;
}

/** A range clipped to start no earlier than `from`, or null if nothing's left. */
export function clipFrom(range: LeaveRange, from: DateOnly): LeaveRange | null {
  if (range.endsOn < from) return null;
  return { startsOn: range.startsOn < from ? from : range.startsOn, endsOn: range.endsOn };
}

/**
 * What saving a stretch of leave does to the roster, from today on.
 *
 * `takeOff` is days now covered that weren't before - the volunteer comes off
 * any shift there. `putBack` is days no longer covered - regulars go back on
 * their repeating shifts there. Days already gone are history and are never
 * touched either way, so neither list reaches before today.
 */
export function rosterChanges(input: {
  before: LeaveRange | null;
  after: LeaveRange | null;
  today: DateOnly;
}): { takeOff: LeaveRange[]; putBack: LeaveRange[] } {
  const clip = (ranges: LeaveRange[]) =>
    ranges
      .map((range) => clipFrom(range, input.today))
      .filter((range): range is LeaveRange => range !== null);

  return {
    takeOff: input.after ? clip(subtractRange(input.after, input.before)) : [],
    putBack: input.before ? clip(subtractRange(input.before, input.after)) : [],
  };
}

/**
 * Why a stretch of leave can't be saved as given, or null when it can.
 *
 * `existing` is the leave being changed, or null for new leave. Leave already
 * over is the record of what happened and stays as it is. Leave already under
 * way keeps its first day - the volunteer was away then, whatever changes now -
 * and can't be ended before today here: coming back early has its own path
 * (`endLeaveDecision`), because "back" is a different thing to say than "my
 * dates were wrong".
 */
export function leaveSaveBlocker(input: {
  range: LeaveRange;
  today: DateOnly;
  existing: LeaveRange | null;
  /** The volunteer's other leave, to keep stretches from overlapping. */
  others: readonly LeaveRange[];
}): string | null {
  const { range, today, existing } = input;

  if (existing) {
    const stage = leaveStage(existing, today);
    if (stage === "past") return "That leave is over, so it stays as it was.";
    if (stage === "current" && range.startsOn !== existing.startsOn) {
      return "That leave has already started, so its first day can't move.";
    }
  }

  if (range.endsOn < today) {
    return "That leave has already finished - choose dates from today on.";
  }
  if (range.startsOn > addDaysToDateOnly(today, MAX_LEAVE_LEAD_DAYS)) {
    return "That's more than two years away. Check the year?";
  }

  const clash = input.others.find((other) => rangesOverlap(other, range));
  if (clash) {
    return `That overlaps leave already logged for ${formatLeaveRange(clash)}.`;
  }
  return null;
}

export type EndLeaveDecision =
  | { action: "reject"; error: string }
  /** Started today, so ending it now leaves nothing worth keeping. */
  | { action: "delete" }
  /** Keeps the days already away; yesterday becomes the last of them. */
  | { action: "shorten"; endsOn: DateOnly };

/** Coming back early: ends leave that's under way, as of today. */
export function endLeaveDecision(range: LeaveRange, today: DateOnly): EndLeaveDecision {
  const stage = leaveStage(range, today);
  if (stage === "past") return { action: "reject", error: "That leave has already finished." };
  if (stage === "upcoming") {
    return { action: "reject", error: "That leave hasn't started yet - cancel it instead." };
  }
  if (range.startsOn === today) return { action: "delete" };
  return { action: "shorten", endsOn: addDaysToDateOnly(today, -1) };
}

/**
 * Whether a stretch of leave may be removed outright.
 *
 * A volunteer cancels leave that hasn't started; once it has, they come back
 * from it instead, so the days they were away stay on record. Staff can remove
 * any of it - that's how a mistake gets fixed.
 */
export function deleteLeaveBlocker(input: {
  range: LeaveRange;
  today: DateOnly;
  isStaff: boolean;
}): string | null {
  if (input.isStaff) return null;
  const stage = leaveStage(input.range, input.today);
  if (stage === "upcoming") return null;
  return stage === "current"
    ? "Your leave has already started. Tap \"I'm back\" if you're back early."
    : "That leave is over, so it stays on your record.";
}

// ─── Words ──────────────────────────────────────────────

function day(date: DateOnly, options: Intl.DateTimeFormatOptions): string {
  return formatDateOnly(parseDateOnly(date), options);
}

/**
 * "Tue, 3 Nov", "3 – 14 Nov", "28 Nov – 4 Dec", "21 Dec 2026 – 8 Jan 2027".
 * The year appears only when the range crosses one, or isn't this year.
 */
export function formatLeaveRange(range: LeaveRange, today?: DateOnly): string {
  const { startsOn, endsOn } = range;
  const sameYear = startsOn.slice(0, 4) === endsOn.slice(0, 4);
  const showYear = !sameYear || (today !== undefined && startsOn.slice(0, 4) !== today.slice(0, 4));

  if (startsOn === endsOn) {
    return day(startsOn, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(showYear ? { year: "numeric" } : {}),
    });
  }

  const endText = day(endsOn, {
    day: "numeric",
    month: "short",
    ...(showYear ? { year: "numeric" } : {}),
  });
  const sameMonth = sameYear && startsOn.slice(5, 7) === endsOn.slice(5, 7);
  const startText = sameMonth
    ? day(startsOn, { day: "numeric" })
    : day(startsOn, {
        day: "numeric",
        month: "short",
        ...(sameYear ? {} : { year: "numeric" }),
      });
  return `${startText} – ${endText}`;
}

/** "1 day", "12 days". */
export function formatLeaveLength(range: LeaveRange): string {
  const days = leaveLength(range);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * A short status for leave against today: "Away until Sat, 14 Nov",
 * "Starts Tue, 3 Nov", "Back on Sun, 15 Nov".
 */
export function describeLeaveStatus(range: LeaveRange, today: DateOnly): string {
  const stage = leaveStage(range, today);
  const long = (date: DateOnly) => day(date, { weekday: "short", day: "numeric", month: "short" });
  if (stage === "current") {
    return range.endsOn === today ? "Away today, back tomorrow" : `Away until ${long(range.endsOn)}`;
  }
  if (stage === "upcoming") return `Starts ${long(range.startsOn)}`;
  return `Back on ${long(addDaysToDateOnly(range.endsOn, 1))}`;
}

/** What a volunteer trying to take a shift on a leave day is told. */
export function onLeaveSignupMessage(range: LeaveRange): string {
  return `You're on leave then (${formatLeaveRange(range)}). Change your leave first if you can make it after all.`;
}

/** What staff rostering someone on leave are told. */
export function onLeaveRosterMessage(range: LeaveRange): string {
  return `They're on leave that day (${formatLeaveRange(range)}). Change their leave first if they can come after all.`;
}

/**
 * The push a volunteer gets when staff log or change their leave for them -
 * they should never find out from the roster that they've been taken off it.
 */
export function leaveLoggedNotice(input: {
  range: LeaveRange;
  removedShifts: number;
  isNew: boolean;
}): { title: string; body: string } {
  const dates = formatLeaveRange(input.range);
  const shifts =
    input.removedShifts === 0
      ? ""
      : ` You're off ${input.removedShifts} ${input.removedShifts === 1 ? "shift" : "shifts"} while you're away.`;
  return {
    title: input.isNew ? "Your leave is logged" : "Your leave has changed",
    body: `The kitchen has you away ${dates}.${shifts} Kia pai tō wā.`,
  };
}

/** The push a volunteer gets when staff remove leave that hadn't finished. */
export function leaveRemovedNotice(range: LeaveRange): { title: string; body: string } {
  return {
    title: "Your leave has changed",
    body: `The kitchen has removed your leave for ${formatLeaveRange(range)}. Talk to them if that's a surprise.`,
  };
}
