import type { Role } from "@prisma/client";

// ─── Role management guardrails (pure, unit-testable) ────────────────
//
// Kept in a plain module (not the "use server" actions file) so the logic can
// be imported by both the server action and client UI, and unit-tested without
// mocking the DB or auth.

// Roles an admin may hand out through the UI. PUBLIC is deliberately excluded —
// it's the pre-application state, not something you assign to a real person.
export const ASSIGNABLE_ROLES = ["VOLUNTEER", "COORDINATOR", "ADMIN"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

// Roles that are staff, not volunteers. Used to exclude staff from volunteer
// counts/reports — a person promoted straight to COORDINATOR/ADMIN (who may
// never have volunteered) shouldn't inflate volunteer aggregates.
export const STAFF_ROLES: Role[] = ["COORDINATOR", "ADMIN"];

/**
 * Whether demoting this target would remove the last active admin. Pure so the
 * off-by-one boundary (<= 1) is exercised by unit tests rather than only
 * surfacing in production; the action supplies the live count.
 */
export function isLastActiveAdmin(
  targetCurrentRole: Role,
  activeAdminCount: number
): boolean {
  return targetCurrentRole === "ADMIN" && activeAdminCount <= 1;
}

export type RoleChangeInput = {
  actorUserId: string;
  targetUserId: string;
  targetCurrentRole: Role;
  newRole: string;
  // Whether the target account is archived (blocked from sign-in).
  targetIsArchived: boolean;
  // True when the target is the only remaining active ADMIN.
  isTargetLastAdmin: boolean;
  // Whether the target already has a VolunteerProfile. A PUBLIC user *with* a
  // profile is a pending applicant (must go through approval); a PUBLIC user
  // *without* one never applied and can be promoted directly.
  targetHasProfile: boolean;
  // An offline volunteer can't sign in, so a staff role would be a role
  // nobody can use.
  targetIsOffline: boolean;
};

/**
 * Pure guardrail check for a role change. Returns an error message, or null if
 * the change is allowed. Side-effect-free so it can be unit-tested directly.
 */
export function validateRoleChange(input: RoleChangeInput): string | null {
  const {
    actorUserId,
    targetUserId,
    targetCurrentRole,
    newRole,
    targetIsArchived,
    isTargetLastAdmin,
    targetHasProfile,
    targetIsOffline,
  } = input;

  if (!isAssignableRole(newRole)) {
    return "That role can't be assigned.";
  }
  // A PUBLIC user *with* a profile is a pending applicant — they must go through
  // approval (which flips them to VOLUNTEER) before any staff role can be
  // assigned. Otherwise an admin could promote an unvetted applicant straight to
  // ADMIN, skipping the application / MoJ-vetting / induction flow. A PUBLIC user
  // with *no* profile never applied and can be promoted directly (a profile is
  // created for them on promotion).
  if (!isAssignableRole(targetCurrentRole) && targetHasProfile) {
    return "Approve their application before assigning a role.";
  }
  // Archived accounts are blocked from sign-in; changing their role here would
  // let a later restore (staff-level, not admin-only) silently reactivate an
  // elevated role. Require restoring first.
  if (targetIsArchived) {
    return "Restore this account before changing its role.";
  }
  if (targetIsOffline) {
    return "They volunteer offline and can't sign in, so they can't hold a staff role.";
  }
  if (actorUserId === targetUserId) {
    return "You can't change your own role.";
  }
  if (newRole === targetCurrentRole) {
    return "They already have that role.";
  }
  // Demoting the final admin would leave the org with no one who can manage
  // roles — block it.
  if (isTargetLastAdmin && newRole !== "ADMIN") {
    return "You can't remove the last admin. Promote someone else first.";
  }
  return null;
}

// ─── Application decisions ───────────────────────────────────────────

/** What a reviewer may record on an application. */
export const APPLICATION_DECISIONS = [
  "APPROVED",
  "DECLINED",
  "INFO_REQUESTED",
] as const;
export type ApplicationDecision = (typeof APPLICATION_DECISIONS)[number];

/** Applications still waiting on a decision. Only these can be reviewed. */
export const UNDECIDED_APPLICATION_STATUSES = [
  "PENDING",
  "INFO_REQUESTED",
] as const;

/**
 * Whether a reviewer may record `decision` on an application currently in
 * `currentStatus`. Returns an error message, or null if allowed.
 *
 * Approving promotes the applicant to VOLUNTEER, and reviewing is staff-level,
 * not admin-only. Before this check a coordinator could re-approve the old,
 * long-approved application of someone since made an admin and demote them to
 * VOLUNTEER - around both the admin-only role change and the last-admin guard.
 * A decided application stays decided.
 */
export function validateApplicationDecision(input: {
  currentStatus: string;
  decision: string;
}): string | null {
  if (!(APPLICATION_DECISIONS as readonly string[]).includes(input.decision)) {
    return "That isn't a decision we can record.";
  }
  if (
    !(UNDECIDED_APPLICATION_STATUSES as readonly string[]).includes(
      input.currentStatus
    )
  ) {
    return "This application has already been decided.";
  }
  return null;
}

// ─── Archiving and restoring accounts ────────────────────────────────

export type AccountArchiveInput = {
  actorUserId: string;
  actorRole: Role;
  targetUserId: string;
  targetRole: Role;
  /** True when the target is the only remaining active ADMIN. */
  isTargetLastAdmin: boolean;
};

/**
 * Whether the actor may archive the target. Returns an error message, or null.
 *
 * Archiving is staff-level so coordinators can tidy away volunteers who have
 * moved on - but an archived account can't sign in or act, so on a staff
 * account it is a stronger lever than a role change, and must be at least as
 * guarded: admin-only, never yourself, never the last admin.
 */
export function validateArchive(input: AccountArchiveInput): string | null {
  if (input.actorUserId === input.targetUserId) {
    return "You can't archive your own account.";
  }
  if (STAFF_ROLES.includes(input.targetRole) && input.actorRole !== "ADMIN") {
    return "Only an admin can archive a coordinator or admin.";
  }
  if (input.isTargetLastAdmin) {
    return "You can't archive the last admin. Promote someone else first.";
  }
  return null;
}

/**
 * Whether the actor may restore the target. Restoring a staff account gives
 * back staff powers someone may have been archived to remove, so it is
 * admin-only for the same reason archiving one is.
 */
export function validateRestore(input: {
  actorRole: Role;
  targetRole: Role;
}): string | null {
  if (STAFF_ROLES.includes(input.targetRole) && input.actorRole !== "ADMIN") {
    return "Only an admin can restore a coordinator or admin.";
  }
  return null;
}
