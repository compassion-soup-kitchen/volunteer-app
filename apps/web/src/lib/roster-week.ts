/**
 * Pure rules for reading the roster a week at a time. Repeating shifts are
 * generated twelve weeks ahead, so a single list of "everything upcoming" runs
 * to hundreds of rows - both shift pages page through Monday-to-Sunday weeks
 * instead, and these helpers keep the two in step.
 */

import {
  addDaysToDateOnly,
  dateOnlyOf,
  isDateOnly,
  parseDateOnly,
  startOfWeekOf,
  type DateOnly,
} from "@/lib/date-only";

/** `?week=` back to the Monday it names, or null when it names nothing. */
export function parseWeekParam(value: string | undefined): DateOnly | null {
  if (!value || !isDateOnly(value)) return null;
  return startOfWeekOf(value);
}

/** The seven days of the week starting `weekStart`, Monday first. */
export function weekDays(weekStart: DateOnly): DateOnly[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateOnly(weekStart, i));
}

/** Whole weeks from the week holding `today` to `weekStart`; negative is past. */
export function weeksFromNow(weekStart: DateOnly, today: DateOnly): number {
  const diff =
    parseDateOnly(weekStart).getTime() -
    parseDateOnly(startOfWeekOf(today)).getTime();
  return Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

/** "This week", "Next week" or "Last week"; null further out. */
export function relativeWeekName(
  weekStart: DateOnly,
  today: DateOnly
): string | null {
  switch (weeksFromNow(weekStart, today)) {
    case 0:
      return "This week";
    case 1:
      return "Next week";
    case -1:
      return "Last week";
    default:
      return null;
  }
}

/** "In 3 weeks" / "3 weeks ago" - the distance once the name runs out. */
export function weekDistance(weekStart: DateOnly, today: DateOnly): string {
  const weeks = weeksFromNow(weekStart, today);
  if (weeks === 0) return "This week";
  const count = Math.abs(weeks);
  const unit = count === 1 ? "week" : "weeks";
  return weeks > 0 ? `In ${count} ${unit}` : `${count} ${unit} ago`;
}

/**
 * "20 – 26 October", "27 October – 2 November", and the year on both ends once
 * the week isn't in the current one ("29 December 2026 – 4 January 2027").
 */
export function weekRangeLabel(weekStart: DateOnly, today: DateOnly): string {
  const weekEnd = addDaysToDateOnly(weekStart, 6);
  const [startYear, startMonth] = weekStart.split("-");
  const [endYear, endMonth] = weekEnd.split("-");
  const showYear = startYear !== today.slice(0, 4) || endYear !== today.slice(0, 4);

  const day = (value: DateOnly, withMonth: boolean, withYear: boolean) =>
    parseDateOnly(value).toLocaleDateString("en-NZ", {
      day: "numeric",
      ...(withMonth ? { month: "long" } : {}),
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });

  if (showYear) return `${day(weekStart, true, true)} – ${day(weekEnd, true, true)}`;
  if (startMonth === endMonth) {
    return `${day(weekStart, false, false)} – ${day(weekEnd, true, false)}`;
  }
  return `${day(weekStart, true, false)} – ${day(weekEnd, true, false)}`;
}

/**
 * A page's URL for one week and service area. The current week and "all
 * areas" stay out of the query string so the plain path is the default view.
 */
export function rosterWeekHref(
  path: string,
  weekStart: DateOnly,
  today: DateOnly,
  areaId?: string | null
): string {
  const params = new URLSearchParams();
  if (weekStart !== startOfWeekOf(today)) params.set("week", weekStart);
  if (areaId) params.set("area", areaId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Where a volunteer goes to see one shift's day among the week around it.
 * The day rides in `?day=` rather than a `#hash`: Next keeps the previous
 * view of a page mounted (hidden) after navigating, so an element id can be
 * on the page twice and the browser may scroll to the hidden one.
 */
export function volunteerShiftHref(date: Date, today: DateOnly): string {
  const day = dateOnlyOf(date);
  const href = rosterWeekHref("/shifts", startOfWeekOf(day), today);
  return `${href}${href.includes("?") ? "&" : "?"}day=${day}`;
}

/** `?day=`, when it names a day inside the week shown. */
export function parseDayParam(
  value: string | undefined,
  weekStart: DateOnly
): DateOnly | null {
  if (!value || !isDateOnly(value)) return null;
  return weekDays(weekStart).includes(value) ? value : null;
}

/** Shifts sorted into the days they fall on, every day present. */
export function groupByDay<T extends { date: Date }>(
  shifts: readonly T[],
  days: readonly DateOnly[]
): { date: DateOnly; shifts: T[] }[] {
  const byDay = new Map<DateOnly, T[]>(days.map((day) => [day, []]));
  for (const shift of shifts) byDay.get(dateOnlyOf(shift.date))?.push(shift);
  return days.map((date) => ({ date, shifts: byDay.get(date) ?? [] }));
}

/** Still to come, with a seat nobody has taken. */
export function needsPeople(
  shift: { date: Date; capacity: number; filled: number },
  today: DateOnly
): boolean {
  return dateOnlyOf(shift.date) >= today && shift.filled < shift.capacity;
}

/** The figures heading a week of the staff roster. */
export function rosterWeekSummary(
  shifts: readonly { date: Date; capacity: number; filled: number }[],
  today: DateOnly
): { shifts: number; filled: number; capacity: number; needPeople: number } {
  return {
    shifts: shifts.length,
    filled: shifts.reduce((sum, shift) => sum + Math.min(shift.filled, shift.capacity), 0),
    capacity: shifts.reduce((sum, shift) => sum + shift.capacity, 0),
    needPeople: shifts.filter((shift) => needsPeople(shift, today)).length,
  };
}

/**
 * A shift that has been and gone with someone still only "signed up" - nobody
 * has said whether they came, and hours only count once they do.
 */
export function attendanceDue(
  shift: { date: Date; signups: readonly { status: string }[] },
  today: DateOnly
): boolean {
  return (
    dateOnlyOf(shift.date) < today &&
    shift.signups.some((signup) => signup.status === "SIGNED_UP")
  );
}
