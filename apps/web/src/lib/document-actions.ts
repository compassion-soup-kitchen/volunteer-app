"use server";

import { DocumentType } from "@prisma/client";
import type { AgreementType } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
  isStorageConfigured,
} from "@/lib/storage";
import { buildStorageKey, checkUploadFile } from "@/lib/uploads";
import { STAFF_ROLES } from "@/lib/role-change";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────

export type AgreementOverview = {
  agreementType: string;
  title: string;
  version: string;
  updatedAt: Date;
  totalVolunteers: number;
  signedCurrentCount: number;
  signedOutdatedCount: number;
  unsignedCount: number;
  requiresReAck: boolean;
  reAckSetAt: Date | null;
  pendingReAckCount: number;
};

export type AgreementDetail = {
  agreementType: string;
  title: string;
  content: string;
  version: string;
  updatedAt: Date;
  volunteers: {
    id: string;
    userName: string;
    userEmail: string;
    signedVersion: string | null;
    signedAt: Date | null;
    isCurrent: boolean;
  }[];
};

export type VolunteerAgreementStatus = {
  agreementType: string;
  title: string;
  content: string;
  currentVersion: string;
  signedVersion: string | null;
  signedAt: Date | null;
  signatureData: string | null;
  needsResign: boolean;
};

export type UploadedDocument = {
  id: string;
  type: string;
  fileName: string;
  uploadedAt: Date;
  uploadedByName: string | null;
};

// ─── Staff: Agreement Overview ──────────────────────────

export async function getAgreementOverview(): Promise<AgreementOverview[]> {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();

  // Get all templates
  const templates = await db.agreementTemplate.findMany({
    orderBy: { agreementType: "asc" },
  });

  // Get total active volunteers (excluding staff — a directly-promoted
  // COORDINATOR/ADMIN shouldn't inflate the re-acknowledgement denominator).
  const totalVolunteers = await db.volunteerProfile.count({
    where: {
      status: { in: ["ACTIVE", "APPROVED_FOR_INDUCTION"] },
      user: { role: { notIn: STAFF_ROLES } },
    },
  });

  // Get all signed agreements grouped (ordered so first per volunteer is latest)
  const signedAgreements = await db.signedAgreement.findMany({
    orderBy: { signedAt: "desc" },
    select: {
      agreementType: true,
      documentVersion: true,
      signedAt: true,
      volunteerId: true,
    },
  });

  return templates.map((template) => {
    const signed = signedAgreements.filter(
      (sa) => sa.agreementType === template.agreementType
    );
    // Deduplicate by volunteer — keep latest signature only
    const byVolunteer = new Map<
      string,
      { documentVersion: string | null; signedAt: Date }
    >();
    for (const sa of signed) {
      if (!byVolunteer.has(sa.volunteerId)) {
        byVolunteer.set(sa.volunteerId, {
          documentVersion: sa.documentVersion,
          signedAt: sa.signedAt,
        });
      }
    }

    const latestPerVolunteer = Array.from(byVolunteer.values());
    const signedCurrentCount = latestPerVolunteer.filter(
      (v) => v.documentVersion === template.version
    ).length;
    const signedOutdatedCount = latestPerVolunteer.filter(
      (v) => v.documentVersion && v.documentVersion !== template.version
    ).length;

    // Pending re-ack: admin marked requiresReAck and a volunteer's latest
    // signature predates the re-ack flag (or they've never signed)
    const pendingReAckCount =
      template.requiresReAck && template.reAckSetAt
        ? totalVolunteers -
          latestPerVolunteer.filter(
            (v) => v.signedAt >= template.reAckSetAt!
          ).length
        : 0;

    return {
      agreementType: template.agreementType,
      title: template.title,
      version: template.version,
      updatedAt: template.updatedAt,
      totalVolunteers,
      signedCurrentCount,
      signedOutdatedCount,
      unsignedCount: totalVolunteers - signedCurrentCount - signedOutdatedCount,
      requiresReAck: template.requiresReAck,
      reAckSetAt: template.reAckSetAt,
      pendingReAckCount,
    };
  });
}

// ─── Staff: Toggle Re-Acknowledgment Requirement ────────

