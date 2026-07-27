"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  isSeededTrainingType,
  parseTrainingTypeInput,
  trainingTypeDeleteBlocker,
  trainingTypeKeyFromName,
  uniqueTrainingTypeKey,
} from "@/lib/training-types";

export type TrainingTypeOption = {
  id: string;
  key: string;
  name: string;
};

export type TrainingTypeWithStats = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  sessionCount: number;
  /** Built-in types can be renamed and archived, but never deleted. */
  isSeeded: boolean;
};

type Result = { error?: string; success?: boolean };

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

function revalidateTrainingPaths() {
  revalidatePath("/staff/training/types");
  revalidatePath("/staff/training");
  revalidatePath("/staff/training/new");
  revalidatePath("/training");
}

// ─── Reads ───────────────────────────────────────────────

/**
 * Types available when scheduling. Archived ones are left out so they stop
 * being offered, while past sessions keep showing the type they were run under.
 */
export async function getActiveTrainingTypes(): Promise<TrainingTypeOption[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  return db.trainingType.findMany({
    where: { isArchived: false },
    select: { id: true, key: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getTrainingTypesWithStats(): Promise<
  TrainingTypeWithStats[]
> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  const types = await db.trainingType.findMany({
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isArchived: true,
      _count: { select: { sessions: true } },
    },
  });

  return types.map((t) => ({
    id: t.id,
    key: t.key,
    name: t.name,
    description: t.description,
    isArchived: t.isArchived,
    sessionCount: t._count.sessions,
    isSeeded: isSeededTrainingType(t.key),
  }));
}

// ─── Mutations ───────────────────────────────────────────

export async function createTrainingType(input: {
  name: string;
  description?: string;
}): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const parsed = parseTrainingTypeInput(input);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();

  const clash = await db.trainingType.findFirst({
    where: { name: { equals: parsed.value.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (clash) {
    return { error: "A training type with this name already exists." };
  }

  const existingKeys = await db.trainingType.findMany({
    select: { key: true },
  });
  const key = uniqueTrainingTypeKey(
    trainingTypeKeyFromName(parsed.value.name),
    existingKeys.map((t) => t.key)
  );

  try {
    await db.trainingType.create({
      data: {
        key,
        name: parsed.value.name,
        description: parsed.value.description,
      },
    });
  } catch (err) {
    console.error("createTrainingType failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTrainingPaths();
  return { success: true };
}

/**
 * Renames a type or edits its blurb. The `key` is deliberately left alone —
 * it's what the mobile app and past exports match on.
 */
export async function updateTrainingType(
  id: string,
  input: { name: string; description?: string }
): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const parsed = parseTrainingTypeInput(input);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();

  const existing = await db.trainingType.findUnique({ where: { id } });
  if (!existing) return { error: "That training type no longer exists." };

  const clash = await db.trainingType.findFirst({
    where: {
      name: { equals: parsed.value.name, mode: "insensitive" },
      id: { not: id },
    },
    select: { id: true },
  });
  if (clash) {
    return { error: "A training type with this name already exists." };
  }

  try {
    await db.trainingType.update({
      where: { id },
      data: { name: parsed.value.name, description: parsed.value.description },
    });
  } catch (err) {
    console.error("updateTrainingType failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTrainingPaths();
  return { success: true };
}

/**
 * Archiving retires a type from the scheduling form without touching the
 * sessions already run under it — the counterpart to service-area archiving.
 */
export async function toggleTrainingTypeArchive(id: string): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.trainingType.findUnique({ where: { id } });
  if (!existing) return { error: "That training type no longer exists." };

  // Leaving nothing to schedule against would break the training form, so the
  // last active type stays put.
  if (!existing.isArchived) {
    const activeCount = await db.trainingType.count({
      where: { isArchived: false },
    });
    if (activeCount <= 1) {
      return {
        error:
          "This is the only active training type — add another before archiving this one.",
      };
    }
  }

  try {
    await db.trainingType.update({
      where: { id },
      data: { isArchived: !existing.isArchived },
    });
  } catch (err) {
    console.error("toggleTrainingTypeArchive failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTrainingPaths();
  return { success: true };
}

export async function deleteTrainingType(id: string): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.trainingType.findUnique({
    where: { id },
    select: { key: true, _count: { select: { sessions: true } } },
  });
  if (!existing) return { error: "That training type no longer exists." };

  const blocker = trainingTypeDeleteBlocker({
    key: existing.key,
    sessionCount: existing._count.sessions,
  });
  if (blocker) return { error: blocker };

  try {
    await db.trainingType.delete({ where: { id } });
  } catch (err) {
    console.error("deleteTrainingType failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTrainingPaths();
  return { success: true };
}
