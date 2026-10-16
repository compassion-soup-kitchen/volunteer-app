"use server";

import { connection } from "next/server";

import { requireActiveSession } from "@/lib/action-auth";
import {
  deleteLeave,
  endLeave,
  getLeaveBetween,
  getLeavePeople,
  getPersonLeave,
  getStaffLeaveOverview,
  previewLeave,
  saveLeave,
  type LeaveActor,
  type LeaveMutationResult,
  type LeaveOverview,
  type LeavePersonOption,
  type LeavePreview,
  type StaffLeaveOverview,
  type StaffLeaveRecord,
} from "@/lib/data/leave";
import { isDateOnly, todayInAppZone, type DateOnly } from "@/lib/date-only";
import type { LeaveInput } from "@/lib/leave";

export type {
  LeaveMutationResult,
  LeaveOverview,
  LeavePersonOption,
  LeavePreview,
  LeaveRecord,
  LeaveShift,
  StaffLeaveOverview,
  StaffLeaveRecord,
} from "@/lib/data/leave";

const STAFF_ROLES = ["COORDINATOR", "ADMIN"];

/**
 * Who is acting. Staff act on anyone's leave from the staff side, their own
 * included; everyone else only ever on their own. The same actions serve both,
 * so the rules can't drift between the two screens.
 */
async function currentActor(): Promise<LeaveActor | null> {
  const session = await requireActiveSession();
  if (!session?.user?.id) return null;
  return STAFF_ROLES.includes(session.user.role)
    ? { kind: "staff", userId: session.user.id }
    : { kind: "self", userId: session.user.id };
}

async function requireStaffActor(): Promise<LeaveActor | null> {
  const actor = await currentActor();
  return actor?.kind === "staff" ? actor : null;
}

const NOT_SIGNED_IN = { error: "You must be signed in." } as const;

// ─── Reads ──────────────────────────────────────────────

/** The signed-in person's own leave - a volunteer's, or a coordinator's. */
export async function getMyLeave(): Promise<LeaveOverview | null> {
  await connection();
  const actor = await currentActor();
  if (!actor) return null;
  return getPersonLeave(actor.userId);
}

/** Someone's leave, for their staff record. */
export async function getLeaveFor(userId: string): Promise<LeaveOverview | null> {
  await connection();
  if (!(await requireStaffActor())) return null;
  return getPersonLeave(userId);
}

/** Everyone staff can log leave for - volunteers, the kitchen team, and themselves. */
export async function getLeavePeopleOptions(): Promise<LeavePersonOption[]> {
  if (!(await requireStaffActor())) return [];
  return getLeavePeople();
}

/** Who's away now, soon, and just back - the staff leave board. */
export async function getLeaveBoard(): Promise<StaffLeaveOverview | null> {
  await connection();
  if (!(await requireStaffActor())) return null;
  return getStaffLeaveOverview();
}

/** Everyone away at some point between two days, for the calendar and rosters. */
export async function getLeaveBetweenDays(
  from: DateOnly,
  to: DateOnly
): Promise<StaffLeaveRecord[]> {
  if (!isDateOnly(from) || !isDateOnly(to)) return [];
  if (!(await requireStaffActor())) return [];
  return getLeaveBetween({ startsOn: from, endsOn: to });
}

/** Everyone away today. */
export async function getAwayToday(): Promise<StaffLeaveRecord[]> {
  await connection();
  const today = todayInAppZone();
  return getLeaveBetweenDays(today, today);
}

// ─── Writes ─────────────────────────────────────────────

/**
 * What saving would do - the shifts that would be given up, and anything in
 * the way - so the form can show it before anyone commits.
 */
export async function previewLeaveChange(input: {
  /** Whose leave - staff only, for new leave. */
  userId?: string | null;
  leaveId?: string | null;
  startsOn: string;
  endsOn: string;
}): Promise<LeavePreview | { error: string }> {
  const actor = await currentActor();
  if (!actor) return NOT_SIGNED_IN;
  return previewLeave({ actor, ...input });
}

/** Logs new leave, or changes leave already logged. */
export async function saveLeaveChange(input: {
  /** Whose leave - staff only, for new leave. */
  userId?: string | null;
  leaveId?: string | null;
  data: LeaveInput;
}): Promise<LeaveMutationResult> {
  const actor = await currentActor();
  if (!actor) return NOT_SIGNED_IN;
  return saveLeave({ actor, ...input });
}

/** Back early. */
export async function endLeaveNow(leaveId: string): Promise<LeaveMutationResult> {
  const actor = await currentActor();
  if (!actor) return NOT_SIGNED_IN;
  return endLeave({ actor, leaveId });
}

/** Cancels leave that hasn't started, or (staff) removes any of it. */
export async function removeLeave(leaveId: string): Promise<LeaveMutationResult> {
  const actor = await currentActor();
  if (!actor) return NOT_SIGNED_IN;
  return deleteLeave({ actor, leaveId });
}
