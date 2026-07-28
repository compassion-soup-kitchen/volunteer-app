"use server";

import { after, connection } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import {
  announcementPushBody,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  parseAnnouncementInput,
  shouldNotifyVolunteersOnPublish,
  type AnnouncementAudience,
} from "@/lib/announcement-schema";
import {
  listVolunteerAnnouncements,
  type AnnouncementAttachmentSummary,
  type AnnouncementSummary,
} from "@/lib/data/announcements";
import {
  deleteFile,
  getSignedDownloadUrl,
  isStorageConfigured,
  uploadFile,
} from "@/lib/storage";
import { buildStorageKey, checkUploadFile } from "@/lib/uploads";

export type {
  AnnouncementSummary,
  AnnouncementAttachmentSummary,
} from "@/lib/data/announcements";

// ─── Volunteer reads ─────────────────────────────────

export async function getRecentAnnouncements(
  limit = 3
): Promise<AnnouncementSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return listVolunteerAnnouncements(limit);
}

export async function getAnnouncements(): Promise<AnnouncementSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return listVolunteerAnnouncements();
}

// ─── Staff helpers ───────────────────────────────────

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

/** Every surface that renders announcements. */
function revalidateAnnouncementPaths() {
  revalidatePath("/staff/announcements");
  revalidatePath("/news");
  revalidatePath("/dashboard");
}

/**
 * Queues a push to every active volunteer about a freshly published pānui.
 * Wrapped in `after()` so delivery never blocks or fails the mutation —
 * same fire-and-forget pattern as shift and application notifications.
 */
async function queueVolunteerPush(announcement: {
  id: string;
  title: string;
  body: string;
}) {
  const db = getDb();
  const volunteers = await db.user.findMany({
    where: { role: "VOLUNTEER", status: "ACTIVE" },
    select: { id: true },
  });
  const userIds = volunteers.map((v) => v.id);

  after(() =>
    sendPushToUsers(userIds, {
      title: announcement.title,
      body: announcementPushBody(announcement.body),
      data: { url: `/notice/${announcement.id}` },
    })
  );
}

// ─── Staff read ──────────────────────────────────────

export type StaffAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  createdAt: Date;
  sentAt: Date | null;
  authorName: string | null;
  attachments: AnnouncementAttachmentSummary[];
};

/** All announcements, drafts included, newest first — staff only. */
export async function getStaffAnnouncements(): Promise<StaffAnnouncement[]> {
  await connection();
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      audience: true,
      createdAt: true,
      sentAt: true,
      createdBy: { select: { name: true } },
      attachments: {
        select: {
          id: true,
          fileName: true,
          contentType: true,
          fileSize: true,
        },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    createdAt: a.createdAt,
    sentAt: a.sentAt,
    authorName: a.createdBy?.name ?? null,
    attachments: a.attachments,
  }));
}

