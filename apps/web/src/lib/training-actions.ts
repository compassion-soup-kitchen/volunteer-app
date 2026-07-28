"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { safeParseDateOnly } from "@/lib/date-only";
import { revalidatePath } from "next/cache";

import {
  cancelTrainingRegistrationAsUser,
  getAvailableTrainingForUser,
  getTrainingHistoryForUser,
  registerForTrainingAsUser,
  type TrainingHistoryItem,
  type TrainingTypeRef,
  type VolunteerTrainingSession,
} from "@/lib/data/volunteer-training";

export type {
  VolunteerTrainingSession,
  TrainingHistoryItem,
  TrainingTypeRef,
} from "@/lib/data/volunteer-training";

// ─── Types ──────────────────────────────────────────────

export type StaffTrainingSession = {
  id: string;
  type: TrainingTypeRef;
  title: string;
  description: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string | null;
  createdBy: { name: string | null };
  attendances: {
    id: string;
    status: string;
    volunteer: {
      id: string;
      user: { name: string | null; email: string };
    };
  }[];
};

export type CreateTrainingData = {
  /** `TrainingType.id` — types are rows now, not enum members. */
  typeId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  capacity: number;
  location?: string;
};

// ─── Staff Actions ──────────────────────────────────────

export async function getStaffTrainingSessions(): Promise<StaffTrainingSession[]> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return [];
  }

  const db = getDb();
  return db.trainingSession.findMany({
    include: {
      type: { select: { key: true, name: true } },
      createdBy: { select: { name: true } },
      attendances: {
        where: { status: { in: ["REGISTERED", "ATTENDED"] } },
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
}

export async function getTrainingDetail(
  sessionId: string
): Promise<StaffTrainingSession | null> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return null;
  }

  const db = getDb();
  return db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      type: { select: { key: true, name: true } },
      createdBy: { select: { name: true } },
      attendances: {
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
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function createTrainingSession(
  data: CreateTrainingData
): Promise<{ error?: string; success?: boolean; sessionId?: string }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  if (!data.title || !data.startTime || !data.endTime || !data.typeId) {
    return { error: "All fields are required." };
  }

  const date = safeParseDateOnly(data.date);
  if (!date) return { error: "Please select a date." };

  if (data.capacity < 1) {
    return { error: "Capacity must be at least 1." };
  }

  if (data.startTime >= data.endTime) {
    return { error: "End time must be after start time." };
  }

  const db = getDb();

  // Never trust the client's type id — it could name a type that has since been
  // archived or deleted, and the foreign key would fail with nothing readable.
  const type = await db.trainingType.findUnique({
    where: { id: data.typeId },
    select: { id: true, isArchived: true },
  });
  if (!type) return { error: "Please select a training type." };
  if (type.isArchived) {
    return { error: "That training type has been archived. Pick another." };
  }

  try {
    const ts = await db.trainingSession.create({
      data: {
        typeId: type.id,
        title: data.title,
        description: data.description || null,
        date,
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity,
        location: data.location || null,
        createdById: session.user.id,
      },
    });

    revalidatePath("/staff/training");
    revalidatePath("/training");
    return { success: true, sessionId: ts.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteTrainingSession(
  sessionId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role!)
  ) {
    return { error: "Not authorised." };
  }

  const db = getDb();

  const activeRegistrations = await db.trainingAttendance.count({
    where: {
      sessionId,
      status: "REGISTERED",
    },
  });

  if (activeRegistrations > 0) {
    return {
      error: `Cannot delete — ${activeRegistrations} volunteer${activeRegistrations > 1 ? "s" : ""} still registered. Cancel their registrations first.`,
    };
  }

  try {
    await db.trainingSession.delete({ where: { id: sessionId } });
    revalidatePath("/staff/training");
    revalidatePath("/training");
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function markTrainingAttendance(
  attendanceId: string,
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
  const attendance = await db.trainingAttendance.findUnique({
    where: { id: attendanceId },
  });

  if (!attendance) return { error: "Registration not found." };

  try {
    await db.trainingAttendance.update({
      where: { id: attendanceId },
      data: { status },
    });

    revalidatePath(`/staff/training/${attendance.sessionId}`);
    revalidatePath("/staff/training");
    // The volunteer's own history shows this as completed or missed.
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function markBulkTrainingAttendance(
  sessionId: string,
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
      Object.entries(attendanceMap).map(([attendanceId, status]) =>
        db.trainingAttendance.update({
          where: { id: attendanceId },
          data: { status },
        })
      )
    );

    revalidatePath(`/staff/training/${sessionId}`);
    revalidatePath("/staff/training");
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Volunteer Actions ──────────────────────────────────

export async function getAvailableTraining(): Promise<VolunteerTrainingSession[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return getAvailableTrainingForUser(session.user.id);
}

export async function registerForTraining(
  sessionId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return registerForTrainingAsUser(session.user.id, sessionId);
}

export async function cancelTrainingRegistration(
  sessionId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return cancelTrainingRegistrationAsUser(session.user.id, sessionId);
}

// ─── Training History (for profile) ─────────────────────

export async function getVolunteerTrainingHistory(): Promise<TrainingHistoryItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  return getTrainingHistoryForUser(session.user.id);
}
