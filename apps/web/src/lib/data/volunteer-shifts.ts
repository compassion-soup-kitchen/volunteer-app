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

export type ShiftFilters = {
  serviceAreaId?: string;
  fromDate?: string; // ISO
  toDate?: string; // ISO
};

export type ScheduleEntry = {
  id: string; // shift id
  date: Date;
  startTime: string;
  endTime: string;
  areaName: string;
  status: "CONFIRMED" | "ATTENDED" | "NO_SHOW";
};

export type MutationResult = { error?: string; success?: boolean };

// ─── Reads ──────────────────────────────────────────────

type ShiftWithSignups = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  serviceArea: { id: string; name: string };
  signups: { id: string; volunteerId: string; status: string }[];
};

function toShiftWithDetails(
  shift: ShiftWithSignups,
  volunteerId: string | null
): ShiftWithDetails {
  const userSignup = volunteerId
    ? shift.signups.find((s) => s.volunteerId === volunteerId)
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
}

export async function getAvailableShiftsForUser(
  userId: string,
  filters?: ShiftFilters
): Promise<ShiftWithDetails[]> {
  const db = getDb();

  // Get volunteer profile for signup status
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
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
        select: { id: true, volunteerId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return shifts.map((shift) => toShiftWithDetails(shift, profile?.id ?? null));
}

export async function getShiftForUser(
  userId: string,
  shiftId: string
): Promise<ShiftWithDetails | null> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
  });

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    include: {
      serviceArea: { select: { id: true, name: true } },
      signups: {
        where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
        select: { id: true, volunteerId: true, status: true },
      },
    },
  });

  return shift ? toShiftWithDetails(shift, profile?.id ?? null) : null;
}

/** The volunteer's own roster: upcoming bookings plus past attended / missed shifts. */
export async function getScheduleForUser(
  userId: string
): Promise<{ upcoming: ScheduleEntry[]; past: ScheduleEntry[] }> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
  });
  if (!profile) return { upcoming: [], past: [] };

  const signups = await db.shiftSignup.findMany({
    where: {
      volunteerId: profile.id,
      status: { in: ["SIGNED_UP", "ATTENDED", "NO_SHOW"] },
    },
    include: {
      shift: { include: { serviceArea: { select: { name: true } } } },
    },
  });

  const now = new Date();
  const upcoming: ScheduleEntry[] = [];
  const past: ScheduleEntry[] = [];

  for (const signup of signups) {
    const entry: ScheduleEntry = {
      id: signup.shift.id,
      date: signup.shift.date,
      startTime: signup.shift.startTime,
      endTime: signup.shift.endTime,
      areaName: signup.shift.serviceArea.name,
      status:
        signup.status === "SIGNED_UP"
          ? "CONFIRMED"
          : signup.status === "NO_SHOW"
            ? "NO_SHOW"
            : "ATTENDED",
    };

    if (signup.status === "SIGNED_UP") {
      if (signup.shift.date >= now) upcoming.push(entry);
    } else {
      past.push(entry);
    }
  }

  const byDateTime = (a: ScheduleEntry, b: ScheduleEntry) =>
    a.date.getTime() - b.date.getTime() ||
    a.startTime.localeCompare(b.startTime);

  upcoming.sort(byDateTime);
  past.sort((a, b) => byDateTime(b, a));

  return { upcoming, past };
}

// ─── Mutations ──────────────────────────────────────────

export async function signUpForShiftAsUser(
  userId: string,
  shiftId: string
): Promise<MutationResult> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
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

export async function cancelShiftSignupAsUser(
  userId: string,
  shiftId: string
): Promise<MutationResult> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
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
