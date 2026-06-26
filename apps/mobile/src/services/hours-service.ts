/**
 * Hours service (mock). Mirrors `getVolunteerHoursData` in the web app.
 */

import { areaById, db, diffHours } from '@/data/mock-db';
import { getMilestones } from '@/lib/milestones';
import type { HoursByArea, HoursByMonth, VolunteerHoursData } from '@/types/models';

import { delay } from './client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export async function getVolunteerHoursData(): Promise<VolunteerHoursData> {
  await delay();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const attended = db.shifts.filter((s) => db.mySignups[s.id]?.status === 'ATTENDED');

  let totalHours = 0;
  let totalMeals = 0;
  let hoursThisMonth = 0;
  let shiftsThisMonth = 0;
  let mealsThisMonth = 0;

  const areaMap = new Map<string, HoursByArea>();
  const monthMap = new Map<string, HoursByMonth>();

  for (const s of attended) {
    const h = diffHours(s.startTime, s.endTime);
    totalHours += h;
    totalMeals += s.mealsServed;

    if (s.date.slice(0, 7) === thisMonth) {
      hoursThisMonth += h;
      shiftsThisMonth += 1;
      mealsThisMonth += s.mealsServed;
    }

    const aId = s.serviceAreaId;
    const aName = areaById(aId)?.name ?? 'Other';
    const a = areaMap.get(aId) ?? { serviceAreaId: aId, serviceAreaName: aName, hours: 0, shifts: 0, meals: 0 };
    a.hours += h;
    a.shifts += 1;
    a.meals += s.mealsServed;
    areaMap.set(aId, a);

    const mKey = s.date.slice(0, 7);
    const m = monthMap.get(mKey) ?? { month: mKey, label: monthLabel(mKey), hours: 0, shifts: 0, meals: 0 };
    m.hours += h;
    m.shifts += 1;
    m.meals += s.mealsServed;
    monthMap.set(mKey, m);
  }

  const round = (n: number) => Math.round(n * 10) / 10;

  const byServiceArea = [...areaMap.values()]
    .map((a) => ({ ...a, hours: round(a.hours) }))
    .sort((a, b) => b.hours - a.hours);

  const byMonth = [...monthMap.values()]
    .map((m) => ({ ...m, hours: round(m.hours) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return {
    totalHours: round(totalHours),
    totalShifts: attended.length,
    totalMeals,
    hoursThisMonth: round(hoursThisMonth),
    shiftsThisMonth,
    mealsThisMonth,
    byServiceArea,
    byMonth,
    milestones: getMilestones(totalHours),
  };
}
