import { getDb } from "@/lib/db";
import { startOfTodayInAppZone } from "@/lib/date-only";
import { newestFirst } from "@/lib/training-records";
import { revalidatePath } from "next/cache";
import type { MutationResult } from "./volunteer-shifts";

// ─── Types ──────────────────────────────────────────────

/**
 * A training type as the UI needs it: `key` picks the badge colour and stays
 * stable across renames, `name` is what people read.
 */
export type TrainingTypeRef = {
  key: string;
  name: string;
};

export type VolunteerTrainingSession = {
  id: string;
  type: TrainingTypeRef;
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

export type TrainingHistoryItem = {
  id: string;
  type: TrainingTypeRef;
  title: string;
  date: Date;
  /**
   * The attendance status of a session. A recorded item is always `ATTENDED`:
   * it records training that was completed, and that is what every reader
   * (the mobile readiness hero included) already counts as done.
   */
  status: string;
  /**
   * `SESSION` - a scheduled session they booked or attended.
   * `RECORD` - training signed off on paper and written onto their record by
   * staff (a `TrainingRecord`).
   */
  source: "SESSION" | "RECORD";
  /** Staff-only detail of a recorded item. Always null outside the staff view. */
  record: {
    note: string | null;
    recordedByName: string | null;
    /** The scanned sign-off sheet, when one was attached. */
    document: { id: string; fileName: string } | null;
  } | null;
};

// ─── Reads ──────────────────────────────────────────────

/** Everything a session read needs from its type — nothing more. */
const typeSelect = { select: { key: true, name: true } } as const;

type SessionWithAttendances = {
  id: string;
  type: TrainingTypeRef;
  title: string;
  description: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string | null;
  attendances: { id: string; volunteerId: string; status: string }[];
};

function toVolunteerSession(
  ts: SessionWithAttendances,
  volunteerId: string | null
): VolunteerTrainingSession {
  const userAttendance = volunteerId
    ? ts.attendances.find((a) => a.volunteerId === volunteerId)
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
}

export async function getAvailableTrainingForUser(
  userId: string
): Promise<VolunteerTrainingSession[]> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
  });

  // Training days carry no time, so today's session is still open today.
  const now = startOfTodayInAppZone();

  const sessions = await db.trainingSession.findMany({
    where: {
      date: { gte: now },
    },
    include: {
      type: typeSelect,
      attendances: {
        where: { status: { in: ["REGISTERED", "ATTENDED"] } },
        select: { id: true, volunteerId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return sessions.map((ts) => toVolunteerSession(ts, profile?.id ?? null));
}

export async function getTrainingSessionForUser(
  userId: string,
  sessionId: string
): Promise<VolunteerTrainingSession | null> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
  });

  const ts = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      type: typeSelect,
      attendances: {
        where: { status: { in: ["REGISTERED", "ATTENDED"] } },
        select: { id: true, volunteerId: true, status: true },
      },
    },
  });

  return ts ? toVolunteerSession(ts, profile?.id ?? null) : null;
}

/**
 * Everything someone has done or booked, newest first: the sessions they were
 * on and the training staff recorded for them by hand. The staff-only detail
 * of a recorded item (note, who wrote it, the scan) is read only `forStaff`, so
 * it never reaches the volunteer's own pages or the mobile API.
 */
export async function getTrainingHistoryForUser(
  userId: string,
  { forStaff = false }: { forStaff?: boolean } = {}
): Promise<TrainingHistoryItem[]> {
  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return [];

  const [attendances, records] = await Promise.all([
    db.trainingAttendance.findMany({
      where: { volunteerId: profile.id },
      include: {
        session: {
          select: { id: true, type: typeSelect, title: true, date: true },
        },
      },
    }),
    db.trainingRecord.findMany({
      where: { volunteerId: profile.id },
      select: {
        id: true,
        completedOn: true,
        note: true,
        type: typeSelect,
        recordedBy: { select: { name: true } },
        document: { select: { id: true, fileName: true } },
      },
    }),
  ]);

  return newestFirst<TrainingHistoryItem>([
    ...attendances.map((a) => ({
      id: a.id,
      type: a.session.type,
      title: a.session.title,
      date: a.session.date,
      status: a.status,
      source: "SESSION" as const,
      record: null,
    })),
    ...records.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.type.name,
      date: r.completedOn,
      status: "ATTENDED",
      source: "RECORD" as const,
      record: forStaff
        ? {
            note: r.note,
            recordedByName: r.recordedBy?.name ?? null,
            document: r.document,
          }
        : null,
    })),
  ]);
}

// ─── Mutations ──────────────────────────────────────────

export async function registerForTrainingAsUser(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
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
  if (ts.date < startOfTodayInAppZone()) return { error: "This session has already passed." };
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

export async function cancelTrainingRegistrationAsUser(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
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

  if (attendance.session.date < startOfTodayInAppZone()) {
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
