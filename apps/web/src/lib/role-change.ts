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

export type RoleChangeInput = {
  actorUserId: string;
  targetUserId: string;
  targetCurrentRole: Role;
  newRole: string;
  // True when the target is the only remaining active ADMIN.
  isTargetLastAdmin: boolean;
};

/**
 * Pure guardrail check for a role change. Returns an error message, or null if
 * the change is allowed. Side-effect-free so it can be unit-tested directly.
 */
export function validateRoleChange(input: RoleChangeInput): string | null {
  const { actorUserId, targetUserId, targetCurrentRole, newRole, isTargetLastAdmin } =
    input;

  if (!isAssignableRole(newRole)) {
    return "That role can't be assigned.";
  }
  // A profile whose user is still PUBLIC is a pending applicant — they must go
  // through approval (which flips them to VOLUNTEER) before any staff role can
  // be assigned. Otherwise an admin could promote an unvetted applicant
  // straight to ADMIN, skipping the application / MoJ-vetting / induction flow.
  if (!isAssignableRole(targetCurrentRole)) {
    return "Approve their application before assigning a role.";
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
