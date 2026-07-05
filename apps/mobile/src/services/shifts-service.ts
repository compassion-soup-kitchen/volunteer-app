/**
 * Shifts service. Mirrors `getAvailableShifts`, `signUpForShift` and
 * `cancelShiftSignup` in the web app; against the real API it calls
 * `/api/v1/shifts`, `/api/v1/schedule` and `/api/v1/service-areas`.
 */

import { areaById, db, isPast, nextId, signupCount, type ShiftRecord } from '@/data/mock-db';
import type {
  ActionResult,
  ServiceArea,
  ShiftFilters,
  ShiftServiceArea,
  ShiftWithDetails,
} from '@/types/models';

import { apiFetch, ApiError, delay, toActionError, USE_MOCK } from './client';

export async function getServiceAreas(): Promise<ServiceArea[]> {
  if (!USE_MOCK) return apiFetch<ServiceArea[]>('/api/v1/service-areas');

  await delay(120);
  return db.serviceAreas;
}

function area(id: string): ShiftServiceArea {
  const a = areaById(id);
  return { id, name: a?.name ?? 'Shift', maori: a?.maori };
}

function toDetails(s: ShiftRecord): ShiftWithDetails {
  const mine = db.mySignups[s.id];
  return {
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    capacity: s.capacity,
    notes: s.notes ?? null,
    serviceArea: area(s.serviceAreaId),
    signupCount: signupCount(s),
    userSignupId: mine && mine.status !== 'CANCELLED' ? mine.id : null,
    userSignupStatus: mine && mine.status !== 'CANCELLED' ? mine.status : null,
  };
}

export async function getAvailableShifts(filters?: ShiftFilters): Promise<ShiftWithDetails[]> {
  if (!USE_MOCK) {
    const query = filters?.serviceAreaId
      ? `?serviceAreaId=${encodeURIComponent(filters.serviceAreaId)}`
      : '';
    return apiFetch<ShiftWithDetails[]>(`/api/v1/shifts${query}`);
  }

  await delay();
  return db.shifts
    .filter((s) => !isPast(s.date))
    .filter((s) => !filters?.serviceAreaId || s.serviceAreaId === filters.serviceAreaId)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map(toDetails);
}

export type ScheduleStatus = 'CONFIRMED' | 'ATTENDED' | 'NO_SHOW';

export interface ScheduleEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  areaName: string;
  status: ScheduleStatus;
}

function toScheduleEntry(s: ShiftRecord, status: ScheduleStatus): ScheduleEntry {
  return {
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    areaName: areaById(s.serviceAreaId)?.name ?? 'Shift',
    status,
  };
}

/** The volunteer's own roster, split into upcoming bookings and past shifts. */
export async function getMySchedule(): Promise<{ upcoming: ScheduleEntry[]; past: ScheduleEntry[] }> {
  if (!USE_MOCK) {
    return apiFetch<{ upcoming: ScheduleEntry[]; past: ScheduleEntry[] }>('/api/v1/schedule');
  }

  await delay();

  const upcoming = db.shifts
    .filter((s) => db.mySignups[s.id]?.status === 'SIGNED_UP' && !isPast(s.date))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map((s) => toScheduleEntry(s, 'CONFIRMED'));

  const past = db.shifts
    .filter((s) => {
      const mine = db.mySignups[s.id];
      return mine && (mine.status === 'ATTENDED' || mine.status === 'NO_SHOW');
    })
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
    .map((s) => toScheduleEntry(s, db.mySignups[s.id].status === 'NO_SHOW' ? 'NO_SHOW' : 'ATTENDED'));

  return { upcoming, past };
}

export async function getShiftById(id: string): Promise<ShiftWithDetails | null> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<ShiftWithDetails>(`/api/v1/shifts/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  await delay(180);
  const s = db.shifts.find((x) => x.id === id);
  return s ? toDetails(s) : null;
}

export async function signUpForShift(shiftId: string): Promise<ActionResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<ActionResult>(
        `/api/v1/shifts/${encodeURIComponent(shiftId)}/signup`,
        { method: 'POST' },
      );
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const shift = db.shifts.find((s) => s.id === shiftId);
  if (!shift) return { error: 'That shift could not be found.' };
  if (isPast(shift.date)) return { error: 'That shift has already passed.' };

  const mine = db.mySignups[shiftId];
  if (mine && (mine.status === 'SIGNED_UP' || mine.status === 'ATTENDED')) {
    return { error: "You're already signed up for this shift." };
  }
  if (signupCount(shift) >= shift.capacity) return { error: 'This shift is now full.' };

  db.mySignups[shiftId] = {
    id: mine?.id ?? nextId('sg'),
    status: 'SIGNED_UP',
    signedUpAt: new Date().toISOString(),
  };
  return { success: true };
}

export async function cancelShiftSignup(shiftId: string): Promise<ActionResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<ActionResult>(
        `/api/v1/shifts/${encodeURIComponent(shiftId)}/signup`,
        { method: 'DELETE' },
      );
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const shift = db.shifts.find((s) => s.id === shiftId);
  if (!shift) return { error: 'That shift could not be found.' };
  const mine = db.mySignups[shiftId];
  if (!mine || mine.status !== 'SIGNED_UP') return { error: "You're not signed up for this shift." };
  if (isPast(shift.date)) return { error: 'That shift has already passed.' };

  db.mySignups[shiftId] = { ...mine, status: 'CANCELLED' };
  return { success: true };
}
