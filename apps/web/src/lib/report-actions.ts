"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/role-change";
import { dateOnlyOf, timestampToDateOnly } from "@/lib/date-only";
import {
  buildAppZoneTimestampWindow,
  INDUCTION_TYPE_KEY,
  type MonthlySummary,
} from "@/lib/report-summary";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";

// ─── Auth ────────────────────────────────────────────

async function requireStaff() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role)
  ) {
    return null;
  }
  return session;
}

// ─── Types ───────────────────────────────────────────

export type ReportFilters = {
  fromDate?: string; // ISO
  toDate?: string; // ISO
  serviceAreaId?: string;
};

export type HoursByServiceArea = {
  serviceAreaId: string;
  serviceAreaName: string;
  totalHours: number;
  totalShifts: number;
  uniqueVolunteers: number;
  attendanceRate: number; // percentage
};

export type MonthlyTrend = {
  month: string; // YYYY-MM
  label: string; // "Mar 2026"
  hours: number;
  shifts: number;
  uniqueVolunteers: number;
};

export type VolunteerLeaderboard = {
  volunteerId: string;
  volunteerName: string;
  totalHours: number;
  totalShifts: number;
  serviceAreas: string[];
};

export type OnboardingMetrics = {
  totalApplications: number;
  pending: number;
  approved: number;
  declined: number;
  infoRequested: number;
  activeVolunteers: number;
  inactiveVolunteers: number;
  avgDaysToApproval: number | null;
};

export type ReportSummary = {
  totalHours: number;
  totalShifts: number;
  uniqueVolunteers: number;
  overallAttendanceRate: number;
};

export type ServiceAreaOption = {
  id: string;
  name: string;
};

// ─── Service Areas for filter ────────────────────────

