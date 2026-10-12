"use server";

import { after, connection } from "next/server";
import { z } from "zod";
import { requireActiveSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import { formatTimeRange, personName } from "@/lib/format";
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
import {
  dateOnlyOf,
  safeParseDateOnly,
  todayInAppZone,
} from "@/lib/date-only";
import { decideStaffRoster, staffRemovalError } from "@/lib/shift-roster";
import { closedDayMessage, findClosedDay } from "@/lib/data/closed-days";
import { scheduleRosterTopUp } from "@/lib/data/shift-patterns";
import { formatHoldUntil, type OfferStatus } from "@/lib/shift-offers";
import type { GroupChip } from "@/lib/volunteer-groups";
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
  /** Null once the coordinator who rostered it has deleted their account. */
  createdBy: { name: string | null } | null;
  /** The repeating shift this day came from, if any. */
  pattern: { id: string; weekdays: number[]; interval: number } | null;
  mealsServed: number | null;
  mealsRecordedAt: Date | null;
  mealsRecordedBy: { name: string | null } | null;
  signups: {
    id: string;
    status: string;
    volunteer: RosterVolunteer;
  }[];
  offers: {
    id: string;
    status: OfferStatus;
    respondedAt: Date | null;
    volunteer: RosterVolunteer;
  }[];
};

/** A volunteer as they appear on a shift's roster. */
export type RosterVolunteer = {
  id: string;
  phone: string | null;
  user: { name: string | null; email: string | null; isOffline: boolean };
  groups: GroupChip[];
};

/** A volunteer who can be offered or rostered on a shift, for the pickers. */
export type VolunteerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isOffline: boolean;
  groups: GroupChip[];
};

// Groups ride along with every volunteer a coordinator sees on a shift, so the
// roster answers "is a team leader on tonight?" without a second lookup.
const VOLUNTEER_GROUPS_SELECT = {
  where: { isArchived: false },
  orderBy: { name: "asc" },
  select: { id: true, name: true, tone: true },
} as const;

const ROSTER_VOLUNTEER_SELECT = {
  select: {
    id: true,
    phone: true,
    user: { select: { name: true, email: true, isOffline: true } },
    groups: VOLUNTEER_GROUPS_SELECT,
  },
} as const;

const PATTERN_SELECT = {
  select: { id: true, weekdays: true, interval: true },
} as const;

// ─── Volunteer Actions ──────────────────────────────────

export async function getAvailableShifts(
  filters?: ShiftFilters
): Promise<ShiftWithDetails[]> {
  await connection();
  const session = await requireActiveSession();
  if (!session?.user?.id) return [];

  return getAvailableShiftsForUser(session.user.id, filters);
}

export async function signUpForShift(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireActiveSession();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return signUpForShiftAsUser(session.user.id, shiftId);
}

export async function cancelShiftSignup(
  shiftId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return [];
  }

  scheduleRosterTopUp();
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
      pattern: PATTERN_SELECT,
      signups: {
        where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
        select: {
          id: true,
          status: true,
          volunteer: ROSTER_VOLUNTEER_SELECT,
        },
      },
      offers: {
        select: {
          id: true,
          status: true,
          respondedAt: true,
          volunteer: ROSTER_VOLUNTEER_SELECT,
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
  const session = await requireActiveSession();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return [];
  }

  const db = getDb();
  const profiles = await db.volunteerProfile.findMany({
    where: { status: "ACTIVE", user: { status: "ACTIVE" } },
    select: {
      id: true,
      phone: true,
      user: { select: { name: true, email: true, isOffline: true } },
      groups: VOLUNTEER_GROUPS_SELECT,
    },
    orderBy: { user: { name: "asc" } },
  });

  return profiles.map((profile) => ({
    id: profile.id,
    name: personName(profile.user),
    email: profile.user.email,
    phone: profile.phone,
    isOffline: profile.user.isOffline,
    groups: profile.groups,
  }));
}

