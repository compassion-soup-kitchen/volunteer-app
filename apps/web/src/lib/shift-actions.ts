"use server";

import { after, connection } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import { canRecordMeals, mealsServedSchema } from "@/lib/shift-meals";
import {
  formatShiftDay,
  shouldNotifyShiftChange,
} from "@/lib/shift-notifications";
import { revalidatePath } from "next/cache";

import {
  cancelShiftSignupAsUser,
  getAvailableShiftsForUser,
  respondToShiftOfferAsUser,
  signUpForShiftAsUser,
  type ShiftFilters,
  type ShiftWithDetails,
} from "@/lib/data/volunteer-shifts";
import { safeParseDateOnly, todayInAppZone } from "@/lib/date-only";
import { formatHoldUntil, type OfferStatus } from "@/lib/shift-offers";
import {
  holdIsLive,
  parseShiftForm,
  type ShiftFormData,
} from "@/lib/shift-form";

export type {
  ShiftWithDetails,
  ShiftFilters,
} from "@/lib/data/volunteer-shifts";
export type { ShiftFormData } from "@/lib/shift-form";

// ─── Types ──────────────────────────────────────────────

export type StaffShift = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  offersCloseOn: Date | null;
  serviceArea: { id: string; name: string };
  createdBy: { name: string | null };
  mealsServed: number | null;
  mealsRecordedAt: Date | null;
  mealsRecordedBy: { name: string | null } | null;
  signups: {
    id: string;
    status: string;
    volunteer: {
      id: string;
      user: { name: string | null; email: string };
    };
  }[];
  offers: {
    id: string;
    status: OfferStatus;
    respondedAt: Date | null;
    volunteer: {
      id: string;
      user: { name: string | null; email: string };
    };
  }[];
};

/** A volunteer who can be offered a shift, for the first-refusal picker. */
export type VolunteerOption = {
  id: string;
  name: string;
  email: string;
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

/** Answer a shift offered to you ahead of everyone else. */
export async function respondToShiftOffer(
  shiftId: string,
  response: "ACCEPT" | "DECLINE"
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return respondToShiftOfferAsUser(session.user.id, shiftId, response);
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

  const fromDate = filters?.fromDate
    ? safeParseDateOnly(filters.fromDate)
    : null;
  const toDate = filters?.toDate ? safeParseDateOnly(filters.toDate) : null;

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
      mealsRecordedBy: { select: { name: true } },
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
      offers: {
        select: {
          id: true,
          status: true,
          respondedAt: true,
          volunteer: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { offeredAt: "asc" },
      },
    },
    // Upcoming reads forward from today; past reads back from the most recent.
    orderBy: [{ date: fromDate ? "asc" : "desc" }, { startTime: "asc" }],
  });

  return shifts;
}

/**
 * Active volunteers, for the first-refusal picker. Only people who can
 * actually take a shift are offerable.
 */
export async function getVolunteerOptions(): Promise<VolunteerOption[]> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return [];
  }

  const db = getDb();
  const profiles = await db.volunteerProfile.findMany({
    where: { status: "ACTIVE", user: { status: "ACTIVE" } },
    select: { id: true, user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.user.name?.trim() || profile.user.email,
    email: profile.user.email,
  }));
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
      mealsRecordedBy: { select: { name: true } },
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
      offers: {
        select: {
          id: true,
          status: true,
          respondedAt: true,
          volunteer: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { offeredAt: "asc" },
      },
    },
  });
}

/** Tells the named volunteers a shift is theirs first, if they want it. */
function notifyOffered(
  volunteerIds: string[],
  shift: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    offersCloseOn: Date | null;
    serviceArea: { name: string };
  }
) {
  // Nothing to promise if the hold has already run out — an edit can carry a
  // lapsed offer through untouched, and that must not page anyone.
  if (volunteerIds.length === 0) return;
  if (!holdIsLive(shift.offersCloseOn, todayInAppZone())) return;
  const holdUntil = formatHoldUntil(shift.offersCloseOn!);

  after(async () => {
    const db = getDb();
    const profiles = await db.volunteerProfile.findMany({
      where: { id: { in: volunteerIds } },
      select: { userId: true },
    });

    await sendPushToUsers(
      profiles.map((profile) => profile.userId),
      {
        title: "A shift is being held for you",
        body: `${shift.serviceArea.name} on ${formatShiftDay(shift.date)}, ${shift.startTime}–${shift.endTime}. Yours until ${holdUntil}.`,
        data: { url: `/shift/${shift.id}` },
      }
    );
  });
}

