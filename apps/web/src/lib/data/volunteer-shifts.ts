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

export type SignupDecision =
  | { action: "reject"; error: string }
  | { action: "create" }
  | { action: "reactivate" };

/**
 * Pure capacity/eligibility check for a shift signup. Check order matters
 * and mirrors the messages the UI already relies on: a full shift reports
 * "full" even to a volunteer who is already on it.
 */
export function decideSignup(input: {
  shift: { date: Date; capacity: number } | null;
  activeSignupCount: number;
  existingSignupStatus: string | null;
  now: Date;
}): SignupDecision {
  const { shift, activeSignupCount, existingSignupStatus, now } = input;

  if (!shift) return { action: "reject", error: "Shift not found." };
  if (shift.date < now) {
    return { action: "reject", error: "This shift has already passed." };
  }
  if (activeSignupCount >= shift.capacity) {
    return { action: "reject", error: "This shift is full." };
  }
  if (existingSignupStatus === "SIGNED_UP") {
    return {
      action: "reject",
      error: "You are already signed up for this shift.",
    };
  }
  return existingSignupStatus === "CANCELLED"
    ? { action: "reactivate" }
    : { action: "create" };
}

/**
 * Whether an error is a transaction serialization failure worth retrying:
 * Prisma's P2034 (write conflict / deadlock) or the underlying Postgres
 * 40001 serialization_failure it maps from.
 */
export function isSerializationFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "P2034" || code === "40001";
}

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

  // The capacity check and the signup write must be atomic - two volunteers
  // racing for the last spot would otherwise both pass the count check and
  // overbook the shift. A Serializable transaction makes Postgres abort one
  // of the two racing signups (P2034), which we retry once against the
  // committed state - where the re-count then reports the shift as full.
  const attemptSignup = () =>
    db.$transaction(
      async (tx): Promise<MutationResult> => {
        const shift = await tx.shift.findUnique({
          where: { id: shiftId },
          include: {
            signups: {
              where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
              select: { id: true },
            },
          },
        });

        const existing = await tx.shiftSignup.findUnique({
          where: {
            shiftId_volunteerId: {
              shiftId,
              volunteerId: profile.id,
            },
          },
        });

        const decision = decideSignup({
          shift,
          activeSignupCount: shift?.signups.length ?? 0,
          existingSignupStatus: existing?.status ?? null,
          now: new Date(),
        });

        if (decision.action === "reject") return { error: decision.error };

        if (decision.action === "reactivate" && existing) {
          // Re-sign up
          await tx.shiftSignup.update({
            where: { id: existing.id },
            data: { status: "SIGNED_UP", signedUpAt: new Date() },
          });
        } else {
          await tx.shiftSignup.create({
            data: {
              shiftId,
              volunteerId: profile.id,
              status: "SIGNED_UP",
            },
          });
        }

        return { success: true };
      },
      { isolationLevel: "Serializable" }
    );

  try {
    let result: MutationResult;
    try {
      result = await attemptSignup();
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      result = await attemptSignup();
    }

    if (result.error) return result;

    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return result;
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
