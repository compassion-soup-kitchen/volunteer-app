import { getDb } from "@/lib/db";
import { startOfTodayInAppZone } from "@/lib/date-only";
import { getMilestones, type Milestone } from "@/lib/milestones";
import { isHeldForOffers } from "@/lib/shift-offers";
import { diffHours } from "./time";

// ─── Types ──────────────────────────────────────────────

export type RosterShift = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  serviceArea: { id: string; name: string };
  notes: string | null;
};

export type OpenShift = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  serviceArea: { id: string; name: string };
  spotsLeft: number;
};

export type DashboardData = {
  nextShift: RosterShift | null;
  upcomingShifts: RosterShift[];
  openShiftsForYou: OpenShift[];
  hoursThisMonth: number;
  totalHours: number;
  mealsThisMonth: number;
  totalMeals: number;
  totalShifts: number;
  milestones: Milestone[];
};

export type ServiceAreaHours = {
  serviceAreaId: string;
  serviceAreaName: string;
  hours: number;
  shifts: number;
  meals: number;
};

export type MonthlyHours = {
  month: string; // "2026-03"
  label: string; // "March 2026"
  hours: number;
  shifts: number;
  meals: number;
};

export type VolunteerHoursData = {
  totalHours: number;
  totalShifts: number;
  totalMeals: number;
  hoursThisMonth: number;
  shiftsThisMonth: number;
  mealsThisMonth: number;
  byServiceArea: ServiceAreaHours[];
  byMonth: MonthlyHours[];
  milestones: Milestone[];
};

// ─── Dashboard Data ─────────────────────────────────────

export async function getDashboardDataForUser(
  userId: string
): Promise<DashboardData | null> {
  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
    include: { interests: { select: { id: true } } },
  });

  if (!profile) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Shift days carry no time, so "from now on" starts at the top of today.
  const today = startOfTodayInAppZone(now);
  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  // Upcoming shifts (signed up, date >= today)
  const upcomingSignups = await db.shiftSignup.findMany({
    where: {
      volunteerId: profile.id,
      status: "SIGNED_UP",
      shift: { date: { gte: today } },
    },
    include: {
      shift: {
        include: { serviceArea: true },
      },
    },
    orderBy: { shift: { date: "asc" } },
    take: 5,
  });

  // Hours + meals this month (attended shifts in current month)
  const attendedThisMonth = await db.shiftSignup.findMany({
    where: {
      volunteerId: profile.id,
      status: "ATTENDED",
      shift: { date: { gte: startOfMonth, lte: now } },
    },
    include: { shift: true },
  });

  const hoursThisMonth = attendedThisMonth.reduce((total, signup) => {
    return total + diffHours(signup.shift.startTime, signup.shift.endTime);
  }, 0);
  const mealsThisMonth = attendedThisMonth.reduce(
    (total, signup) => total + (signup.shift.mealsServed ?? 0),
    0
  );

  // Total hours + meals all time
  const allAttended = await db.shiftSignup.findMany({
    where: {
      volunteerId: profile.id,
      status: "ATTENDED",
    },
    include: { shift: true },
  });

  const totalHours = allAttended.reduce((total, signup) => {
    return total + diffHours(signup.shift.startTime, signup.shift.endTime);
  }, 0);
  const totalMeals = allAttended.reduce(
    (total, signup) => total + (signup.shift.mealsServed ?? 0),
    0
  );

  const totalShifts = allAttended.length;

  // Open shifts the volunteer might fill — in their interest areas, capacity not full,
  // not already signed up for, in the next 30 days
  const interestAreaIds = profile.interests.map((i) => i.id);
  const openShifts = interestAreaIds.length
    ? await db.shift.findMany({
        where: {
          serviceAreaId: { in: interestAreaIds },
          date: { gte: today, lte: thirtyDaysOut },
          signups: {
            none: {
              volunteerId: profile.id,
              status: { in: ["SIGNED_UP", "ATTENDED"] },
            },
          },
        },
        include: {
          serviceArea: { select: { id: true, name: true } },
          signups: {
            where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
            select: { id: true },
          },
          offers: { select: { volunteerId: true, status: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      })
    : [];

  const openShiftsForYou = openShifts
    .filter((s) => s.signups.length < s.capacity)
    // Don't dangle a shift that's being held for someone else's crew.
    .filter(
      (s) =>
        !isHeldForOffers(s, now) ||
        s.offers.some(
          (offer) =>
            offer.volunteerId === profile.id && offer.status === "PENDING"
        )
    )
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      serviceArea: { id: s.serviceArea.id, name: s.serviceArea.name },
      spotsLeft: s.capacity - s.signups.length,
    }));

  const upcomingShifts = upcomingSignups.map((s) => ({
    id: s.shift.id,
    date: s.shift.date,
    startTime: s.shift.startTime,
    endTime: s.shift.endTime,
    serviceArea: { id: s.shift.serviceArea.id, name: s.shift.serviceArea.name },
    notes: s.shift.notes,
  }));

  return {
    nextShift: upcomingShifts[0] ?? null,
    upcomingShifts,
    openShiftsForYou,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    mealsThisMonth,
    totalMeals,
    totalShifts,
    milestones: getMilestones(Math.round(totalHours * 10) / 10),
  };
}

