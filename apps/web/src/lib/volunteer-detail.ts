import { isDateOnly, type DateOnly } from "./date-only";

/**
 * Pure helpers for reading one volunteer's record - the shapes a staff member
 * sees on /staff/volunteers/[userId]. Kept out of the page so the awkward bits
 * (a `Json` availability column, an age that must not drift a day either side
 * of a birthday) can be tested without a database.
 */

/** The week in the order people say it, not the order JSON happens to store it. */
export const AVAILABILITY_DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
] as const;

export type AvailabilityDay = {
  key: string;
  label: string;
  short: string;
  slots: string[];
};

/**
 * The days a volunteer said they can help, in week order.
 *
 * `VolunteerProfile.availability` is a `Json` column written by the application
 * form, so nothing about its shape is guaranteed at the type level - an old row,
 * a hand-edited one, or a half-saved one can hold anything. Days with no slots
 * are dropped: an empty Tuesday is not a fact worth a row.
 */
export function summariseAvailability(availability: unknown): AvailabilityDay[] {
  if (!availability || typeof availability !== "object") return [];
  if (Array.isArray(availability)) return [];

  const byDay = availability as Record<string, unknown>;

  return AVAILABILITY_DAYS.map((day) => {
    const raw = byDay[day.key];
    const slots = Array.isArray(raw)
      ? raw.filter((slot): slot is string => typeof slot === "string" && slot !== "")
      : [];
    return { ...day, slots };
  }).filter((day) => day.slots.length > 0);
}

/**
 * Age in whole years on a given calendar day.
 *
 * Both arguments are calendar days rather than timestamps, so a birthday turns
 * over at midnight in the kitchen's timezone - not at whatever midnight the
 * server happens to keep. Returns null for a malformed or future date of birth,
 * which reads as "we don't know" rather than a nonsense negative age.
 */
export function ageInYears(
  dateOfBirth: string,
  on: DateOnly
): number | null {
  if (!isDateOnly(dateOfBirth) || !isDateOnly(on)) return null;
  if (dateOfBirth > on) return null;

  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, month, day] = on.split("-").map(Number);

  let age = year - birthYear;
  // Not there yet this year - the birthday is still to come.
  if (month < birthMonth || (month === birthMonth && day < birthDay)) {
    age -= 1;
  }
  return age;
}