export async function setAgreementReAckRequired(
  agreementType: string,
  required: boolean
) {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();

  await db.agreementTemplate.update({
    where: { agreementType: agreementType as AgreementType },
    data: {
      requiresReAck: required,
      // Stamp the moment re-ack was required so signatures predating it
      // count as needing re-sign. Clearing the flag leaves the timestamp
      // alone — re-enabling later resets it.
      ...(required ? { reAckSetAt: new Date(), reAckSetById: session.user.id } : {}),
    },
  });

  revalidatePath("/staff/documents");
  revalidatePath("/staff/documents/" + agreementType);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

// ─── Staff: Agreement Detail ────────────────────────────

export async function getAgreementDetail(
  agreementType: string
): Promise<AgreementDetail | null> {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();

  const template = await db.agreementTemplate.findUnique({
    where: { agreementType: agreementType as AgreementType },
  });

  if (!template) return null;

  // Get all active volunteers with their signing status for this type
  // (excluding staff, to match the totalVolunteers denominator above).
  const volunteers = await db.volunteerProfile.findMany({
    where: {
      status: { in: ["ACTIVE", "APPROVED_FOR_INDUCTION"] },
      user: { role: { notIn: STAFF_ROLES } },
    },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
      signedAgreements: {
        where: { agreementType: agreementType as AgreementType },
        orderBy: { signedAt: "desc" },
        take: 1,
        select: {
          documentVersion: true,
          signedAt: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return {
    agreementType: template.agreementType,
    title: template.title,
    content: template.content,
    version: template.version,
    updatedAt: template.updatedAt,
    volunteers: volunteers.map((v) => {
      const latest = v.signedAgreements[0];
      return {
        id: v.id,
        userName: v.user.name || "—",
        userEmail: v.user.email,
        signedVersion: latest?.documentVersion || null,
        signedAt: latest?.signedAt || null,
        isCurrent: latest?.documentVersion === template.version,
      };
    }),
  };
}

// ─── Staff: Update Agreement Template ───────────────────

export async function updateAgreementTemplate(
  agreementType: string,
  data: { title: string; content: string; version: string }
) {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();

  await db.agreementTemplate.update({
    where: { agreementType: agreementType as AgreementType },
    data: {
      title: data.title,
      content: data.content,
      version: data.version,
      updatedById: session.user.id,
    },
  });

  revalidatePath("/staff/documents");
  revalidatePath("/staff/documents/" + agreementType);
  revalidatePath("/documents");
}

// ─── Volunteer: Get Agreement Statuses ──────────────────

export async function getVolunteerAgreementStatuses(): Promise<
  VolunteerAgreementStatus[]
> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      signedAgreements: {
        orderBy: { signedAt: "desc" },
        select: {
          agreementType: true,
          documentVersion: true,
          signedAt: true,
          signatureData: true,
        },
      },
    },
  });

  if (!profile) return [];

  const templates = await db.agreementTemplate.findMany({
    orderBy: { agreementType: "asc" },
  });

  return templates.map((template) => {
    // Find the latest signed agreement of this type
    const latest = profile.signedAgreements.find(
      (sa) => sa.agreementType === template.agreementType
    );

    // Re-ack is needed if:
    //   - never signed before, OR
    //   - admin has flagged this template as requiring re-ack AND the latest
    //     signature predates the admin's re-ack flag
    const needsResign =
      !latest ||
      (template.requiresReAck &&
        !!template.reAckSetAt &&
        latest.signedAt < template.reAckSetAt);

    return {
      agreementType: template.agreementType,
      title: template.title,
      content: template.content,
      currentVersion: template.version,
      signedVersion: latest?.documentVersion || null,
      signedAt: latest?.signedAt || null,
      signatureData: latest?.signatureData || null,
      needsResign,
    };
  });
}

// ─── Volunteer: Re-sign Agreement ───────────────────────

export async function resignAgreement(
  agreementType: string,
  signatureData: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) throw new Error("No volunteer profile found");

  const template = await db.agreementTemplate.findUnique({
    where: { agreementType: agreementType as AgreementType },
  });

  if (!template) throw new Error("Agreement template not found");

  // Create a new signed agreement record (keeps history)
  await db.signedAgreement.create({
    data: {
      volunteerId: profile.id,
      agreementType: agreementType as AgreementType,
      signatureData,
      documentVersion: template.version,
    },
  });

  revalidatePath("/documents");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/staff/documents");
}

// ─── Dashboard: Check if re-signing needed ──────────────

export async function getPendingResignCount(): Promise<number> {
  const session = await auth();
  if (!session?.user) return 0;

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      signedAgreements: {
        orderBy: { signedAt: "desc" },
        select: {
          agreementType: true,
          signedAt: true,
        },
      },
    },
  });

  if (!profile) return 0;

  const templates = await db.agreementTemplate.findMany();

  let count = 0;
  for (const template of templates) {
    const latest = profile.signedAgreements.find(
      (sa) => sa.agreementType === template.agreementType
    );
    if (
      !latest ||
      (template.requiresReAck &&
        !!template.reAckSetAt &&
        latest.signedAt < template.reAckSetAt)
    ) {
      count++;
    }
  }

  return count;
}