export async function createShift(
  data: ShiftFormData
): Promise<{ error?: string; success?: boolean; shiftId?: string }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const parsed = parseShiftForm(data, { today: todayInAppZone() });
  if (!parsed.ok) return { error: parsed.error };
  const { offeredVolunteerIds, ...fields } = parsed.value;

  const db = getDb();

  try {
    const shift = await db.shift.create({
      data: {
        ...fields,
        createdById: session.user.id,
        offers: {
          create: offeredVolunteerIds.map((volunteerId) => ({ volunteerId })),
        },
      },
      include: { serviceArea: { select: { name: true } } },
    });

    notifyOffered(offeredVolunteerIds, shift);

    revalidatePath("/staff/shifts");
    revalidatePath("/shifts");
    return { success: true, shiftId: shift.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateShift(
  shiftId: string,
  data: ShiftFormData
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
    // Read before validating: the hold already on the shift decides whether a
    // lapsed offer date is a mistake or just history being carried through.
    const existing = await db.shift.findUnique({
      where: { id: shiftId },
      select: {
        date: true,
        startTime: true,
        endTime: true,
        serviceAreaId: true,
        capacity: true,
        offersCloseOn: true,
        signups: {
          where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
          select: { status: true, volunteer: { select: { userId: true } } },
        },
        offers: { select: { volunteerId: true } },
      },
    });

    if (!existing) return { error: "Shift not found." };

    const parsed = parseShiftForm(data, {
      today: todayInAppZone(),
      existingOffersCloseOn: existing.offersCloseOn,
    });
    if (!parsed.ok) return { error: parsed.error };
    const { offeredVolunteerIds, ...fields } = parsed.value;

    // Everyone holding a spot, including those already marked attended —
    // capacity must never fall below the people the shift is committed to.
    const booked = existing.signups.length;
    if (fields.capacity < booked) {
      return {
        error: `${booked} volunteer${booked > 1 ? "s are" : " is"} already signed up — capacity can't go below that.`,
      };
    }

    // Only volunteers still expected get told the shift moved; a change to a
    // past shift's record is not news to whoever already worked it.
    const expected = existing.signups.filter((s) => s.status === "SIGNED_UP");

    const offeredBefore = new Set(existing.offers.map((o) => o.volunteerId));
    const newlyOffered = offeredVolunteerIds.filter(
      (id) => !offeredBefore.has(id)
    );

    const updated = await db.shift.update({
      where: { id: shiftId },
      data: {
        ...fields,
        offers: {
          // Volunteers taken off the list lose the offer along with any
          // answer they gave; the rest keep theirs, answered or not.
          deleteMany: { volunteerId: { notIn: offeredVolunteerIds } },
          create: newlyOffered.map((volunteerId) => ({ volunteerId })),
        },
      },
      include: { serviceArea: { select: { name: true } } },
    });

    notifyOffered(newlyOffered, updated);

    if (
      expected.length > 0 &&
      shouldNotifyShiftChange(existing, updated, new Date())
    ) {
      const userIds = expected.map((s) => s.volunteer.userId);
      after(() =>
        sendPushToUsers(userIds, {
          title: "Your shift has changed",
          body: `${updated.serviceArea.name} is now ${formatShiftDay(updated.date)}, ${updated.startTime}–${updated.endTime}.`,
          data: { url: `/shift/${shiftId}` },
        })
      );
    }

    revalidatePath("/staff/shifts");
    revalidatePath(`/staff/shifts/${shiftId}`);
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
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

// ─── Meals Actions ─────────────────────────────────────

const recordMealsInput = z.object({
  shiftId: z.string().min(1),
  mealsServed: mealsServedSchema,
});

export async function recordShiftMeals(
  shiftId: string,
  mealsServed: number
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const parsed = recordMealsInput.safeParse({ shiftId, mealsServed });
  if (!parsed.success) {
    return { error: "Please enter a whole number between 0 and 5000." };
  }

  const db = getDb();

  const shift = await db.shift.findUnique({
    where: { id: parsed.data.shiftId },
    select: { date: true },
  });

  if (!shift) return { error: "Shift not found." };

  if (!canRecordMeals(shift.date, new Date())) {
    return {
      error: "Kai can only be recorded once the shift day arrives.",
    };
  }

  try {
    await db.shift.update({
      where: { id: parsed.data.shiftId },
      data: {
        mealsServed: parsed.data.mealsServed,
        mealsRecordedAt: new Date(),
        mealsRecordedById: session.user.id,
      },
    });

    revalidatePath(`/staff/shifts/${parsed.data.shiftId}`);
    revalidatePath("/staff/shifts");
    revalidatePath("/dashboard");
    revalidatePath("/hours");
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
