"use server";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

function diffHours(start: string, end: string): number {
  const s = parseTime(start);
  const e = parseTime(end);
  return (e.hours * 60 + e.minutes - (s.hours * 60 + s.minutes)) / 60;
}

export async function getDashboardData() {
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
  };
}