// ─── Staff: Upload Document ─────────────────────────────

const uploadDocumentSchema = z.object({
  type: z.enum(DocumentType),
  file: z.instanceof(File),
});

/**
 * Stores a policy or training document.
 *
 * Returns its failures rather than throwing: an uncaught throw in a Server
 * Action reaches the browser as an opaque "unexpected error", which is exactly
 * what made a too-large upload impossible to diagnose from the UI.
 */
export async function uploadDocument(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    return { error: "Not authorised." };
  }

  if (!isStorageConfigured()) {
    console.error("uploadDocument: S3 storage env vars are not configured");
    return {
      error:
        "File storage isn't set up on the server yet. Let your administrator know.",
    };
  }

  const parsed = uploadDocumentSchema.safeParse({
    file: formData.get("file"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { error: "Choose a file and a document type." };
  }
  const { file, type } = parsed.data;

  const rejection = checkUploadFile(file);
  if (rejection) return { error: rejection };

  const db = getDb();
  const storagePath = buildStorageKey(type.toLowerCase(), file.name, Date.now());

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(storagePath, buffer, file.type);
  } catch (err) {
    console.error("uploadDocument: storage upload failed", err);
    return { error: "The upload didn't reach storage. Please try again." };
  }

  try {
    await db.document.create({
      data: {
        type,
        fileName: file.name,
        fileUrl: storagePath,
        uploadedById: session.user.id,
      },
    });
  } catch (err) {
    // The bytes are in the bucket but the row isn't — drop the orphan so the
    // key doesn't linger unreferenced.
    console.error("uploadDocument: could not record the document", err);
    await deleteFile(storagePath).catch(() => {});
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/staff/documents");
  revalidatePath("/documents");
  return { success: true };
}

// ─── Staff: Get Uploaded Documents ──────────────────────

export async function getUploadedDocuments(): Promise<UploadedDocument[]> {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();

  const docs = await db.document.findMany({
    where: { volunteerId: null }, // org-level documents only
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      type: true,
      fileName: true,
      uploadedAt: true,
      uploadedBy: { select: { name: true } },
    },
  });

  return docs.map((d) => ({
    id: d.id,
    type: d.type,
    fileName: d.fileName,
    uploadedAt: d.uploadedAt,
    uploadedByName: d.uploadedBy?.name || null,
  }));
}

// ─── Get Document Download URL ──────────────────────────

export async function getDocumentDownloadUrl(
  documentId: string
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const db = getDb();

  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { fileUrl: true, volunteerId: true, type: true },
  });

  if (!doc) return null;

  // Staff can download anything; everyone else only their own documents or
  // org-level material that volunteers are meant to see (policies, training).
  if (!["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    if (doc.volunteerId) {
      const profile = await db.volunteerProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (profile?.id !== doc.volunteerId) throw new Error("Unauthorized");
    } else if (!["POLICY", "TRAINING_MATERIAL"].includes(doc.type)) {
      throw new Error("Unauthorized");
    }
  }

  try {
    return await getSignedDownloadUrl(doc.fileUrl, 60 * 5); // 5 min expiry
  } catch {
    return null;
  }
}

// ─── Staff: Delete Document ─────────────────────────────

export async function deleteDocument(
  documentId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    return { error: "Not authorised." };
  }

  const db = getDb();

  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileUrl: true },
  });

  if (!doc) return { error: "That document no longer exists." };

  // A bucket object that's already gone shouldn't strand the row it belongs to,
  // so a failed delete here is logged and the row goes regardless.
  await deleteFile(doc.fileUrl).catch((err) => {
    console.error("deleteDocument: could not remove the stored file", err);
  });

  try {
    await db.document.delete({ where: { id: doc.id } });
  } catch (err) {
    console.error("deleteDocument: could not delete the document row", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/staff/documents");
  revalidatePath("/documents");
  return { success: true };
}

// ─── Volunteer: Get Available Documents ─────────────────

export async function getVolunteerDocuments(): Promise<UploadedDocument[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const db = getDb();

  // Return org-level policy/training docs (not volunteer-specific)
  const docs = await db.document.findMany({
    where: {
      volunteerId: null,
      type: { in: ["POLICY", "TRAINING_MATERIAL"] },
    },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      type: true,
      fileName: true,
      uploadedAt: true,
      uploadedBy: { select: { name: true } },
    },
  });

  return docs.map((d) => ({
    id: d.id,
    type: d.type,
    fileName: d.fileName,
    uploadedAt: d.uploadedAt,
    uploadedByName: d.uploadedBy?.name || null,
  }));
}
