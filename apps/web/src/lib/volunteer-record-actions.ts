"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import { parseDateOnly } from "@/lib/date-only";
import {
  removeStoredFile,
  storeDocument,
} from "@/lib/data/stored-documents";
import {
  isVolunteerFileType,
  parseTrainingRecordInput,
} from "@/lib/training-records";

/**
 * What staff write onto one volunteer's record by hand: scanned forms (MoJ,
 * police vetting, training sign-off sheets) and training completed outside a
 * scheduled session.
 *
 * Training and safety sign-offs stay on paper by design - the person who ran
 * the training ticks the sheet, and the scan is the evidence. A tick in the app
 * would be one more thing for staff to re-check.
 */

type Result = { error?: string; success?: boolean };

/** The volunteer record, the volunteer's own training and their profile. */
function revalidateRecord(userId: string) {
  revalidatePath(`/staff/volunteers/${userId}`);
  revalidatePath("/training");
  revalidatePath("/profile");
}

async function findVolunteer(userId: string) {
  return getDb().volunteerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

/** A file, if one was actually chosen - an empty file input posts a 0-byte blob. */
function chosenFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 && value.name ? value : null;
}

// ─── Files ──────────────────────────────────────────────

export async function attachVolunteerFile(
  userId: string,
  formData: FormData
): Promise<Result> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const type = String(formData.get("type") ?? "");
  if (!isVolunteerFileType(type)) {
    return { error: "Choose what kind of file this is." };
  }
  const file = chosenFile(formData.get("file"));
  if (!file) return { error: "Choose a file to attach." };

  const volunteer = await findVolunteer(userId);
  if (!volunteer) return { error: "This person has no volunteer record yet." };

  const stored = await storeDocument({
    file,
    type,
    volunteerId: volunteer.id,
    uploadedById: session.user.id,
  });
  if (!stored.ok) return { error: stored.error };

  revalidateRecord(userId);
  return { success: true };
}

/**
 * Removes a file from a volunteer's record. A training record it was the scan
 * for stays - the training still happened - and simply loses its attachment.
 */
export async function removeVolunteerFile(
  userId: string,
  documentId: string
): Promise<Result> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileUrl: true, volunteer: { select: { userId: true } } },
  });
  // Scoped to this volunteer, so the action can't be pointed at a policy.
  if (!doc || doc.volunteer?.userId !== userId) {
    return { error: "That file is no longer on this record." };
  }

  try {
    await db.document.delete({ where: { id: doc.id } });
  } catch (err) {
    console.error("removeVolunteerFile: could not delete the row", err);
    return { error: "Something went wrong. Please try again." };
  }
  await removeStoredFile(doc.fileUrl);

  revalidateRecord(userId);
  return { success: true };
}

// ─── Training records ───────────────────────────────────

/**
 * Records training someone completed - the type, the day it was signed off, an
 * optional note, and optionally the scanned sheet, which is stored as a
 * `TRAINING_RECORD` file on their record in the same step.
 */
export async function recordVolunteerTraining(
  userId: string,
  formData: FormData
): Promise<Result> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const parsed = parseTrainingRecordInput({
    typeId: formData.get("typeId"),
    completedOn: formData.get("completedOn"),
    note: formData.get("note"),
  });
  if (!parsed.ok) return { error: parsed.error };
  const { typeId, completedOn, note } = parsed.value;

  const db = getDb();
  const [volunteer, type] = await Promise.all([
    findVolunteer(userId),
    db.trainingType.findUnique({
      where: { id: typeId },
      select: { isArchived: true },
    }),
  ]);
  if (!volunteer) return { error: "This person has no volunteer record yet." };
  if (!type || type.isArchived) {
    return { error: "That training type is no longer offered. Choose another." };
  }

  const record = {
    volunteerId: volunteer.id,
    typeId,
    completedOn: parseDateOnly(completedOn),
    note,
    recordedById: session.user.id,
  };

  const file = chosenFile(formData.get("file"));
  if (file) {
    const stored = await storeDocument({
      file,
      type: "TRAINING_RECORD",
      volunteerId: volunteer.id,
      uploadedById: session.user.id,
      afterCreate: async (tx, documentId) => {
        await tx.trainingRecord.create({ data: { ...record, documentId } });
      },
    });
    if (!stored.ok) return { error: stored.error };
  } else {
    try {
      await db.trainingRecord.create({ data: record });
    } catch (err) {
      console.error("recordVolunteerTraining: could not save", err);
      return { error: "Something went wrong. Please try again." };
    }
  }

  revalidateRecord(userId);
  return { success: true };
}

/**
 * Removes a training record written in error, together with the scan that was
 * attached to it - the sheet belonged to the mistake.
 */
export async function removeTrainingRecord(
  userId: string,
  recordId: string
): Promise<Result> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const record = await db.trainingRecord.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      volunteer: { select: { userId: true } },
      document: { select: { id: true, fileUrl: true } },
    },
  });
  if (!record || record.volunteer.userId !== userId) {
    return { error: "That training record is no longer on this record." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.trainingRecord.delete({ where: { id: record.id } });
      if (record.document) {
        await tx.document.delete({ where: { id: record.document.id } });
      }
    });
  } catch (err) {
    console.error("removeTrainingRecord: could not delete", err);
    return { error: "Something went wrong. Please try again." };
  }
  if (record.document) await removeStoredFile(record.document.fileUrl);

  revalidateRecord(userId);
  return { success: true };
}
