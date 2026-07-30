/**
 * The event form's contract, kept out of the server action so it can be
 * exercised directly: create and edit send the same payload, and every date on
 * it is a calendar day (see date-only.ts).
 */

import { z } from "zod";

import { dateOnlyOf, isDateOnly, parseDateOnly } from "@/lib/date-only";
import type { Audience } from "@prisma/client";

export const EVENT_AUDIENCES = ["ALL", "VOLUNTEERS", "COORDINATORS"] as const;

export const EVENT_TITLE_MAX = 120;
export const EVENT_DESCRIPTION_MAX = 5000;
export const EVENT_LOCATION_MAX = 200;

/** Everything the create and edit forms send. Dates are calendar days. */
export type EventFormData = {
  title: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm
  endTime?: string | null; // HH:mm
  location?: string | null;
  audience: string;
  rsvpEnabled: boolean;
  rsvpDeadline?: string | null; // YYYY-MM-DD
};

/** What the action writes: calendar days resolved to their stored form. */
export type ParsedEvent = {
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  audience: Audience;
  rsvpEnabled: boolean;
  rsvpDeadline: Date | null;
};

export type ParseEventResult =
  | { ok: true; value: ParsedEvent }
  | { ok: false; error: string };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** An empty time or location field means "not set", not an invalid value. */
const optionalTime = z
  .string()
  .trim()
  .refine((value) => value === "" || TIME_PATTERN.test(value), "Enter a time as HH:mm.")
  .nullish();

export const eventInput = z
  .object({
    title: z
      .string("Give the event a name.")
      .trim()
      .min(1, "Give the event a name.")
      .max(EVENT_TITLE_MAX, `Keep the name under ${EVENT_TITLE_MAX} characters.`),
    description: z
      .string()
      .trim()
      .max(
        EVENT_DESCRIPTION_MAX,
        `Keep the details under ${EVENT_DESCRIPTION_MAX} characters.`
      )
      .nullish(),
    date: z.string().refine(isDateOnly, "Choose the day the event is on."),
    startTime: optionalTime,
    endTime: optionalTime,
    location: z
      .string()
      .trim()
      .max(EVENT_LOCATION_MAX, `Keep the place under ${EVENT_LOCATION_MAX} characters.`)
      .nullish(),
    audience: z.enum(EVENT_AUDIENCES, "Choose who's invited."),
    rsvpEnabled: z.boolean(),
    rsvpDeadline: z
      .string()
      .refine(
        (value) => value === "" || isDateOnly(value),
        "Choose the last day to reply."
      )
      .nullish(),
  })
  .refine((data) => !(data.endTime && !data.startTime), {
    message: "Add a start time as well as an end time.",
    path: ["startTime"],
  })
  .refine(
    (data) => !data.startTime || !data.endTime || data.startTime < data.endTime,
    { message: "The end time must be after the start time.", path: ["endTime"] }
  );

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the details and try again.";
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Validates a form payload and turns its calendar days into stored dates.
 *
 * `existing` is the event as it stands when editing. A date or reply deadline
 * that has already passed is history rather than a mistake, so carrying it
 * through unchanged stays legal — otherwise last year's party could never be
 * corrected. Moving either one into the past is still refused.
 */
export function parseEventForm(
  data: EventFormData,
  options: {
    today: string;
    existing?: { date: Date; rsvpDeadline: Date | null } | null;
  }
): ParseEventResult {
  const parsed = eventInput.safeParse(data);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { today, existing } = options;
  const date = parsed.data.date;
  const dateUnchanged = existing ? dateOnlyOf(existing.date) === date : false;

  if (date < today && !dateUnchanged) {
    return { ok: false, error: "The event date is in the past." };
  }

  const rsvpEnabled = parsed.data.rsvpEnabled;
  const deadline = blankToNull(parsed.data.rsvpDeadline);

  if (deadline !== null && !rsvpEnabled) {
    return {
      ok: false,
      error: "Turn replies on, or clear the reply-by date.",
    };
  }
  if (deadline !== null) {
    if (deadline > date) {
      return { ok: false, error: "Replies must close on or before the event." };
    }
    const deadlineUnchanged = existing?.rsvpDeadline
      ? dateOnlyOf(existing.rsvpDeadline) === deadline
      : false;
    if (deadline < today && !deadlineUnchanged) {
      return { ok: false, error: "The reply-by date is in the past." };
    }
  }

  const startTime = blankToNull(parsed.data.startTime);
  const endTime = blankToNull(parsed.data.endTime);

  return {
    ok: true,
    value: {
      title: parsed.data.title,
      description: blankToNull(parsed.data.description),
      date: parseDateOnly(date),
      startTime,
      endTime,
      location: blankToNull(parsed.data.location),
      audience: parsed.data.audience,
      rsvpEnabled,
      rsvpDeadline: deadline ? parseDateOnly(deadline) : null,
    },
  };
}
