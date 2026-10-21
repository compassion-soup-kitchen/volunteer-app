/**
 * Shared display formatters. Shift and training times are stored as "HH:mm"
 * strings, so the whole app reads them back the same friendly way.
 */

import {
  formatDateOnly,
  formatTimestampInAppZone,
  parseDateOnly,
  timeOfDayInAppZone,
  timestampToDateOnly,
} from "@/lib/date-only";

/** "09:00" -> "9am", "13:30" -> "1:30pm". */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "pm" : "am";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${displayH}${displayM}${period}`;
}

/** "09:00", "13:00" -> "9am – 1pm". */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/**
 * A real timestamp (`createdAt`, `uploadedAt`, `signedAt`) as the day it
 * happened in Wellington: "21 Oct 2026". Always in the kitchen's timezone, so
 * the server's render and the browser's hydration agree, and a staff member
 * reading at 9am never sees yesterday. Stored calendar days (`@db.Date`) are a
 * different thing and go through `formatDateOnly`.
 */
export function formatTimestamp(at: Date | string): string {
  return formatTimestampInAppZone(new Date(at));
}

/** Same as `formatTimestamp`, with the time it happened: "21 Oct 2026 at 9:15am". */
export function formatTimestampWithTime(at: Date | string): string {
  const instant = new Date(at);
  return `${formatTimestamp(instant)} at ${formatTime(timeOfDayInAppZone(instant))}`;
}

/**
 * A date of birth: "1 July 1990".
 *
 * Stored two ways: staff entering an offline volunteer save the day at
 * midnight UTC, while the web application form saves the picker's NZ
 * midnight, which is the previous day in UTC. Reading the day in Wellington
 * lands both on the right date (NZ is ahead of UTC, so UTC midnight is still
 * the same day there), and matches how the age beside it is worked out.
 */
export function formatDateOfBirth(date: Date): string {
  return formatDateOnly(parseDateOnly(timestampToDateOnly(date)), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * What to call someone in a list: their name, or their email address when they
 * never gave one. Offline volunteers may have no address at all, but staff
 * can't add one without a name, so the last fallback only covers a malformed
 * record.
 */
export function personName(person: {
  name: string | null;
  email: string | null;
}): string {
  return person.name?.trim() || person.email || "Unnamed volunteer";
}

/**
 * The one line under someone's name that says how to reach them. An offline
 * volunteer often has no email, and a phone number is what staff ring.
 */
export function contactLine(person: {
  email: string | null;
  phone?: string | null;
}): string {
  return person.email || person.phone?.trim() || "No email or phone";
}
