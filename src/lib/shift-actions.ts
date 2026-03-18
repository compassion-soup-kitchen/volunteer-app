"use server";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────

export type ShiftWithDetails = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  serviceArea: { id: string; name: string };
  signupCount: number;
  userSignupId: string | null; // null if user hasn't signed up
  userSignupStatus: string | null;
};

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

export type ShiftFilters = {
  serviceAreaId?: string;
  fromDate?: string; // ISO
  toDate?: string; // ISO
};

// ─── Volunteer Actions ──────────────────────────────────

export async function getAvailableShifts(
  filters?: ShiftFilters
): Promise<ShiftWithDetails[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getDb();

  // Get volunteer profile for signup status
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });

  const now = new Date();
  const fromDate = filters?.fromDate ? new Date(filters.fromDate) : now;
  const toDate = filters?.toDate ? new Date(filters.toDate) : undefined;

  const shifts = await db.shift.findMany({
    where: {
      date: {
        gte: fromDate,
        ...(toDate ? { lte: toDate } : {}),
      },
      ...(filters?.serviceAreaId
        ? { serviceAreaId: filters.serviceAreaId }
        : {}),
    },
    include: {
      serviceArea: { select: { id: true, name: true } },
      signups: {
        where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
        select: {
          id: true,
          volunteerId: true,
          status: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return shifts.map((shift) => {
    const userSignup = profile
      ? shift.signups.find((s) => s.volunteerId === profile.id)
      : null;

    return {
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      capacity: shift.capacity,
      notes: shift.notes,
      serviceArea: shift.serviceArea,
      signupCount: shift.signups.length,
      userSignupId: userSignup?.id ?? null,
      userSignupStatus: userSignup?.status ?? null,
    };
  });
}

export async function signUpForShift(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile || profile.status !== "ACTIVE") {
    return {
      error: "Your application must be approved before signing up for shifts.",
    };
  }

  // Check shift exists and has capacity
  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    include: {
      signups: {
        where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
      },
    },
  });

  if (!shift) return { error: "Shift not found." };
  if (shift.date < new Date()) return { error: "This shift has already passed." };
  if (shift.signups.length >= shift.capacity) {
    return { error: "This shift is full." };
  }

  // Check for existing signup
  const existing = await db.shiftSignup.findUnique({
    where: {
      shiftId_volunteerId: {
        shiftId,
        volunteerId: profile.id,
      },
    },
  });

  if (existing && existing.status === "SIGNED_UP") {
    return { error: "You are already signed up for this shift." };
  }

  try {
    if (existing && existing.status === "CANCELLED") {
      // Re-sign up
      await db.shiftSignup.update({
        where: { id: existing.id },
        data: { status: "SIGNED_UP", signedUpAt: new Date() },
      });
    } else {
      await db.shiftSignup.create({
        data: {
          shiftId,
          volunteerId: profile.id,
          status: "SIGNED_UP",
        },
      });
    }

    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function cancelShiftSignup(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Profile not found." };

  const signup = await db.shiftSignup.findUnique({
    where: {
      shiftId_volunteerId: {
        shiftId,
        volunteerId: profile.id,
      },
    },
    include: { shift: true },
  });

  if (!signup || signup.status !== "SIGNED_UP") {
    return { error: "No active signup found for this shift." };
  }

  if (signup.shift.date < new Date()) {
    return { error: "Cannot cancel a shift that has already passed." };
  }

  try {
    await db.shiftSignup.update({
      where: { id: signup.id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Staff Actions ──────────────────────────────────────

export async function getStaffShifts(
  filters?: ShiftFilters
): Promise<StaffShift[]> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return [];
  }

  const db = getDb();

  const now = new Date();
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

  try {
    await db.shift.update({
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
    });

    revalidatePath("/staff/shifts");
    revalidatePath(`/staff/shifts/${shiftId}`);
    revalidatePath("/shifts");
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