// ─── Volunteer Hours Data ───────────────────────────────

export async function getVolunteerHoursDataForUser(
  userId: string
): Promise<VolunteerHoursData | null> {
  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
  });

  if (!profile) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allAttended = await db.shiftSignup.findMany({
    where: {
      volunteerId: profile.id,
      status: "ATTENDED",
    },
    include: {
      shift: {
        include: { serviceArea: { select: { id: true, name: true } } },
      },
    },
    orderBy: { shift: { date: "desc" } },
  });

  // Calculate totals
  let totalHours = 0;
  let totalMeals = 0;
  let hoursThisMonth = 0;
  let mealsThisMonth = 0;
  let shiftsThisMonth = 0;

  // By service area
  const areaMap = new Map<
    string,
    { name: string; hours: number; shifts: number; meals: number }
  >();
  // By month
  const monthMap = new Map<
    string,
    { label: string; hours: number; shifts: number; meals: number }
  >();

  for (const signup of allAttended) {
    const h = diffHours(signup.shift.startTime, signup.shift.endTime);
    const m = signup.shift.mealsServed ?? 0;
    totalHours += h;
    totalMeals += m;

    // This month
    if (signup.shift.date >= startOfMonth && signup.shift.date <= now) {
      hoursThisMonth += h;
      mealsThisMonth += m;
      shiftsThisMonth++;
    }

    // By service area
    const areaId = signup.shift.serviceArea.id;
    const existing = areaMap.get(areaId);
    if (existing) {
      existing.hours += h;
      existing.shifts++;
      existing.meals += m;
    } else {
      areaMap.set(areaId, {
        name: signup.shift.serviceArea.name,
        hours: h,
        shifts: 1,
        meals: m,
      });
    }

    // By month
    const d = new Date(signup.shift.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = d.toLocaleDateString("en-NZ", {
      month: "long",
      year: "numeric",
    });
    const existingMonth = monthMap.get(monthKey);
    if (existingMonth) {
      existingMonth.hours += h;
      existingMonth.shifts++;
      existingMonth.meals += m;
    } else {
      monthMap.set(monthKey, {
        label: monthLabel,
        hours: h,
        shifts: 1,
        meals: m,
      });
    }
  }

  const roundedTotal = Math.round(totalHours * 10) / 10;

  return {
    totalHours: roundedTotal,
    totalShifts: allAttended.length,
    totalMeals,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    shiftsThisMonth,
    mealsThisMonth,
    byServiceArea: Array.from(areaMap.entries())
      .map(([id, data]) => ({
        serviceAreaId: id,
        serviceAreaName: data.name,
        hours: Math.round(data.hours * 10) / 10,
        shifts: data.shifts,
        meals: data.meals,
      }))
      .sort((a, b) => b.hours - a.hours),
    byMonth: Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        label: data.label,
        hours: Math.round(data.hours * 10) / 10,
        shifts: data.shifts,
        meals: data.meals,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12),
    milestones: getMilestones(roundedTotal),
  };
}
