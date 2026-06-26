"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────

export type StaffTrainingSession = {
  id: string;
  type: string;
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

export type VolunteerTrainingSession = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string | null;
  registeredCount: number;
  userAttendanceId: string | null;
  userAttendanceStatus: string | null;
};

export type CreateTrainingData = {
  type: string;
  title: string;
  description?: string;
  date: string; // ISO
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

  if (!data.title || !data.date || !data.startTime || !data.endTime || !data.type) {
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
    const ts = await db.trainingSession.create({
      data: {
        type: data.type as "INDUCTION" | "DE_ESCALATION" | "HEALTH_SAFETY" | "OTHER",
        title: data.title,
        description: data.description || null,
        date: new Date(data.date),
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

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });

  const now = new Date();

  const sessions = await db.trainingSession.findMany({
    where: {
      date: { gte: now },
    },
    include: {
      attendances: {
        where: { status: { in: ["REGISTERED", "ATTENDED"] } },
        select: {
          id: true,
          volunteerId: true,
          status: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return sessions.map((ts) => {
    const userAttendance = profile
      ? ts.attendances.find((a) => a.volunteerId === profile.id)
      : null;

    return {
      id: ts.id,
      type: ts.type,
      title: ts.title,
      description: ts.description,
      date: ts.date,
      startTime: ts.startTime,
      endTime: ts.endTime,
      capacity: ts.capacity,
      location: ts.location,
      registeredCount: ts.attendances.length,
      userAttendanceId: userAttendance?.id ?? null,
      userAttendanceStatus: userAttendance?.status ?? null,
    };
  });
}

export async function registerForTraining(
  sessionId: string
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
      error: "Your application must be approved before registering for training.",
    };
  }

  const ts = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      attendances: {
        where: { status: { in: ["REGISTERED", "ATTENDED"] } },
      },
    },
  });

  if (!ts) return { error: "Training session not found." };
  if (ts.date < new Date()) return { error: "This session has already passed." };
  if (ts.attendances.length >= ts.capacity) {
    return { error: "This session is full." };
  }

  const existing = await db.trainingAttendance.findUnique({
    where: {
      sessionId_volunteerId: {
        sessionId,
        volunteerId: profile.id,
      },
    },
  });

  if (existing && existing.status === "REGISTERED") {
    return { error: "You are already registered for this session." };
  }

  try {
    if (existing && existing.status === "CANCELLED") {
      await db.trainingAttendance.update({
        where: { id: existing.id },
        data: { status: "REGISTERED" },
      });
    } else {
      await db.trainingAttendance.create({
        data: {
          sessionId,
          volunteerId: profile.id,
          status: "REGISTERED",
        },
      });
    }

    revalidatePath("/training");
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function cancelTrainingRegistration(
  sessionId: string
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

  const attendance = await db.trainingAttendance.findUnique({
    where: {
      sessionId_volunteerId: {
        sessionId,
        volunteerId: profile.id,
      },
    },
    include: { session: true },
  });

  if (!attendance || attendance.status !== "REGISTERED") {
    return { error: "No active registration found for this session." };
  }

  if (attendance.session.date < new Date()) {
    return { error: "Cannot cancel a session that has already passed." };
  }

  try {
    await db.trainingAttendance.update({
      where: { id: attendance.id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/training");
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Training History (for profile) ─────────────────────

export type TrainingHistoryItem = {
  id: string;
  type: string;
  title: string;
  date: Date;
  status: string;
};

export async function getVolunteerTrainingHistory(): Promise<TrainingHistoryItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return [];

  const attendances = await db.trainingAttendance.findMany({
    where: { volunteerId: profile.id },
    include: {
      session: {
        select: { id: true, type: true, title: true, date: true },
      },
    },
    orderBy: { session: { date: "desc" } },
  });

  return attendances.map((a) => ({
    id: a.id,
    type: a.session.type,
    title: a.session.title,
    date: a.session.date,
    status: a.status,
  }));
}