export async function getReportServiceAreas(): Promise<ServiceAreaOption[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  return db.serviceArea.findMany({
    where: { isArchived: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── Summary Stats ──────────────────────────────────

export async function getReportSummary(
  filters?: ReportFilters
): Promise<ReportSummary | null> {
  const session = await requireStaff();
  if (!session) return null;

  const db = getDb();

  const dateFilter = buildDateFilter(filters);
  const areaFilter = filters?.serviceAreaId
    ? { serviceAreaId: filters.serviceAreaId }
    : {};

  const signups = await db.shiftSignup.findMany({
    where: {
      status: { in: ["ATTENDED", "NO_SHOW"] },
      shift: { ...dateFilter, ...areaFilter },
    },
    include: {
      shift: { select: { startTime: true, endTime: true } },
    },
  });

  const attended = signups.filter((s) => s.status === "ATTENDED");
  let totalHours = 0;
  for (const s of attended) {
    totalHours += calcHours(s.shift.startTime, s.shift.endTime);
  }

  const uniqueVolunteerIds = new Set(attended.map((s) => s.volunteerId));

  const totalShifts = await db.shift.count({
    where: { ...dateFilter, ...areaFilter },
  });

  const attendanceRate =
    signups.length > 0
      ? Math.round((attended.length / signups.length) * 100)
      : 0;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalShifts,
    uniqueVolunteers: uniqueVolunteerIds.size,
    overallAttendanceRate: attendanceRate,
  };
}

// ─── Hours by Service Area ──────────────────────────

export async function getHoursByServiceArea(
  filters?: ReportFilters
): Promise<HoursByServiceArea[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const dateFilter = buildDateFilter(filters);

  const serviceAreas = await db.serviceArea.findMany({
    where: {
      isArchived: false,
      ...(filters?.serviceAreaId ? { id: filters.serviceAreaId } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: HoursByServiceArea[] = [];

  for (const area of serviceAreas) {
    const signups = await db.shiftSignup.findMany({
      where: {
        status: { in: ["ATTENDED", "NO_SHOW"] },
        shift: { serviceAreaId: area.id, ...dateFilter },
      },
      include: {
        shift: { select: { startTime: true, endTime: true } },
      },
    });

    const attended = signups.filter((s) => s.status === "ATTENDED");
    let hours = 0;
    for (const s of attended) {
      hours += calcHours(s.shift.startTime, s.shift.endTime);
    }

    const uniqueVolunteers = new Set(attended.map((s) => s.volunteerId)).size;
    const shifts = await db.shift.count({
      where: { serviceAreaId: area.id, ...dateFilter },
    });

    results.push({
      serviceAreaId: area.id,
      serviceAreaName: area.name,
      totalHours: Math.round(hours * 10) / 10,
      totalShifts: shifts,
      uniqueVolunteers,
      attendanceRate:
        signups.length > 0
          ? Math.round((attended.length / signups.length) * 100)
          : 0,
    });
  }

  return results;
}

// ─── Monthly Trends ─────────────────────────────────

export async function getMonthlyTrends(
  filters?: ReportFilters
): Promise<MonthlyTrend[]> {
  await connection();
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  const areaFilter = filters?.serviceAreaId
    ? { serviceAreaId: filters.serviceAreaId }
    : {};

  // Default to last 6 months if no date range
  const now = new Date();
  const fromDate = filters?.fromDate
    ? new Date(filters.fromDate)
    : subMonths(startOfMonth(now), 5);
  const toDate = filters?.toDate ? new Date(filters.toDate) : endOfMonth(now);

  const trends: MonthlyTrend[] = [];
  let current = startOfMonth(fromDate);

  while (current <= toDate) {
    const monthEnd = endOfMonth(current);

    const signups = await db.shiftSignup.findMany({
      where: {
        status: "ATTENDED",
        shift: {
          date: { gte: current, lte: monthEnd },
          ...areaFilter,
        },
      },
      include: {
        shift: { select: { startTime: true, endTime: true } },
      },
    });

    let hours = 0;
    for (const s of signups) {
      hours += calcHours(s.shift.startTime, s.shift.endTime);
    }

    const shifts = await db.shift.count({
      where: {
        date: { gte: current, lte: monthEnd },
        ...areaFilter,
      },
    });

    const uniqueVolunteers = new Set(signups.map((s) => s.volunteerId)).size;

    trends.push({
      month: format(current, "yyyy-MM"),
      label: format(current, "MMM yyyy"),
      hours: Math.round(hours * 10) / 10,
      shifts,
      uniqueVolunteers,
    });

    current = startOfMonth(subMonths(current, -1));
  }

  return trends;
}

// ─── Volunteer Leaderboard ──────────────────────────

export async function getVolunteerLeaderboard(
  filters?: ReportFilters
): Promise<VolunteerLeaderboard[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const dateFilter = buildDateFilter(filters);
  const areaFilter = filters?.serviceAreaId
    ? { serviceAreaId: filters.serviceAreaId }
    : {};

  const signups = await db.shiftSignup.findMany({
    where: {
      status: "ATTENDED",
      shift: { ...dateFilter, ...areaFilter },
    },
    include: {
      volunteer: {
        include: { user: { select: { name: true } } },
      },
      shift: {
        select: {
          startTime: true,
          endTime: true,
          serviceArea: { select: { name: true } },
        },
      },
    },
  });

  // Aggregate by volunteer
  const map = new Map<
    string,
    {
      name: string;
      hours: number;
      shifts: number;
      areas: Set<string>;
    }
  >();

  for (const s of signups) {
    const existing = map.get(s.volunteerId) || {
      name: s.volunteer.user.name || "Unknown",
      hours: 0,
      shifts: 0,
      areas: new Set<string>(),
    };
    existing.hours += calcHours(s.shift.startTime, s.shift.endTime);
    existing.shifts += 1;
    existing.areas.add(s.shift.serviceArea.name);
    map.set(s.volunteerId, existing);
  }

  return Array.from(map.entries())
    .map(([volunteerId, data]) => ({
      volunteerId,
      volunteerName: data.name,
      totalHours: Math.round(data.hours * 10) / 10,
      totalShifts: data.shifts,
      serviceAreas: Array.from(data.areas),
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 20);
}

// ─── Onboarding Metrics ─────────────────────────────

export async function getOnboardingMetrics(): Promise<OnboardingMetrics | null> {
  const session = await requireStaff();
  if (!session) return null;

  const db = getDb();

  const [applications, volunteerStats] = await Promise.all([
    db.application.findMany({
      select: {
        status: true,
        submittedAt: true,
        reviewedAt: true,
      },
    }),
    db.volunteerProfile.groupBy({
      by: ["status"],
      // Exclude staff (COORDINATOR/ADMIN) so directly-promoted staff, who never
      // went through onboarding, don't skew the funnel. Pending applicants are
      // still PUBLIC, so they remain counted.
      where: { user: { role: { notIn: STAFF_ROLES } } },
      _count: true,
    }),
  ]);

  const pending = applications.filter((a) => a.status === "PENDING").length;
  const approved = applications.filter((a) => a.status === "APPROVED").length;
  const declined = applications.filter((a) => a.status === "DECLINED").length;
  const infoRequested = applications.filter(
    (a) => a.status === "INFO_REQUESTED"
  ).length;

  // Average days to approval
  const approvedWithDates = applications.filter(
    (a) => a.status === "APPROVED" && a.reviewedAt
  );
  let avgDays: number | null = null;
  if (approvedWithDates.length > 0) {
    const totalDays = approvedWithDates.reduce((sum, a) => {
      const days =
        (a.reviewedAt!.getTime() - a.submittedAt.getTime()) /
        (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgDays = Math.round((totalDays / approvedWithDates.length) * 10) / 10;
  }

  const active =
    volunteerStats.find((v) => v.status === "ACTIVE")?._count || 0;
  const inactive =
    volunteerStats.find((v) => v.status === "INACTIVE")?._count || 0;

  return {
    totalApplications: applications.length,
    pending,
    approved,
    declined,
    infoRequested,
    activeVolunteers: active,
    inactiveVolunteers: inactive,
    avgDaysToApproval: avgDays,
  };
}

// ─── CSV Export Data ─────────────────────────────────

export type ShiftExportRow = {
  date: string;
  serviceArea: string;
  startTime: string;
  endTime: string;
  capacity: number;
  signedUp: number;
  attended: number;
  noShow: number;
  hours: number;
};

export async function getShiftExportData(
  filters?: ReportFilters
): Promise<ShiftExportRow[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const dateFilter = buildDateFilter(filters);
  const areaFilter = filters?.serviceAreaId
    ? { serviceAreaId: filters.serviceAreaId }
    : {};

  const shifts = await db.shift.findMany({
    where: { ...dateFilter, ...areaFilter },
    include: {
      serviceArea: { select: { name: true } },
      signups: { select: { status: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return shifts.map((shift) => ({
    // A stored calendar day, so read it back as one — `format` would render
    // it in the server's timezone and shift it a day on any host behind UTC.
    date: dateOnlyOf(shift.date),
    serviceArea: shift.serviceArea.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    capacity: shift.capacity,
    signedUp: shift.signups.filter(
      (s) => s.status === "SIGNED_UP" || s.status === "ATTENDED"
    ).length,
    attended: shift.signups.filter((s) => s.status === "ATTENDED").length,
    noShow: shift.signups.filter((s) => s.status === "NO_SHOW").length,
    hours: calcHours(shift.startTime, shift.endTime),
  }));
}

export type VolunteerExportRow = {
  name: string;
  email: string;
  status: string;
  mojStatus: string;
  totalShifts: number;
  totalHours: number;
  joinedDate: string;
};

export async function getVolunteerExportData(
  filters?: ReportFilters
): Promise<VolunteerExportRow[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const dateFilter = buildDateFilter(filters);
  const areaFilter = filters?.serviceAreaId
    ? { serviceAreaId: filters.serviceAreaId }
    : {};

  const volunteers = await db.volunteerProfile.findMany({
    // Exclude staff (COORDINATOR/ADMIN) from the volunteer export.
    where: {
      status: { in: ["ACTIVE", "APPROVED_FOR_INDUCTION"] },
      user: { role: { notIn: STAFF_ROLES } },
    },
    include: {
      user: { select: { name: true, email: true } },
      shiftSignups: {
        where: {
          status: "ATTENDED",
          shift: { ...dateFilter, ...areaFilter },
        },
        include: {
          shift: { select: { startTime: true, endTime: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return volunteers.map((v) => {
    let hours = 0;
    for (const s of v.shiftSignups) {
      hours += calcHours(s.shift.startTime, s.shift.endTime);
    }
    return {
      name: v.user.name || "—",
      email: v.user.email,
      status: v.status,
      mojStatus: v.mojStatus,
      totalShifts: v.shiftSignups.length,
      totalHours: Math.round(hours * 10) / 10,
      // `createdAt` is a real timestamp, not a stored day: the calendar date
      // someone joined on is a question about Wellington, not the server.
      joinedDate: timestampToDateOnly(v.createdAt),
    };
  });
}

// ─── Monthly Summary Export ──────────────────────────

/**
 * The headline numbers for a period: how many volunteers joined, how many
 * completed their induction, and per service area how many people turned up
 * and how many hours they gave.
 *
 * Everything respects the dashboard's current date range and service-area
 * filter, so the export always matches what's on screen.
 */
export async function getMonthlySummary(
  filters?: ReportFilters
): Promise<MonthlySummary | null> {
  const session = await requireStaff();
  if (!session) return null;

  const db = getDb();

  // No service-area filter here: signups and shifts are filtered inside the
  // two helpers below, and neither joining nor completing an induction belongs
  // to a service area at all.
  const dateFilter = buildDateFilter(filters);

  // "New volunteers" is about when someone joined, so it keys off the profile's
  // own createdAt rather than any shift they may or may not have worked.
  const profileWindow = buildAppZoneTimestampWindow(filters);

  const [byArea, summary, newVolunteers, inductions, selectedArea] =
    await Promise.all([
      getHoursByServiceArea(filters),
      getReportSummary(filters),
      db.volunteerProfile.count({
        where: {
          user: { role: { notIn: STAFF_ROLES } },
          ...profileWindow,
        },
      }),
      // Induction attendance is matched on the type's stable key, so renaming
      // "Induction" in the training-types screen doesn't break the count.
      db.trainingAttendance.count({
        where: {
          status: "ATTENDED",
          session: {
            type: { key: INDUCTION_TYPE_KEY },
            ...dateFilter,
          },
        },
      }),
      filters?.serviceAreaId
        ? db.serviceArea.findUnique({
            where: { id: filters.serviceAreaId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

  // Areas with no activity in the period are noise in a monthly report.
  const activeAreas = byArea.filter(
    (area) => area.totalShifts > 0 || area.totalHours > 0
  );

  return {
    fromDate: filters?.fromDate ?? null,
    toDate: filters?.toDate ?? null,
    serviceAreaName: selectedArea?.name ?? null,
    newVolunteers,
    inductionsCompleted: inductions,
    volunteersAttended: summary?.uniqueVolunteers ?? 0,
    totalHours: summary?.totalHours ?? 0,
    totalShifts: summary?.totalShifts ?? 0,
    attendanceRate: summary?.overallAttendanceRate ?? 0,
    byArea: activeAreas.map((area) => ({
      serviceAreaName: area.serviceAreaName,
      volunteersAttended: area.uniqueVolunteers,
      shifts: area.totalShifts,
      hours: area.totalHours,
      attendanceRate: area.attendanceRate,
    })),
  };
}

// ─── Helpers ─────────────────────────────────────────

function calcHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return endH - startH + (endM - startM) / 60;
}

function buildDateFilter(filters?: ReportFilters) {
  if (!filters?.fromDate && !filters?.toDate) return {};
  return {
    date: {
      ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
      ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
    },
  };
}