// ─── Staff mutations ─────────────────────────────────

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: string;
  publish?: boolean;
}): Promise<{ error?: string; success?: boolean; id?: string }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const parsed = parseAnnouncementInput({
    title: input.title,
    body: input.body,
    audience: input.audience,
  });
  if (parsed.error !== undefined) return { error: parsed.error };

  const db = getDb();
  try {
    const publish = input.publish === true;
    const announcement = await db.announcement.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        createdById: session.user!.id,
        sentAt: publish ? new Date() : null,
      },
    });

    if (publish && shouldNotifyVolunteersOnPublish(null, parsed.data.audience)) {
      await queueVolunteerPush(announcement);
    }

    revalidateAnnouncementPaths();
    // The id goes back so the caller can attach files to what it just created.
    return { success: true, id: announcement.id };
  } catch (e) {
    console.error("Create announcement error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateAnnouncement(
  id: string,
  input: { title: string; body: string; audience: string }
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const parsed = parseAnnouncementInput(input);
  if (parsed.error !== undefined) return { error: parsed.error };

  const db = getDb();
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "Announcement not found." };

  try {
    await db.announcement.update({
      where: { id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
      },
    });

    revalidateAnnouncementPaths();
    return { success: true };
  } catch (e) {
    console.error("Update announcement error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function publishAnnouncement(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "Announcement not found." };

  // Already live — nothing to do, and definitely no second push.
  if (existing.sentAt !== null) return { success: true };

  try {
    const announcement = await db.announcement.update({
      where: { id },
      data: { sentAt: new Date() },
    });

    if (shouldNotifyVolunteersOnPublish(existing.sentAt, existing.audience)) {
      await queueVolunteerPush(announcement);
    }

    revalidateAnnouncementPaths();
    return { success: true };
  } catch (e) {
    console.error("Publish announcement error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function unpublishAnnouncement(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "Announcement not found." };

  try {
    await db.announcement.update({
      where: { id },
      data: { sentAt: null },
    });

    revalidateAnnouncementPaths();
    return { success: true };
  } catch (e) {
    console.error("Unpublish announcement error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteAnnouncement(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.announcement.findUnique({
    where: { id },
    select: { id: true, attachments: { select: { fileUrl: true } } },
  });
  if (!existing) return { error: "Announcement not found." };

  try {
    await db.announcement.delete({ where: { id } });

    // The rows cascade, but the bucket objects don't — clear them so deleting a
    // pānui doesn't leave its files behind paying for storage forever.
    await Promise.all(
      existing.attachments.map((a) =>
        deleteFile(a.fileUrl).catch((err) => {
          console.error("deleteAnnouncement: orphaned attachment file", err);
        })
      )
    );

    revalidateAnnouncementPaths();
    return { success: true };
  } catch (e) {
    console.error("Delete announcement error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Attachments ─────────────────────────────────────

/**
 * Attaches a file to a pānui.
 *
 * Mirrors uploadDocument: errors come back as values, because a Server Action
 * that throws surfaces in the browser as an unattributable "unexpected error".
 */
export async function uploadAnnouncementAttachment(
  announcementId: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  if (!isStorageConfigured()) {
    console.error("uploadAnnouncementAttachment: storage is not configured");
    return {
      error:
        "File storage isn't set up on the server yet. Let your administrator know.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to attach." };

  const rejection = checkUploadFile(file);
  if (rejection) return { error: rejection };

  const db = getDb();
  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
    select: { id: true, _count: { select: { attachments: true } } },
  });
  if (!announcement) return { error: "Announcement not found." };

  if (announcement._count.attachments >= MAX_ANNOUNCEMENT_ATTACHMENTS) {
    return {
      error: `A pānui can carry ${MAX_ANNOUNCEMENT_ATTACHMENTS} files at most.`,
    };
  }

  const storagePath = buildStorageKey(
    `announcement/${announcementId}`,
    file.name,
    Date.now()
  );

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(storagePath, buffer, file.type);
  } catch (err) {
    console.error("uploadAnnouncementAttachment: storage upload failed", err);
    return { error: "The upload didn't reach storage. Please try again." };
  }

  try {
    await db.announcementAttachment.create({
      data: {
        announcementId,
        fileName: file.name,
        fileUrl: storagePath,
        contentType: file.type,
        fileSize: file.size,
      },
    });
  } catch (err) {
    console.error("uploadAnnouncementAttachment: could not record file", err);
    await deleteFile(storagePath).catch(() => {});
    return { error: "Something went wrong. Please try again." };
  }

  revalidateAnnouncementPaths();
  return { success: true };
}

export async function deleteAnnouncementAttachment(
  attachmentId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const attachment = await db.announcementAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, fileUrl: true },
  });
  if (!attachment) return { error: "That file no longer exists." };

  await deleteFile(attachment.fileUrl).catch((err) => {
    console.error("deleteAnnouncementAttachment: could not remove file", err);
  });

  try {
    await db.announcementAttachment.delete({ where: { id: attachment.id } });
  } catch (err) {
    console.error("deleteAnnouncementAttachment: could not delete row", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateAnnouncementPaths();
  return { success: true };
}

/**
 * A short-lived link to an attachment.
 *
 * Staff can reach any attachment; everyone else only files on a pānui that is
 * actually published to them, so an unpublished draft's roster stays private.
 */
export async function getAnnouncementAttachmentUrl(
  attachmentId: string
): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const attachment = await db.announcementAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      fileUrl: true,
      announcement: { select: { sentAt: true, audience: true } },
    },
  });
  if (!attachment) return null;

  const isStaff = ["COORDINATOR", "ADMIN"].includes(session.user.role);
  if (!isStaff) {
    const { sentAt, audience } = attachment.announcement;
    if (!sentAt || !["ALL", "VOLUNTEERS"].includes(audience)) return null;
  }

  try {
    return await getSignedDownloadUrl(attachment.fileUrl, 60 * 5);
  } catch (err) {
    console.error("getAnnouncementAttachmentUrl: could not sign URL", err);
    return null;
  }
}
