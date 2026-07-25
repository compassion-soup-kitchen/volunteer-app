import type { Role } from "@prisma/client";

// ─── Permanent account deletion guardrails (pure, unit-testable) ─────
//
// Deletion is the irreversible sibling of archiving. Archiving blocks sign-in
// and keeps every record; deleting erases the person and everything that hangs
// off them - profile, application, shift signups, training attendance,
// documents, signed agreements. It exists for erasure requests under the
// Privacy Act and for clearing out junk signups, not for people who simply
// stopped volunteering (archive those).
//
// Kept in a plain module (not the "use server" actions file) so the same rules
// and copy can be imported by the confirm dialog and unit-tested without
// mocking the DB or auth.

/**
 * Records the person authored *on behalf of the organisation*. A shift someone
 * rostered still happened, and a pānui they published was still read - that
 * history outlives any one account. Their relations are required, so deleting
 * the author would fail at the database anyway; we block early with copy that
 * says what to do instead.
 */
export type AuthoredRecordCounts = {
  shifts: number;
  trainingSessions: number;
  announcements: number;
};

/**
 * Records that belong to the person and are erased along with them. Shown in
 * the confirm dialog so an admin sees the cost before committing - once these
 * are gone the hours drop out of reporting for good.
 */
export type ErasedRecordCounts = {
  shiftSignups: number;
  attendedShifts: number;
  trainingAttendances: number;
  documents: number;
  signedAgreements: number;
};

export function countAuthoredRecords(authored: AuthoredRecordCounts): number {
  return authored.shifts + authored.trainingSessions + authored.announcements;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Joins a list the way a person would: "a, b and c". */
function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * Human summary of what this person authored, e.g.
 * "12 shifts, 2 training sessions and 1 pānui". Empty string when they
 * authored nothing.
 */
export function describeAuthoredRecords(
  authored: AuthoredRecordCounts
): string {
  const parts: string[] = [];
  if (authored.shifts > 0) parts.push(plural(authored.shifts, "shift", "shifts"));
  if (authored.trainingSessions > 0) {
    parts.push(
      plural(authored.trainingSessions, "training session", "training sessions")
    );
  }
  if (authored.announcements > 0) {
    parts.push(plural(authored.announcements, "pānui", "pānui"));
  }
  return joinParts(parts);
}

/**
 * Whether deleting this person would leave the org with no active admin.
 * `remainingActiveAdmins` must already exclude the target, so an archived admin
 * isn't miscounted as the last one standing.
 */
export function wouldRemoveLastAdmin(
  targetRole: Role,
  remainingActiveAdmins: number
): boolean {
  return targetRole === "ADMIN" && remainingActiveAdmins < 1;
}

/**
 * Deletion is confirmed by typing the person's email address - a name is too
 * easy to type by muscle memory, and the email is on screen right next to it.
 * Compared case- and whitespace-insensitively.
 */
export function matchesDeletionConfirmation(
  typed: string,
  targetEmail: string
): boolean {
  const expected = targetEmail.trim().toLowerCase();
  if (!expected) return false;
  return typed.trim().toLowerCase() === expected;
}

export type UserDeletionInput = {
  actorUserId: string;
  targetUserId: string;
  targetRole: Role;
  targetEmail: string;
  /** True when deleting the target would leave zero active admins. */
  isLastAdmin: boolean;
  authored: AuthoredRecordCounts;
  /** What the admin typed into the confirmation field. */
  confirmation: string;
};

/**
 * Pure guardrail check for permanent deletion. Returns a user-facing error
 * message, or null when the deletion may proceed.
 */
export function validateUserDeletion(input: UserDeletionInput): string | null {
  const blocker = findDeletionBlocker(input);
  if (blocker) return blocker;

  if (!matchesDeletionConfirmation(input.confirmation, input.targetEmail)) {
    return "Type their email address exactly to confirm.";
  }
  return null;
}

/**
 * The reason this account can't be deleted at all, independent of what the
 * admin typed. Split out from `validateUserDeletion` so the dialog can show the
 * blocker up front - and hide the confirmation field - instead of only telling
 * them after they've typed an email.
 */
export function findDeletionBlocker(
  input: Pick<
    UserDeletionInput,
    "actorUserId" | "targetUserId" | "isLastAdmin" | "authored"
  >
): string | null {
  if (input.actorUserId === input.targetUserId) {
    return "You can't delete your own account.";
  }
  // Deleting the final admin would leave nobody who can manage roles, restore
  // accounts, or delete anyone else - an unrecoverable state.
  if (input.isLastAdmin) {
    return "You can't delete the last admin. Promote someone else first.";
  }
  const authoredSummary = describeAuthoredRecords(input.authored);
  if (authoredSummary) {
    return `They created ${authoredSummary}, which the kitchen's records depend on. Archive their account instead.`;
  }
  return null;
}
