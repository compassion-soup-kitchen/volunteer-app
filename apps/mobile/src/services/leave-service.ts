/**
 * Leave service. Against the real API it calls `/api/v1/leave`; offline it
 * mirrors the server's rules over the mock store closely enough that the
 * screens behave the same - including taking the volunteer off shifts.
 */

import { areaById, db, isPast, isoDate } from '@/data/mock-db';
import {
  formatLeaveRange,
  leaveFormProblem,
  leaveStage,
  rangesOverlap,
  type LeaveRange,
} from '@/lib/leave';
import type {
  LeaveEntry,
  LeaveOverview,
  LeavePreview,
  LeavePreviewShift,
  LeaveResult,
} from '@/types/models';

import { apiFetch, delay, toActionError, USE_MOCK } from './client';

export type LeaveDraft = { startsOn: string; endsOn: string; reason?: string | null };

export async function getMyLeave(): Promise<LeaveOverview> {
  if (!USE_MOCK) return apiFetch<LeaveOverview>('/api/v1/leave');

  await delay(140);
  const today = isoDate(0);
  const ahead = db.leave
    .filter((leave) => leave.endsOn >= today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return {
    today,
    canLog: true,
    current: ahead.find((leave) => leave.startsOn <= today) ?? null,
    upcoming: ahead.filter((leave) => leave.startsOn > today),
    past: db.leave
      .filter((leave) => leave.endsOn < today)
      .sort((a, b) => b.endsOn.localeCompare(a.endsOn))
      .slice(0, 6),
  };
}

/** What saving would do. Errors come back as `{ error }`, like the mutations. */
export async function previewLeave(
  draft: LeaveDraft & { leaveId?: string | null },
): Promise<LeavePreview | { error: string }> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<LeavePreview | { error: string }>('/api/v1/leave/preview', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay(160);
  const existing = draft.leaveId ? db.leave.find((leave) => leave.id === draft.leaveId) ?? null : null;
  const range = { startsOn: draft.startsOn, endsOn: draft.endsOn };
  return {
    blocker: mockBlocker(range, existing),
    shifts: mockShiftsIn(takeOffWindow(range, existing)),
  };
}

export async function saveLeave(draft: LeaveDraft, leaveId?: string | null): Promise<LeaveResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<LeaveResult>(
        leaveId ? `/api/v1/leave/${encodeURIComponent(leaveId)}` : '/api/v1/leave',
        { method: leaveId ? 'PATCH' : 'POST', body: JSON.stringify(draft) },
      );
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const existing = leaveId ? db.leave.find((leave) => leave.id === leaveId) ?? null : null;
  if (leaveId && !existing) return { error: 'That leave couldn’t be found.' };
  const range = { startsOn: draft.startsOn, endsOn: draft.endsOn };
  const blocker = mockBlocker(range, existing);
  if (blocker) return { error: blocker };

  const removed = mockShiftsIn(takeOffWindow(range, existing));
  for (const shift of removed) {
    db.mySignups[shift.shiftId] = { ...db.mySignups[shift.shiftId], status: 'CANCELLED' };
  }

  const reason = draft.reason?.trim() || null;
  if (existing) {
    Object.assign(existing, range, { reason });
  } else {
    db.leave.push({ id: `lv-${Date.now()}`, ...range, reason, loggedByStaff: false, loggedByName: null });
  }
  return { success: true, removedShifts: removed.length, restoredShifts: 0 };
}

/** Back early - the leave now ends yesterday. */
export async function endLeaveNow(leaveId: string): Promise<LeaveResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<LeaveResult>(`/api/v1/leave/${encodeURIComponent(leaveId)}/end`, {
        method: 'POST',
      });
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const today = isoDate(0);
  const leave = db.leave.find((entry) => entry.id === leaveId);
  if (!leave || leaveStage(leave, today) !== 'current') return { error: 'That leave isn’t under way.' };
  if (leave.startsOn === today) db.leave = db.leave.filter((entry) => entry.id !== leaveId);
  else leave.endsOn = isoDate(-1);
  return { success: true, restoredShifts: 0 };
}

/** Cancels leave that hasn't started yet. */
export async function cancelLeave(leaveId: string): Promise<LeaveResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<LeaveResult>(`/api/v1/leave/${encodeURIComponent(leaveId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const leave = db.leave.find((entry) => entry.id === leaveId);
  if (!leave || leaveStage(leave, isoDate(0)) !== 'upcoming') {
    return { error: 'Only leave that hasn’t started can be cancelled.' };
  }
  db.leave = db.leave.filter((entry) => entry.id !== leaveId);
  return { success: true, restoredShifts: 0 };
}

// ─── Mock helpers ───────────────────────────────────────

function mockBlocker(range: LeaveRange, existing: LeaveEntry | null): string | null {
  const today = isoDate(0);
  if (existing && leaveStage(existing, today) === 'past') return 'That leave is over, so it stays as it was.';
  const problem = leaveFormProblem({ ...range, today, existing });
  if (problem) return problem;
  const clash = db.leave.find((leave) => leave.id !== existing?.id && rangesOverlap(leave, range));
  return clash ? `That overlaps leave already logged for ${formatLeaveRange(clash)}.` : null;
}

/** The new days, from today on - the only ones saving changes on the roster. */
function takeOffWindow(range: LeaveRange, existing: LeaveEntry | null): (date: string) => boolean {
  const today = isoDate(0);
  return (date) =>
    date >= today &&
    range.startsOn <= date &&
    date <= range.endsOn &&
    !(existing && existing.startsOn <= date && date <= existing.endsOn);
}

function mockShiftsIn(covers: (date: string) => boolean): LeavePreviewShift[] {
  return db.shifts
    .filter((shift) => db.mySignups[shift.id]?.status === 'SIGNED_UP' && !isPast(shift.date) && covers(shift.date))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map((shift) => ({
      shiftId: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      serviceAreaName: areaById(shift.serviceAreaId)?.name ?? 'Shift',
      isRegular: false,
    }));
}

/** Leave covering a day, for marking shifts in the mock. */
export function mockLeaveOn(date: string): LeaveEntry | null {
  return db.leave.find((leave) => leave.startsOn <= date && date <= leave.endsOn) ?? null;
}
