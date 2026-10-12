/**
 * Volunteers who don't use the app - the old hands who'd rather ring in, and
 * whose paperwork is done on paper. Staff keep their record for them: create
 * it, keep its details current, roster them and mark their attendance, which
 * is where their hours come from.
 *
 * The form contract lives here so it can be tested without a database.
 */

import { z } from "zod";

import { isDateOnly, type DateOnly } from "@/lib/date-only";

/** Where an offline volunteer can start: their paperwork may already be done. */
export const OFFLINE_START_STATUSES = [
  "ACTIVE",
  "APPROVED_FOR_INDUCTION",
  "AWAITING_VETTING",
] as const;
export type OfflineStartStatus = (typeof OFFLINE_START_STATUSES)[number];

export const OFFLINE_START_STATUS_LABELS: Record<OfflineStartStatus, string> = {
  ACTIVE: "Active - ready to be rostered",
  APPROVED_FOR_INDUCTION: "Approved - induction still to do",
  AWAITING_VETTING: "Awaiting vetting",
};

export const MOJ_STATUSES = ["NOT_STARTED", "SUBMITTED", "CLEARED", "FLAGGED"] as const;

const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const detailFields = {
  name: z
    .string()
    .trim()
    .min(2, "Enter their full name.")
    .max(120, "That name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value === "" ? null : value))
    .refine(
      (value) => value === null || z.email().safeParse(value).success,
      "That email address doesn't look right."
    ),
  phone: optionalText(30, "That phone number is too long."),
  address: optionalText(300, "That address is too long."),
  dateOfBirth: z
    .string()
    .trim()
    .refine((value) => value === "" || isDateOnly(value), "Choose a real date.")
    .transform((value) => (value === "" ? null : (value as DateOnly))),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalText(30),
  emergencyContactRelationship: optionalText(60),
  bio: optionalText(3000, "Keep the notes under 3000 characters."),
  serviceAreaIds: z.array(z.string().min(1).max(40)).max(30),
};

export const offlineVolunteerDetails = z.object(detailFields);

export const offlineVolunteerInput = z.object({
  ...detailFields,
  status: z.enum(OFFLINE_START_STATUSES),
  mojStatus: z.enum(MOJ_STATUSES),
});

/** What the create form sends; dates are calendar days, blanks are "". */
export type OfflineVolunteerFormData = z.input<typeof offlineVolunteerInput>;
export type OfflineVolunteerDetailsData = z.input<typeof offlineVolunteerDetails>;

/** The first error zod found, in the wording the form shows inline. */
export function firstOfflineIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the details and try again.";
}

/**
 * A date of birth in the future is a typo - usually this year typed for the
 * birth year.
 */
export function dateOfBirthError(
  dateOfBirth: DateOnly | null,
  today: DateOnly
): string | null {
  return dateOfBirth !== null && dateOfBirth >= today
    ? "The date of birth must be in the past."
    : null;
}

/**
 * The role that goes with a starting status, matching what reviewing an
 * application does: approval is what makes someone a VOLUNTEER.
 */
export function roleForStartStatus(status: OfflineStartStatus): "VOLUNTEER" | "PUBLIC" {
  return status === "AWAITING_VETTING" ? "PUBLIC" : "VOLUNTEER";
}
