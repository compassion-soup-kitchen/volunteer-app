/**
 * Dashboard service. Mirrors `getDashboardData` in the web app; against the
 * real API it fetches `/api/v1/dashboard`.
 */

import { areaById, db, diffHours, isPast, isoDate, signupCount, type ShiftRecord } from '@/data/mock-db';
import { getMilestones } from '@/lib/milestones';
import type { DashboardData, OpenShift, RosterShift, ShiftServiceArea } from '@/types/models';

import { apiFetch, delay, USE_MOCK } from './client';

function thisMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function area(id: string): ShiftServiceArea {
  const a = areaById(id);
  return { id, name: a?.name ?? 'Shift', maori: a?.maori };
}

function toRoster(s: ShiftRecord): RosterShift {
  return {
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    serviceArea: area(s.serviceAreaId),
    notes: s.notes ?? null,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!USE_MOCK) return apiFetch<DashboardData>('/api/v1/dashboard');

  await delay();

  const month = thisMonthKey();
  const attended = db.shifts.filter((s) => db.mySignups[s.id]?.status === 'ATTENDED');

  let totalHours = 0;
  let totalMeals = 0;
  let hoursThisMonth = 0;
  let mealsThisMonth = 0;
  for (const s of attended) {
    const h = diffHours(s.startTime, s.endTime);
    totalHours += h;
    totalMeals += s.mealsServed;
    if (s.date.slice(0, 7) === month) {
      hoursThisMonth += h;
      mealsThisMonth += s.mealsServed;
    }
  }

  const myUpcoming = db.shifts
    .filter((s) => db.mySignups[s.id]?.status === 'SIGNED_UP' && !isPast(s.date))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const interests = new Set(db.profile.interestIds);
  const openShiftsForYou: OpenShift[] = db.shifts
    .filter((s) => {
      const mine = db.mySignups[s.id];
      const active = mine && (mine.status === 'SIGNED_UP' || mine.status === 'ATTENDED');
      return (
        !isPast(s.date) &&
        !active &&
        interests.has(s.serviceAreaId) &&
        signupCount(s) < s.capacity
      );
    })
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      serviceArea: area(s.serviceAreaId),
      spotsLeft: s.capacity - signupCount(s),
    }));

  return {
    nextShift: myUpcoming.length ? toRoster(myUpcoming[0]) : null,
    upcomingShifts: myUpcoming.slice(0, 5).map(toRoster),
    openShiftsForYou,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    mealsThisMonth,
    totalMeals,
    totalShifts: attended.length,
    milestones: getMilestones(totalHours),
  };
}

export { isoDate };
