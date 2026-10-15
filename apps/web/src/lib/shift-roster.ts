/**
 * Staff putting a named volunteer on a shift - rostering a regular, filling a
 * gap by phone, or recording that someone who never touches the app came in.
 *
 * Deliberately looser than a volunteer signing themselves up: staff can
 * override a first-refusal hold and add people to a shift that has already
 * happened. They still can't overfill it, only someone active can be put on
 * the roster, and nobody goes on a day they're on leave.
 */

import type { DateOnly } from "@/lib/date-only";
import { onLeaveRosterMessage, type LeaveRange } from "@/lib/volunteer-leave";

export type SignupState = "SIGNED_UP" | "ATTENDED" | "NO_SHOW" | "CANCELLED";

export type StaffRosterDecision =
  | { action: "reject"; error: string }
  | { action: "create" | "reactivate"; status: "SIGNED_UP" | "ATTENDED" };

export function decideStaffRoster(input: {
  shiftDate: DateOnly;
  today: DateOnly;
  capacity: number;
  /** People already holding a place. */
  seatedCount: number;
  existingStatus: SignupState | null;
  volunteerIsActive: boolean;
  /** Their leave covering the shift's day, if they're away then. */
  leave?: LeaveRange | null;
}): StaffRosterDecision {
  if (!input.volunteerIsActive) {
    return {
      action: "reject",
      error: "Only active volunteers can be rostered. Check their status on their record.",
    };
  }
  if (input.existingStatus === "SIGNED_UP" || input.existingStatus === "ATTENDED") {
    return { action: "reject", error: "They're already on this shift." };
  }
  // Leave says they won't be there. A day already gone is a record of who
  // actually came, though, so someone back early can still be logged.
  if (input.leave && input.shiftDate >= input.today) {
    return { action: "reject", error: onLeaveRosterMessage(input.leave) };
  }
  if (input.seatedCount >= input.capacity) {
    return {
      action: "reject",
      error: "This shift is full. Raise its capacity to add someone else.",
    };
  }

  // Adding someone to a day already gone is recording that they were there -
  // which is how an offline volunteer's hours get logged.
  const status = input.shiftDate < input.today ? "ATTENDED" : "SIGNED_UP";
  return {
    action: input.existingStatus === null ? "create" : "reactivate",
    status,
  };
}

/** Whether staff may take someone off a shift. */
export function staffRemovalError(status: SignupState): string | null {
  if (status === "SIGNED_UP") return null;
  if (status === "CANCELLED") return "They're not on this shift any more.";
  return "Their attendance is already marked. Change it instead of removing them.";
}
