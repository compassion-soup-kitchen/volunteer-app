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
 * history outlives any one account, so these rows survive the delete with
 * their author set to null (`onDelete: SetNull`) and simply stop naming
 * anybody.
 *
 * They used to block deletion outright, because the relations were required.
 * That made the account un-erasable for exactly the people who ran the
 * kitchen, which neither the Privacy Act nor App Store guideline 5.1.1(v)
 * allows - so the columns became nullable instead. The counts are still
 * gathered, because "12 shifts will no longer show your name" is worth
 * telling someone before they commit.
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
    // Not a refusal to erase them - just the wrong door. Deleting your own
    // account is self-service (`validateSelfDeletion`), so that the person
    // doing it is always the person it belongs to.
    return "You can't delete your own account from here. Use Delete account in your own profile.";
  }
  // Deleting the final admin would leave nobody who can manage roles, restore
  // accounts, or delete anyone else - an unrecoverable state.
  if (input.isLastAdmin) {
    return LAST_ADMIN_BLOCKER;
  }
  return null;
}

export const LAST_ADMIN_BLOCKER =
  "You can't delete the last admin. Promote someone else first.";

/**
 * The self-service counterpart, for someone erasing their own account from the
 * app or the web profile page.
 *
 * Deliberately far more permissive than the admin path: this is a person
 * exercising a right, not staff acting on somebody else, so authored records
 * and volunteering history don't stand in the way - they're erased or
 * de-attributed, and the person is told which before they confirm.
 *
 * The single exception is the last active admin, and it isn't a data-retention
 * excuse: erasing them leaves an organisation nobody can administer, with no
 * way back in to fix it. They can hand the role over and then delete, which is
 * a step they can take themselves without asking anyone.
 */
export function findSelfDeletionBlocker(input: {
  /** Already computed with `wouldRemoveLastAdmin`, so role is baked in. */
  isLastAdmin: boolean;
}): string | null {
  if (input.isLastAdmin) {
    return "You're the only admin left, so deleting your account would lock everyone out of managing the kitchen. Make someone else an admin first, then delete this account.";
  }
  return null;
}

/** What erasing your own account would cost, for the confirmation screen. */
export type OwnAccountDeletionSummary = {
  email: string;
  erases: ErasedRecordCounts;
  /** Kept as kitchen history, but no longer showing your name. */
  authored: AuthoredRecordCounts;
  /** Non-null when you can't delete yet, and what to do about it. */
  blocker: string | null;
};

/**
 * The self-deletion confirmation screen's view of an account. Pure over the
 * facts, so the web page and the mobile app are told the same thing.
 */
export function summariseOwnAccountDeletion(facts: {
  email: string;
  erases: ErasedRecordCounts;
  authored: AuthoredRecordCounts;
  isLastAdmin: boolean;
}): OwnAccountDeletionSummary {
  return {
    email: facts.email,
    erases: facts.erases,
    authored: facts.authored,
    blocker: findSelfDeletionBlocker({ isLastAdmin: facts.isLastAdmin }),
  };
}

export type SelfDeletionInput = {
  isLastAdmin: boolean;
  email: string;
  /** What the person typed into the confirmation field. */
  confirmation: string;
};

/**
 * Pure guardrail check for erasing your own account. Returns a user-facing
 * error message, or null when the deletion may proceed.
 */
export function validateSelfDeletion(input: SelfDeletionInput): string | null {
  const blocker = findSelfDeletionBlocker(input);
  if (blocker) return blocker;

  if (!matchesDeletionConfirmation(input.confirmation, input.email)) {
    return "Type your email address exactly to confirm.";
  }
  return null;
}
