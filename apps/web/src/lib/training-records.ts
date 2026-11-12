import { z } from "zod";
import { isDateOnly, todayInAppZone, type DateOnly } from "@/lib/date-only";

/**
 * Rules for the files and training staff write onto a volunteer's record.
 *
 * The kitchen keeps its training and safety sign-offs on paper: the sheet is
 * ticked by whoever ran the training, scanned, and attached to the volunteer.
 * The app holds the scan and a line saying what was completed and when, so a
 * coordinator can answer "had they done the dinner training?" without digging
 * through a filing cabinet.
 */

/**
 * The kinds of file staff may attach to one volunteer. Policies and training
 * material are org-wide (every volunteer can download them), so they belong
 * in the file manager, not on one person's record.
 */
export const VOLUNTEER_FILE_TYPES = [
  "TRAINING_RECORD",
  "MOJ_FORM",
  "POLICE_VETTING",
  "ID",
  "OTHER",
] as const;

export type VolunteerFileType = (typeof VOLUNTEER_FILE_TYPES)[number];

export function isVolunteerFileType(value: string): value is VolunteerFileType {
  return (VOLUNTEER_FILE_TYPES as readonly string[]).includes(value);
}

export const TRAINING_RECORD_NOTE_MAX = 500;

/** Nothing signed off before the kitchen kept records is worth typing in. */
const EARLIEST_COMPLETED_ON = "2000-01-01";

export type TrainingRecordInput = {
  typeId: string;
  completedOn: DateOnly;
  note: string | null;
};

const trainingRecordSchema = z.object({
  typeId: z.string().trim().min(1, "Choose which training they completed."),
  completedOn: z
    .string()
    .trim()
    .refine(isDateOnly, "Choose the day the training was signed off."),
  note: z
    .string()
    .trim()
    .max(
      TRAINING_RECORD_NOTE_MAX,
      `Keep the note under ${TRAINING_RECORD_NOTE_MAX} characters.`
    )
    .optional()
    .transform((note) => (note ? note : null)),
});

/**
 * Validates a manual training record. The day must be real, not in the future
 * (it records something that has happened), and not implausibly old.
 */
export function parseTrainingRecordInput(
  raw: { typeId?: unknown; completedOn?: unknown; note?: unknown },
  now: Date = new Date()
): { ok: true; value: TrainingRecordInput } | { ok: false; error: string } {
  const parsed = trainingRecordSchema.safeParse({
    typeId: typeof raw.typeId === "string" ? raw.typeId : "",
    completedOn: typeof raw.completedOn === "string" ? raw.completedOn : "",
    note: typeof raw.note === "string" ? raw.note : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const completedOn = parsed.data.completedOn as DateOnly;
  if (completedOn > todayInAppZone(now)) {
    return {
      ok: false,
      error: "That day hasn't happened yet - record training once it's signed off.",
    };
  }
  if (completedOn < EARLIEST_COMPLETED_ON) {
    return { ok: false, error: "Check the year - that date looks too early." };
  }

  return {
    ok: true,
    value: { typeId: parsed.data.typeId, completedOn, note: parsed.data.note },
  };
}

/** Anything with a calendar day and an id, newest first. */
export function newestFirst<T extends { date: Date; id: string }>(
  items: T[]
): T[] {
  return items
    .slice()
    .sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
}
