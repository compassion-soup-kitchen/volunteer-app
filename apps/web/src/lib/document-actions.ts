"use server";

import { DocumentType, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireActiveSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import {
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
  isStorageConfigured,
} from "@/lib/storage";
import { buildStorageKey, checkUploadFile } from "@/lib/uploads";
import { STAFF_ROLES } from "@/lib/role-change";
import {
  isCurrentVersion,
  needsAcknowledgement,
  tallyAgreement,
  uniqueAgreementKey,
  validateAgreementTemplate,
  type AgreementTemplateInput,
} from "@/lib/agreement-templates";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────

export type AgreementOverview = {
  agreementType: string;
  title: string;
  version: string;
  updatedAt: Date;
  requiresSignature: boolean;
  archivedAt: Date | null;
  totalVolunteers: number;
  confirmedCount: number;
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
  requiresSignature: boolean;
  archivedAt: Date | null;
  requiresReAck: boolean;
  reAckSetAt: Date | null;
  volunteers: {
    id: string;
    userName: string;
    userEmail: string;
    signedVersion: string | null;
    signedAt: Date | null;
    isCurrent: boolean;
    needsAcknowledgement: boolean;
  }[];
};

export type VolunteerAgreementStatus = {
  agreementType: string;
  title: string;
  content: string;
  currentVersion: string;
  requiresSignature: boolean;
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

// ─── Shared ─────────────────────────────────────────────

/**
 * The people an agreement applies to.
 *
 * Staff are excluded deliberately - a directly-promoted COORDINATOR/ADMIN has
 * no volunteer obligations to track. This is exported as one constant because
 * the counts and the volunteer list have to be drawn from the *same*
 * population; when they weren't, the overview read "8 / 6 signed current".
 */
const AGREEMENT_AUDIENCE = {
  status: { in: ["ACTIVE", "APPROVED_FOR_INDUCTION"] },
  user: { role: { notIn: STAFF_ROLES } },
} satisfies Prisma.VolunteerProfileWhereInput;

async function requireStaff() {
  const session = await requireActiveSession();
  if (!session?.user || !["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Every path an agreement change is visible on. */
function revalidateAgreement(agreementType: string) {
  revalidatePath("/staff/documents");
  revalidatePath("/staff/documents/" + agreementType);
  revalidatePath("/documents");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

// ─── Staff: Agreement Overview ──────────────────────────

export async function getAgreementOverview(): Promise<AgreementOverview[]> {
  await requireStaff();

  const db = getDb();

  const [templates, audience] = await Promise.all([
    db.agreementTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    db.volunteerProfile.findMany({
      where: AGREEMENT_AUDIENCE,
      select: {
        id: true,
        signedAgreements: {
          orderBy: { signedAt: "desc" },
          select: {
            agreementType: true,
            documentVersion: true,
            signedAt: true,
          },
        },
      },
    }),
  ]);

  return templates.map((template) => {
    // One entry per volunteer in the audience - their latest acknowledgement of
    // this agreement, or null. Same list the tally's denominator comes from.
    const latestPerVolunteer = audience.map(
      (volunteer) =>
        volunteer.signedAgreements.find(
          (sa) => sa.agreementType === template.agreementType
        ) ?? null
    );

    return {
      agreementType: template.agreementType,
      title: template.title,
      version: template.version,
      updatedAt: template.updatedAt,
      requiresSignature: template.requiresSignature,
      archivedAt: template.archivedAt,
      requiresReAck: template.requiresReAck,
      reAckSetAt: template.reAckSetAt,
      ...tallyAgreement(template, latestPerVolunteer),
    };
  });
}

// ─── Staff: Toggle Re-Acknowledgment Requirement ────────

export async function setAgreementReAckRequired(
  agreementType: string,
  required: boolean
) {
  const session = await requireStaff();

  const db = getDb();

  await db.agreementTemplate.update({
    where: { agreementType },
    data: {
      requiresReAck: required,
      // Stamp the moment re-ack was required so signatures predating it
      // count as needing re-sign. Clearing the flag leaves the timestamp
      // alone — re-enabling later resets it.
      ...(required ? { reAckSetAt: new Date(), reAckSetById: session.user.id } : {}),
    },
  });

  revalidateAgreement(agreementType);
}

// ─── Staff: Agreement Detail ────────────────────────────

export async function getAgreementDetail(
  agreementType: string
): Promise<AgreementDetail | null> {
  await requireStaff();

  const db = getDb();

  const template = await db.agreementTemplate.findUnique({
    where: { agreementType },
  });

  if (!template) return null;

  const volunteers = await db.volunteerProfile.findMany({
    where: AGREEMENT_AUDIENCE,
    select: {
      id: true,
      user: { select: { name: true, email: true } },
      signedAgreements: {
        where: { agreementType },
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
    requiresSignature: template.requiresSignature,
    archivedAt: template.archivedAt,
    requiresReAck: template.requiresReAck,
    reAckSetAt: template.reAckSetAt,
    volunteers: volunteers.map((v) => {
      const latest = v.signedAgreements[0] ?? null;
      return {
        id: v.id,
        userName: v.user.name || "—",
        userEmail: v.user.email,
        signedVersion: latest?.documentVersion ?? null,
        signedAt: latest?.signedAt ?? null,
        isCurrent: isCurrentVersion(template, latest),
        needsAcknowledgement: needsAcknowledgement(template, latest),
      };
    }),
  };
}

// ─── Staff: Create Agreement ────────────────────────────

/**
 * Add an agreement. Its key is derived from the title once, here, and then
 * left alone - renaming the agreement later must not orphan the signatures
 * already recorded against it.
 */
export async function createAgreementTemplate(input: AgreementTemplateInput) {
  const session = await requireStaff();

  const problem = validateAgreementTemplate(input);
  if (problem) return { error: problem };

  const db = getDb();

  const existing = await db.agreementTemplate.findMany({
    select: { agreementType: true },
  });
  const agreementType = uniqueAgreementKey(
    input.title,
    existing.map((t) => t.agreementType)
  );

  await db.agreementTemplate.create({
    data: {
      agreementType,
      title: input.title.trim(),
      content: input.content.trim(),
      version: input.version.trim(),
      requiresSignature: input.requiresSignature,
      updatedById: session.user.id,
    },
  });

  revalidateAgreement(agreementType);
  return { success: true as const, agreementType };
}

// ─── Staff: Update Agreement Template ───────────────────

export async function updateAgreementTemplate(
  agreementType: string,
  input: AgreementTemplateInput
) {
  const session = await requireStaff();

  const problem = validateAgreementTemplate(input);
  if (problem) return { error: problem };

  const db = getDb();

  await db.agreementTemplate.update({
    where: { agreementType },
    data: {
      title: input.title.trim(),
      content: input.content.trim(),
      version: input.version.trim(),
      requiresSignature: input.requiresSignature,
      updatedById: session.user.id,
    },
  });

  revalidateAgreement(agreementType);
  return { success: true as const };
}

// ─── Staff: Retire / Restore an Agreement ───────────────

/**
 * Retiring hides an agreement from volunteers and stops it counting towards
 * what they owe. It is not a delete: the acknowledgements against it are a
 * record of what people agreed to at the time, and those stay.
 */
export async function setAgreementArchived(
  agreementType: string,
  archived: boolean
) {
  await requireStaff();

  const db = getDb();

  await db.agreementTemplate.update({
    where: { agreementType },
    data: { archivedAt: archived ? new Date() : null },
  });

  revalidateAgreement(agreementType);
  return { success: true as const };
}

// ─── Volunteer: Get Agreement Statuses ──────────────────

export async function getVolunteerAgreementStatuses(): Promise<
  VolunteerAgreementStatus[]
> {
  const session = await requireActiveSession();
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
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return templates.map((template) => {
    // Ordered newest-first above, so the first match is the latest.
    const latest =
      profile.signedAgreements.find(
        (sa) => sa.agreementType === template.agreementType
      ) ?? null;

    return {
      agreementType: template.agreementType,
      title: template.title,
      content: template.content,
      currentVersion: template.version,
      requiresSignature: template.requiresSignature,
      signedVersion: latest?.documentVersion ?? null,
      signedAt: latest?.signedAt ?? null,
      signatureData: latest?.signatureData ?? null,
      needsResign: needsAcknowledgement(template, latest),
    };
  });
}

// ─── Volunteer: Acknowledge an Agreement ────────────────

/**
 * Record that someone has read and understood an agreement.
 *
 * Every agreement takes a tick; `requiresSignature` decides whether a drawn
 * signature has to come with it. The template is the authority on that, not the
 * client - a caller cannot skip the signature by omitting it.
 */
export async function acknowledgeAgreement(
  agreementType: string,
  signatureData: string | null
) {
  const session = await requireActiveSession();
  if (!session?.user) throw new Error("Unauthorized");

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) return { error: "No volunteer profile found." };

  const template = await db.agreementTemplate.findUnique({
    where: { agreementType },
  });

  if (!template || template.archivedAt) {
    return { error: "That agreement is no longer available." };
  }

  const signature = signatureData?.trim() || null;
  if (template.requiresSignature && !signature) {
    return { error: "Please add your signature to confirm." };
  }

  // A new row every time, so the history of what was agreed to and when is kept.
  await db.signedAgreement.create({
    data: {
      volunteerId: profile.id,
      agreementType,
      // A tick-only agreement stores no signature rather than a placeholder.
      signatureData: template.requiresSignature ? signature : null,
      documentVersion: template.version,
    },
  });

  revalidateAgreement(agreementType);
  return { success: true as const };
}

// ─── Dashboard: Check if re-signing needed ──────────────

export async function getPendingResignCount(): Promise<number> {
  const session = await requireActiveSession();
  if (!session?.user) return 0;

  const db = getDb();

  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      signedAgreements: {
        orderBy: { signedAt: "desc" },
        select: {
          agreementType: true,
          documentVersion: true,
          signedAt: true,
        },
      },
    },
  });

  if (!profile) return 0;

  const templates = await db.agreementTemplate.findMany({
    where: { archivedAt: null },
  });

  return templates.filter((template) =>
    needsAcknowledgement(
      template,
      profile.signedAgreements.find(
        (sa) => sa.agreementType === template.agreementType
      ) ?? null
    )
  ).length;
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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
