/**
 * Rules for the training types staff manage at /staff/training/types.
 *
 * Pure so the branching can be tested without a database. The action layer in
 * training-type-actions.ts handles auth, uniqueness and persistence.
 */

export const TRAINING_TYPE_NAME_MAX = 60;
export const TRAINING_TYPE_DESCRIPTION_MAX = 300;

/** Keys the mobile app treats as core training — see apps/mobile/src/lib/training.ts. */
export const CORE_TRAINING_KEYS = [
  "INDUCTION",
  "HEALTH_SAFETY",
  "DE_ESCALATION",
] as const;

/**
 * The four types that were the `TrainingType` enum before it became a table.
 * Deleting these would strand the mobile app's core-training checklist and the
 * induction count in monthly reporting, so they can be renamed but not removed.
 */
export const SEEDED_TRAINING_TYPE_KEYS = [
  ...CORE_TRAINING_KEYS,
  "OTHER",
] as const;

export function isSeededTrainingType(key: string): boolean {
  return (SEEDED_TRAINING_TYPE_KEYS as readonly string[]).includes(key);
}

/**
 * A stable identifier derived from the name, e.g. "Food Handling" →
 * "FOOD_HANDLING".
 *
 * Macrons are folded to their base letter so a te reo name like "Tikanga
 * Māori" yields an ASCII key; the display name keeps its macrons. Generated
 * once at creation and never regenerated, so a later rename can't break
 * anything matching on the key.
 */
export function trainingTypeKeyFromName(name: string): string {
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks, e.g. the macron in "Māori"
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  // A name of nothing but punctuation or non-Latin script leaves us with no
  // usable key; the caller's uniqueness pass turns this into TYPE_2, TYPE_3, …
  return key || "TYPE";
}

/** Appends a counter until the key is one the database doesn't already hold. */
export function uniqueTrainingTypeKey(
  base: string,
  taken: readonly string[]
): string {
  const existing = new Set(taken);
  if (!existing.has(base)) return base;

  let n = 2;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

// ─── Display ─────────────────────────────────────────────

export type TrainingTypeTone =
  | "info"
  | "warning"
  | "success"
  | "neutral"
  | "default";

/** The colours the built-in types have always carried. */
const TONE_BY_SEEDED_KEY: Record<string, TrainingTypeTone> = {
  INDUCTION: "info",
  DE_ESCALATION: "warning",
  HEALTH_SAFETY: "success",
  OTHER: "neutral",
};

const CUSTOM_TONES: TrainingTypeTone[] = [
  "default",
  "info",
  "success",
  "warning",
];

/**
 * A badge colour for a training type.
 *
 * Staff-created types have no colour of their own, so one is derived from the
 * key — deterministic, so a type looks the same on every screen and doesn't
 * change colour when the list is reordered.
 */
export function trainingTypeTone(key: string): TrainingTypeTone {
  const seeded = TONE_BY_SEEDED_KEY[key];
  if (seeded) return seeded;

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_TONES[hash % CUSTOM_TONES.length];
}

export type TrainingTypeInput = {
  name: string;
  description?: string | null;
};

export type ParsedTrainingType = {
  name: string;
  description: string | null;
};

export type ParseTrainingTypeResult =
  | { ok: true; value: ParsedTrainingType }
  | { ok: false; error: string };

export function parseTrainingTypeInput(
  input: TrainingTypeInput
): ParseTrainingTypeResult {
  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Give this training type a name." };
  if (name.length > TRAINING_TYPE_NAME_MAX) {
    return {
      ok: false,
      error: `Keep the name under ${TRAINING_TYPE_NAME_MAX} characters.`,
    };
  }

  const description = input.description?.trim() ?? "";
  if (description.length > TRAINING_TYPE_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Keep the description under ${TRAINING_TYPE_DESCRIPTION_MAX} characters.`,
    };
  }

  return { ok: true, value: { name, description: description || null } };
}

/**
 * Why a type can't be deleted, or null when it can.
 *
 * Sessions already scheduled or held against a type are the real blocker — the
 * foreign key restricts the delete anyway, and archiving is what staff actually
 * want in that case.
 */
export function trainingTypeDeleteBlocker(type: {
  key: string;
  sessionCount: number;
}): string | null {
  if (isSeededTrainingType(type.key)) {
    return "This is one of the built-in types — you can rename it or archive it, but not delete it.";
  }
  if (type.sessionCount > 0) {
    return `${type.sessionCount} training session${type.sessionCount === 1 ? " uses" : "s use"} this type. Archive it instead — it will stay on past sessions but won't be offered for new ones.`;
  }
  return null;
}