export async function getShiftDetail(shiftId: string): Promise<StaffShift | null> {
  const session = await requireActiveSession();
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
      pattern: PATTERN_SELECT,
      signups: {
        select: {
          id: true,
          status: true,
          volunteer: ROSTER_VOLUNTEER_SELECT,
        },
        orderBy: { signedUpAt: "asc" },
      },
      offers: {
        select: {
          id: true,
          status: true,
          respondedAt: true,
          volunteer: ROSTER_VOLUNTEER_SELECT,
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
  const session = await requireActiveSession();
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

  const closure = await findClosedDay(db, fields.date);
  if (closure) return { error: closedDayMessage(closure) };

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
  const session = await requireActiveSession();
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

    // Moving a shift onto a closed day would roster people for a locked door.
    if (dateOnlyOf(fields.date) !== dateOnlyOf(existing.date)) {
      const closure = await findClosedDay(db, fields.date);
      if (closure) return { error: closedDayMessage(closure) };
    }

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

// ─── Staff Rostering ───────────────────────────────────

/** Prisma's serialization failure, which a racing capacity check produces. */
function isSerializationFailure(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "P2034" || code === "40001";
}

class RosterRefused extends Error {}

/**
 * Puts a named volunteer on a shift - a regular, someone who rang in, or an
 * offline volunteer who never uses the app. On a shift that has already
 * happened they go straight on as attended, which is how their hours are
 * logged. Overrides a first-refusal hold, but never overfills.
 */
export async function addVolunteerToShift(
  shiftId: string,
  volunteerId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireActiveSession();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }
  const staffId = session.user.id;

  const db = getDb();
  const today = todayInAppZone();

  const attempt = () =>
    db.$transaction(
      async (tx) => {
        const [shift, volunteer, existing] = await Promise.all([
          tx.shift.findUnique({
            where: { id: shiftId },
            select: {
              date: true,
              startTime: true,
              endTime: true,
              capacity: true,
              serviceArea: { select: { name: true } },
              _count: {
                select: {
                  signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } },
                },
              },
            },
          }),
          tx.volunteerProfile.findUnique({
            where: { id: volunteerId },
            select: { status: true, userId: true, user: { select: { status: true } } },
          }),
          tx.shiftSignup.findUnique({
            where: { shiftId_volunteerId: { shiftId, volunteerId } },
            select: { id: true, status: true },
          }),
        ]);

        if (!shift) throw new RosterRefused("Shift not found.");
        if (!volunteer) throw new RosterRefused("Volunteer not found.");

        const decision = decideStaffRoster({
          shiftDate: dateOnlyOf(shift.date),
          today,
          capacity: shift.capacity,
          seatedCount: shift._count.signups,
          existingStatus: existing?.status ?? null,
          volunteerIsActive:
            volunteer.status === "ACTIVE" && volunteer.user.status === "ACTIVE",
        });
        if (decision.action === "reject") throw new RosterRefused(decision.error);

        const attendance =
          decision.status === "ATTENDED"
            ? { attendanceMarkedById: staffId, attendanceMarkedAt: new Date() }
            : { attendanceMarkedById: null, attendanceMarkedAt: null };

        if (existing) {
          await tx.shiftSignup.update({
            where: { id: existing.id },
            data: { status: decision.status, signedUpAt: new Date(), ...attendance },
          });
        } else {
          await tx.shiftSignup.create({
            data: { shiftId, volunteerId, status: decision.status, ...attendance },
          });
        }

        // Being rostered answers any offer that was waiting on them.
        await tx.shiftOffer.updateMany({
          where: { shiftId, volunteerId, status: "PENDING" },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });

        return { shift, userId: volunteer.userId, status: decision.status };
      },
      { isolationLevel: "Serializable" }
    );

  let placed: Awaited<ReturnType<typeof attempt>>;
  try {
    try {
      placed = await attempt();
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      placed = await attempt();
    }
  } catch (error) {
    if (error instanceof RosterRefused) return { error: error.message };
    console.error("addVolunteerToShift failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  if (placed.status === "SIGNED_UP") {
    const { shift, userId } = placed;
    after(() =>
      sendPushToUsers([userId], {
        title: "You're on the roster",
        body: `${shift.serviceArea.name} on ${formatShiftDay(shift.date)}, ${formatTimeRange(shift.startTime, shift.endTime)}.`,
        data: { url: `/shift/${shiftId}` },
      })
    );
  }

  revalidateShift(shiftId);
  return { success: true };
}

/** Takes a volunteer off a shift they're still expected on. */
export async function removeVolunteerFromShift(
  signupId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireActiveSession();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const db = getDb();
  const signup = await db.shiftSignup.findUnique({
    where: { id: signupId },
    select: {
      status: true,
      shiftId: true,
      volunteerId: true,
      volunteer: { select: { userId: true } },
      shift: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
          serviceArea: { select: { name: true } },
        },
      },
    },
  });
  if (!signup) return { error: "They're not on this shift any more." };

  const refusal = staffRemovalError(signup.status);
  if (refusal) return { error: refusal };

  try {
    await db.$transaction([
      db.shiftSignup.update({
        where: { id: signupId },
        data: { status: "CANCELLED" },
      }),
      // As when a volunteer cancels: a hold handed back must not stay closed.
      db.shiftOffer.updateMany({
        where: {
          shiftId: signup.shiftId,
          volunteerId: signup.volunteerId,
          status: "ACCEPTED",
        },
        data: { status: "DECLINED", respondedAt: new Date() },
      }),
    ]);
  } catch (error) {
    console.error("removeVolunteerFromShift failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  if (dateOnlyOf(signup.shift.date) >= todayInAppZone()) {
    const { shift } = signup;
    after(() =>
      sendPushToUsers([signup.volunteer.userId], {
        title: "You've been taken off a shift",
        body: `${shift.serviceArea.name} on ${formatShiftDay(shift.date)}, ${formatTimeRange(shift.startTime, shift.endTime)}. Talk to the kitchen if that's a surprise.`,
        data: { url: "/schedule" },
      })
    );
  }

  revalidateShift(signup.shiftId);
  return { success: true };
}

function revalidateShift(shiftId: string) {
  revalidatePath(`/staff/shifts/${shiftId}`);
  revalidatePath("/staff/shifts");
  revalidatePath("/staff/calendar");
  revalidatePath("/staff/volunteers");
  revalidatePath("/shifts");
  revalidatePath("/dashboard");
  revalidatePath("/hours");
}

// ─── Attendance Actions ────────────────────────────────

export async function markAttendance(
  signupId: string,
  status: "ATTENDED" | "NO_SHOW"
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
