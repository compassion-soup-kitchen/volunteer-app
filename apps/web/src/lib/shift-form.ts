/**
 * The shift form's contract, kept out of the server-action file so it can be
 * exercised directly: both create and edit send the same payload, and every
 * date on it is a calendar day (see date-only.ts).
 */

import { z } from "zod";

import { dateOnlyOf, isDateOnly, parseDateOnly } from "@/lib/date-only";
import { resolveOfferWindow } from "@/lib/shift-offers";

/** Everything the create and edit forms send. Dates are calendar days. */
export type ShiftFormData = {
  serviceAreaId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  notes?: string;
  /** VolunteerProfile ids offered the shift ahead of everyone else. */
  offeredVolunteerIds?: string[];
  /** Calendar day that offer is held through, or null for no first refusal. */
  offersCloseOn?: string | null;
};

/** What the action writes: calendar days resolved to their stored form. */
export type ParsedShift = {
  serviceAreaId: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  offersCloseOn: Date | null;
  offeredVolunteerIds: string[];
};

export type ParseShiftResult =
  | { ok: true; value: ParsedShift }
  | { ok: false; error: string };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const shiftInput = z
  .object({
    serviceAreaId: z.string().min(1, "Please select a service area."),
    date: z.string().refine(isDateOnly, "Please select a date."),
    startTime: z.string().regex(TIME_PATTERN, "Start time is required."),
    endTime: z.string().regex(TIME_PATTERN, "End time is required."),
    capacity: z
      .number()
      .int("Capacity must be a whole number.")
      .min(1, "Capacity must be at least 1.")
      .max(50, "Capacity can't be more than 50."),
    notes: z.string().trim().max(2000).optional(),
    offeredVolunteerIds: z.array(z.string().min(1)).max(50).optional(),
    offersCloseOn: z
      .string()
      .refine(isDateOnly, "Please choose the day the offer is held until.")
      .nullish(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

/** The first error zod found, in the wording the form shows inline. */
function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the details and try again.";
}

/**
 * Validates a form payload and turns its calendar days into stored dates.
 *
 * `existingOffersCloseOn` is the hold already on the shift when editing. A
 * hold that has since lapsed is history rather than a mistake, so carrying it
 * through unchanged stays legal — otherwise a shift whose offer closed last
 * week could never be edited again.
 */
export function parseShiftForm(
  data: ShiftFormData,
  options: { today: string; existingOffersCloseOn?: Date | null }
): ParseShiftResult {
  const parsed = shiftInput.safeParse(data);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const window = resolveOfferWindow({
    shiftDate: parsed.data.date,
    offersCloseOn: parsed.data.offersCloseOn ?? null,
    volunteerIds: parsed.data.offeredVolunteerIds ?? [],
    today: options.today,
    existingOffersCloseOn: options.existingOffersCloseOn
      ? dateOnlyOf(options.existingOffersCloseOn)
      : null,
  });
  if (!window.ok) return { ok: false, error: window.error };

  return {
    ok: true,
    value: {
      serviceAreaId: parsed.data.serviceAreaId,
      date: parseDateOnly(parsed.data.date),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      capacity: parsed.data.capacity,
      notes: parsed.data.notes || null,
      offersCloseOn: window.offersCloseOn
        ? parseDateOnly(window.offersCloseOn)
        : null,
      offeredVolunteerIds: window.volunteerIds,
    },
  };
}

/**
 * Whether an offer still has time to run. An edit can carry a lapsed hold
 * through untouched, and nobody should be paged about a shift that is already
 * open to everyone.
 */
export function holdIsLive(offersCloseOn: Date | null, today: string): boolean {
  return offersCloseOn !== null && dateOnlyOf(offersCloseOn) >= today;
}
