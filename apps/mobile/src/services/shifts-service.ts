/**
 * Shifts service (mock). Mirrors `getAvailableShifts`, `signUpForShift` and
 * `cancelShiftSignup` in the web app.
 */

import { areaById, db, isPast, nextId, signupCount, type ShiftRecord } from '@/data/mock-db';
import type {
  ActionResult,
  ServiceArea,
  ShiftFilters,
  ShiftServiceArea,
  ShiftWithDetails,
} from '@/types/models';

import { delay } from './client';

export async function getServiceAreas(): Promise<ServiceArea[]> {
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
  await delay();
  return db.shifts
    .filter((s) => !isPast(s.date))
    .filter((s) => !filters?.serviceAreaId || s.serviceAreaId === filters.serviceAreaId)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map(toDetails);
}

export async function getShiftById(id: string): Promise<ShiftWithDetails | null> {
  await delay(180);
  const s = db.shifts.find((x) => x.id === id);
  return s ? toDetails(s) : null;
}

export async function signUpForShift(shiftId: string): Promise<ActionResult> {
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
  await delay();
  const shift = db.shifts.find((s) => s.id === shiftId);
  if (!shift) return { error: 'That shift could not be found.' };
  const mine = db.mySignups[shiftId];
  if (!mine || mine.status !== 'SIGNED_UP') return { error: "You're not signed up for this shift." };
  if (isPast(shift.date)) return { error: 'That shift has already passed.' };

  db.mySignups[shiftId] = { ...mine, status: 'CANCELLED' };
  return { success: true };
}
