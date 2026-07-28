/**
 * Volunteer groups - the crews inside the whānau.
 *
 * A group is a label staff hang on people: Team Leaders, Guardian Angels, the
 * Thursday regulars. It grants nothing (access is `User.role`); its whole job
 * is to make who's who legible - on the roster, in the directory, and to
 * volunteers looking for the person to turn to.
 *
 * Pure, DB-free helpers live here so both the server actions and the client
 * components can share one reading of tones, names and membership, and so the
 * rules can be unit-tested without mocking Prisma.
 */

import { z } from "zod";
import type { GroupTone } from "@prisma/client";

export const GROUP_NAME_MAX = 40;
export const GROUP_DESCRIPTION_MAX = 200;

/** The colours a group can carry, named as staff see them in the picker. */
export const GROUP_TONES: { value: GroupTone; label: string }[] = [
  { value: "BRAND", label: "Red" },
  { value: "INFO", label: "Blue" },
  { value: "SUCCESS", label: "Green" },
  { value: "WARNING", label: "Gold" },
  { value: "NEUTRAL", label: "Stone" },
];

const TONE_VALUES = GROUP_TONES.map((tone) => tone.value) as [
  GroupTone,
  ...GroupTone[],
];

export function isGroupTone(value: string): value is GroupTone {
  return (TONE_VALUES as string[]).includes(value);
}

/**
 * Badge variant for a tone. `BRAND` maps to the tinted default rather than the
 * solid primary - a person can hold several groups at once, and a row of solid
 * red pills shouts louder than the name it sits beside.
 */
export function groupToneVariant(
  tone: GroupTone
): "default" | "info" | "success" | "warning" | "neutral" {
  switch (tone) {
    case "BRAND":
      return "default";
    case "INFO":
      return "info";
    case "SUCCESS":
      return "success";
    case "WARNING":
      return "warning";
    default:
      return "neutral";
  }
}

/** The shape every surface needs to draw a group badge. */
export type GroupChip = {
  id: string;
  name: string;
  tone: GroupTone;
};

export type GroupInput = {
  name: string;
  description?: string | null;
  tone: string;
  visibleToVolunteers: boolean;
};

export type ValidatedGroup = {
  name: string;
  /** Lowercased `name`, carrying the case-insensitive unique index. */
  nameKey: string;
  description: string | null;
  tone: GroupTone;
  visibleToVolunteers: boolean;
};

/**
 * The stored form of a name for uniqueness. Two groups may not differ by case
 * alone - "Team Leaders" and "team leaders" are the same crew to everyone
 * reading the roster, so they are the same row to Postgres.
 */
export function groupNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export const groupInputSchema = z.object({
  name: z
    .string("Give the group a name.")
    // Collapse runs of whitespace so "Team  Leaders" and "Team Leaders" are the
    // same name to the eye and to the unique index.
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, "Give the group a name.")
        .max(
          GROUP_NAME_MAX,
          `Keep the name to ${GROUP_NAME_MAX} characters or fewer.`
        )
    ),
  description: z
    .string()
    .nullish()
    // An empty box means no description, not an empty one.
    .transform((value) => value?.trim() || null)
    .pipe(
      z
        .string()
        .max(
          GROUP_DESCRIPTION_MAX,
          `Keep the description to ${GROUP_DESCRIPTION_MAX} characters or fewer.`
        )
        .nullable()
    ),
  tone: z.enum(TONE_VALUES, "Choose a colour for the group."),
  visibleToVolunteers: z.boolean(),
});

/**
 * Validate a create/edit submission. Returns the tidied values - name key and
 * all - or the first human-readable issue to show against the form. The same
 * check runs on both sides, so a client that skips it can't write anything the
 * server wouldn't.
 */
export function validateGroupInput(
  input: GroupInput
): { error: string } | { data: ValidatedGroup } {
  const parsed = groupInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "That group doesn't look right.",
    };
  }

  return {
    data: { ...parsed.data, nameKey: groupNameKey(parsed.data.name) },
  };
}

/** Case-insensitive name clash, ignoring the group being edited. */
export function findNameClash<T extends { id: string; name: string }>(
  groups: T[],
  name: string,
  excludeId?: string
): T | undefined {
  const needle = name.trim().toLowerCase();
  return groups.find(
    (group) => group.id !== excludeId && group.name.toLowerCase() === needle
  );
}

/**
 * The order groups read in everywhere: by name, so a person's badges don't
 * shuffle between the directory row and the roster line.
 */
export function sortGroups<T extends { name: string }>(groups: T[]): T[] {
  return [...groups].sort((a, b) =>
    a.name.localeCompare(b.name, "en-NZ", { sensitivity: "base" })
  );
}

/** "3 people" / "1 person" / "No one yet" - the caption under a group. */
export function memberCountLabel(count: number): string {
  if (count === 0) return "No one yet";
  return `${count} ${count === 1 ? "person" : "people"}`;
}

/**
 * Membership changes as a pair of sets, so an action can report what it did
 * ("Added 2, removed 1") without diffing rows twice.
 */
export function diffMembership(
  current: string[],
  next: string[]
): { added: string[]; removed: string[] } {
  const before = new Set(current);
  const after = new Set(next);
  return {
    added: next.filter((id) => !before.has(id)),
    removed: current.filter((id) => !after.has(id)),
  };
}

/**
 * Add or drop one group from a set of ids. Membership is saved as a whole set,
 * so a caller ticking several groups in a row must fold each change into the
 * previous result rather than into whatever the last render showed.
 */
export function toggleGroupMembership(
  currentIds: string[],
  groupId: string
): { ids: string[]; isMember: boolean } {
  const isMember = currentIds.includes(groupId);
  return {
    ids: isMember
      ? currentIds.filter((id) => id !== groupId)
      : [...currentIds, groupId],
    // Whether they are in the group *after* the toggle - what the toast reports.
    isMember: !isMember,
  };
}

/** Plain-language summary of a membership change, for the toast. */
export function describeMembershipChange(
  added: number,
  removed: number,
  groupName: string
): string {
  if (added === 0 && removed === 0) return `No change to ${groupName}.`;
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} added`);
  if (removed > 0) parts.push(`${removed} removed`);
  return `${groupName}: ${parts.join(", ")}.`;
}
