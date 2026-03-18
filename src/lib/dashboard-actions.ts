"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMilestones, type Milestone } from "@/lib/milestones";

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

function diffHours(start: string, end: string): number {
  const s = parseTime(start);
  const e = parseTime(end);
  return (e.hours * 60 + e.minutes - (s.hours * 60 + s.minutes)) / 60;
}

// ─── Dashboard Data ─────────────────────────────────────

export async function getDashboardData() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Upcoming shifts (signed up, date >= today)
  const upcomingSignups = await db.shiftSignup.findMany({
    where: {
      volunteerId: profile.id,
      status: "SIGNED_UP",
      shift: { date: { gte: now } },
    },
    include: {
      shift: {
        include: { serviceArea: true },
      },
    },
    orderBy: { shift: { date: "asc" } },
    take: 5,
  });

  // Hours this month (attended shifts in current month)
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

  // Total hours all time
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

  const totalShifts = allAttended.length;

  return {
    upcomingShifts: upcomingSignups.map((s) => ({
      id: s.shift.id,
      date: s.shift.date,
      startTime: s.shift.startTime,
      endTime: s.shift.endTime,
      serviceArea: s.shift.serviceArea.name,
      notes: s.shift.notes,
    })),
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    totalShifts,
    milestones: getMilestones(Math.round(totalHours * 10) / 10),
  };
}

// ─── Volunteer Hours Page Data ──────────────────────────

export type ServiceAreaHours = {
  serviceAreaId: string;
  serviceAreaName: string;
  hours: number;
  shifts: number;
};

export type MonthlyHours = {
  month: string; // "2026-03"
  label: string; // "March 2026"
  hours: number;
  shifts: number;
};

export type VolunteerHoursData = {
  totalHours: number;
  totalShifts: number;
  hoursThisMonth: number;
  shiftsThisMonth: number;
  byServiceArea: ServiceAreaHours[];
  byMonth: MonthlyHours[];
  milestones: Milestone[];
};

export async function getVolunteerHoursData(): Promise<VolunteerHoursData | null> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
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
  let hoursThisMonth = 0;
  let shiftsThisMonth = 0;

  // By service area
  const areaMap = new Map<string, { name: string; hours: number; shifts: number }>();
  // By month
  const monthMap = new Map<string, { label: string; hours: number; shifts: number }>();

  for (const signup of allAttended) {
    const h = diffHours(signup.shift.startTime, signup.shift.endTime);
    totalHours += h;

    // This month
    if (signup.shift.date >= startOfMonth && signup.shift.date <= now) {
      hoursThisMonth += h;
      shiftsThisMonth++;
    }

    // By service area
    const areaId = signup.shift.serviceArea.id;
    const existing = areaMap.get(areaId);
    if (existing) {
      existing.hours += h;
      existing.shifts++;
    } else {
      areaMap.set(areaId, {
        name: signup.shift.serviceArea.name,
        hours: h,
        shifts: 1,
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
    } else {
      monthMap.set(monthKey, { label: monthLabel, hours: h, shifts: 1 });
    }
  }

  const roundedTotal = Math.round(totalHours * 10) / 10;

  return {
    totalHours: roundedTotal,
    totalShifts: allAttended.length,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
    shiftsThisMonth,
    byServiceArea: Array.from(areaMap.entries())
      .map(([id, data]) => ({
        serviceAreaId: id,
        serviceAreaName: data.name,
        hours: Math.round(data.hours * 10) / 10,
        shifts: data.shifts,
      }))
      .sort((a, b) => b.hours - a.hours),
    byMonth: Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        label: data.label,
        hours: Math.round(data.hours * 10) / 10,
        shifts: data.shifts,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12),
    milestones: getMilestones(roundedTotal),
  };
}
