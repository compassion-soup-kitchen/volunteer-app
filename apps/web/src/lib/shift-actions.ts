"use server";

import { after, connection } from "next/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import { shouldNotifyShiftChange } from "@/lib/shift-notifications";
import { revalidatePath } from "next/cache";

import {
  cancelShiftSignupAsUser,
  getAvailableShiftsForUser,
  signUpForShiftAsUser,
  type ShiftFilters,
  type ShiftWithDetails,
} from "@/lib/data/volunteer-shifts";

export type {
  ShiftWithDetails,
  ShiftFilters,
} from "@/lib/data/volunteer-shifts";

// ─── Types ──────────────────────────────────────────────

export type StaffShift = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  serviceArea: { id: string; name: string };
  createdBy: { name: string | null };
  signups: {
    id: string;
    status: string;
    volunteer: {
      id: string;
      user: { name: string | null; email: string };
    };
  }[];
};

// ─── Volunteer Actions ──────────────────────────────────

export async function getAvailableShifts(
  filters?: ShiftFilters
): Promise<ShiftWithDetails[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return getAvailableShiftsForUser(session.user.id, filters);
}

export async function signUpForShift(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return signUpForShiftAsUser(session.user.id, shiftId);
}

export async function cancelShiftSignup(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return cancelShiftSignupAsUser(session.user.id, shiftId);
}

// ─── Staff Actions ──────────────────────────────────────

export async function getStaffShifts(
  filters?: ShiftFilters
): Promise<StaffShift[]> {
  await connection();
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return [];
  }

  const db = getDb();

  const fromDate = filters?.fromDate ? new Date(filters.fromDate) : undefined;
  const toDate = filters?.toDate ? new Date(filters.toDate) : undefined;

  const shifts = await db.shift.findMany({
    where: {
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(filters?.serviceAreaId
        ? { serviceAreaId: filters.serviceAreaId }
        : {}),
    },
    include: {
      serviceArea: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      signups: {
        where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
        select: {
          id: true,
          status: true,
          volunteer: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
  });

  return shifts;
}

export async function getShiftDetail(shiftId: string): Promise<StaffShift | null> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return null;
  }

  const db = getDb();
  return db.shift.findUnique({
    where: { id: shiftId },
    include: {
      serviceArea: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      signups: {
        select: {
          id: true,
          status: true,
          volunteer: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { signedUpAt: "asc" },
      },
    },
  });
}

export type CreateShiftData = {
  serviceAreaId: string;
  date: string; // ISO
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  notes?: string;
};

export async function createShift(
  data: CreateShiftData
): Promise<{ error?: string; success?: boolean; shiftId?: string }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  if (!data.serviceAreaId || !data.date || !data.startTime || !data.endTime) {
    return { error: "All fields are required." };
  }

  if (data.capacity < 1) {
    return { error: "Capacity must be at least 1." };
  }

  if (data.startTime >= data.endTime) {
    return { error: "End time must be after start time." };
  }

  const db = getDb();

  try {
    const shift = await db.shift.create({
      data: {
        serviceAreaId: data.serviceAreaId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity,
        notes: data.notes || null,
        createdById: session.user.id,
      },
    });

    revalidatePath("/staff/shifts");
    revalidatePath("/shifts");
    return { success: true, shiftId: shift.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateShift(
  shiftId: string,
  data: Partial<CreateShiftData>
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    return { error: "End time must be after start time." };
  }

  if (data.capacity !== undefined && data.capacity < 1) {
    return { error: "Capacity must be at least 1." };
  }

  const db = getDb();

  const existing = await db.shift.findUnique({
    where: { id: shiftId },
    select: {
      date: true,
      startTime: true,
      endTime: true,
      serviceAreaId: true,
      signups: {
        where: { status: "SIGNED_UP" },
        select: { volunteer: { select: { userId: true } } },
      },
    },
  });

  if (!existing) return { error: "Shift not found." };

  try {
    const updated = await db.shift.update({
      where: { id: shiftId },
      data: {
        ...(data.serviceAreaId !== undefined && {
          serviceAreaId: data.serviceAreaId,
        }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: { serviceArea: { select: { name: true } } },
    });

    if (
      existing.signups.length > 0 &&
      shouldNotifyShiftChange(existing, updated, new Date())
    ) {
      const userIds = existing.signups.map((s) => s.volunteer.userId);
      after(() =>
        sendPushToUsers(userIds, {
          title: "Your shift has changed",
          body: `${updated.serviceArea.name} is now ${format(updated.date, "EEEE d MMMM")}, ${updated.startTime}–${updated.endTime}.`,
          data: { url: `/shift/${shiftId}` },
        })
      );
    }

    revalidatePath("/staff/shifts");
    revalidatePath(`/staff/shifts/${shiftId}`);
    revalidatePath("/shifts");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Attendance Actions ────────────────────────────────

export async function markAttendance(
  signupId: string,
  status: "ATTENDED" | "NO_SHOW"
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const db = getDb();
  const signup = await db.shiftSignup.findUnique({
    where: { id: signupId },
    include: { shift: true },
  });

  if (!signup) return { error: "Signup not found." };

  try {
    await db.shiftSignup.update({
      where: { id: signupId },
      data: {
        status,
        attendanceMarkedById: session.user.id,
        attendanceMarkedAt: new Date(),
      },
    });

    revalidatePath(`/staff/shifts/${signup.shiftId}`);
    revalidatePath("/staff/shifts");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function markBulkAttendance(
  shiftId: string,
  attendanceMap: Record<string, "ATTENDED" | "NO_SHOW">
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const db = getDb();

  try {
    await db.$transaction(
      Object.entries(attendanceMap).map(([signupId, status]) =>
        db.shiftSignup.update({
          where: { id: signupId },
          data: {
            status,
            attendanceMarkedById: session.user!.id,
            attendanceMarkedAt: new Date(),
          },
        })
      )
    );

    revalidatePath(`/staff/shifts/${shiftId}`);
    revalidatePath("/staff/shifts");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteShift(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const db = getDb();

  // Check for active signups
  const activeSignups = await db.shiftSignup.count({
    where: {
      shiftId,
      status: "SIGNED_UP",
    },
  });

  if (activeSignups > 0) {
    return {
      error: `Cannot delete — ${activeSignups} volunteer${activeSignups > 1 ? "s" : ""} still signed up. Cancel their signups first.`,
    };
  }

  try {
    await db.shift.delete({ where: { id: shiftId } });
    revalidatePath("/staff/shifts");
    revalidatePath("/shifts");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
