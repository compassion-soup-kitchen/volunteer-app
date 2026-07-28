/**
 * Calendar days.
 *
 * `Shift.date` and `TrainingSession.date` are `@db.Date` — a day on the
 * kitchen's wall calendar, with no time and no timezone. Prisma reads them
 * back as `Date`s at midnight UTC, and that is the only encoding the rest of
 * the app should assume.
 *
 * The trap is the other direction. A date picker hands back a `Date` at
 * *local* midnight, so `toISOString()` on Tuesday 1 September in Aotearoa
 * (UTC+12) reads "2026-08-31T12:00:00Z" — and the shift lands on Monday.
 * Every conversion between a picked date and a stored day goes through the
 * helpers here.
 *
 * "Today" is likewise a wall-calendar question, so it is answered in the
 * kitchen's timezone rather than the server's or UTC.
 */

export const APP_TIME_ZONE = "Pacific/Auckland";

/** A calendar day as `YYYY-MM-DD` — the wire format for dates in and out. */
export type DateOnly = string;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const appZoneParts = new Intl.DateTimeFormat("en-NZ", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Wall-clock reading in the kitchen's timezone, used to measure its offset. */
const appZoneClock = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** Whether a string is a well-formed, real calendar day. */
export function isDateOnly(value: string): value is DateOnly {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * The wall-calendar day a picker's local-midnight `Date` stands for.
 * Reads the local fields, never the UTC ones — that is the whole point.
 */
export function toDateOnly(date: Date): DateOnly {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `"2026-09-01"` → the midnight-UTC `Date` a `@db.Date` column stores. */
export function parseDateOnly(value: string): Date {
  if (!isDateOnly(value)) {
    throw new Error(`Not a calendar day: ${value}`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

/** Same as `parseDateOnly`, but `null` instead of a throw for bad input. */
export function safeParseDateOnly(value: string): Date | null {
  return isDateOnly(value) ? parseDateOnly(value) : null;
}

/** The stored day of a `@db.Date` value, as `YYYY-MM-DD`. */
export function dateOnlyOf(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

/**
 * A stored `@db.Date` value turned back into the local-midnight `Date` a
 * date picker expects. The inverse of `toDateOnly`.
 */
export function toPickerDate(date: Date): Date {
  const [year, month, day] = dateOnlyOf(date).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** The calendar day `days` either side of another one. */
export function addDaysToDateOnly(value: string, days: number): DateOnly {
  const shifted = parseDateOnly(value);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return dateOnlyOf(shifted);
}

/** Today on the kitchen's wall calendar, wherever the server happens to run. */
export function todayInAppZone(now: Date = new Date()): DateOnly {
  const parts = appZoneParts.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * The midnight-UTC encoding of today in the kitchen's timezone — the floor
 * for "upcoming" queries, so a shift still happening this afternoon isn't
 * filtered out just because UTC has already rolled over.
 */
export function startOfTodayInAppZone(now: Date = new Date()): Date {
  return parseDateOnly(todayInAppZone(now));
}

/**
 * The kitchen's offset from UTC at a given instant, in milliseconds.
 *
 * Read back out of `Intl` rather than hard-coded, because Aotearoa is UTC+12
 * in winter and UTC+13 over daylight saving.
 */
function appZoneOffsetMs(at: Date): number {
  const parts = appZoneClock.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  // `hour12: false` yields hour 24 rather than 0 at midnight in some engines.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asIfUtc - at.getTime();
}

/**
 * The instant a calendar day *starts* in the kitchen's timezone.
 *
 * For real timestamp columns — `VolunteerProfile.createdAt` and friends — this
 * is the only correct way to bound a range picked as wall-calendar days.
 * `@db.Date` columns are a different problem: those store the day itself as
 * midnight UTC, so `parseDateOnly` is what they want.
 *
 * Parsing "2026-07-01" as UTC midnight would land 12 hours *after* the day
 * actually began in Wellington, quietly dropping everything recorded that
 * morning.
 */
export function startOfDayInAppZone(value: DateOnly): Date {
  const utcMidnight = parseDateOnly(value);

  // Guess using the offset at UTC midnight, then re-measure at the candidate
  // instant: on a DST changeover the two differ, and the second reading is the
  // one that belongs to the day being asked about.
  const firstGuess = new Date(utcMidnight.getTime() - appZoneOffsetMs(utcMidnight));
  const settledOffset = appZoneOffsetMs(firstGuess);
  return new Date(utcMidnight.getTime() - settledOffset);
}

/**
 * The instant *after* a calendar day ends in the kitchen's timezone — the
 * exclusive upper bound of a range.
 *
 * Exclusive rather than 23:59:59.999 so nothing recorded in the final
 * millisecond of the day can slip through the gap.
 */
export function endOfDayExclusiveInAppZone(value: DateOnly): Date {
  return startOfDayInAppZone(addDaysToDateOnly(value, 1));
}

/**
 * Formats a real timestamp as the calendar day it fell on in the kitchen's
 * timezone. The counterpart to `formatDateOnly`, which is for stored days.
 */
export function timestampToDateOnly(at: Date): DateOnly {
  return todayInAppZone(at);
}

/** Whether a stored day is today on the kitchen's wall calendar. */
export function isTodayInAppZone(date: Date, now: Date = new Date()): boolean {
  return dateOnlyOf(date) === todayInAppZone(now);
}

/** Whether a stored day has already been and gone. */
export function isPastInAppZone(date: Date, now: Date = new Date()): boolean {
  return dateOnlyOf(date) < todayInAppZone(now);
}

/**
 * Formats a stored day. Anchored to UTC because that is where the day is
 * encoded — formatting in local time would shift it either side of midnight.
 */
export function formatDateOnly(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  return date.toLocaleDateString("en-NZ", { ...options, timeZone: "UTC" });
}
