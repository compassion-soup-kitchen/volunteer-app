"use server";

import { after, connection } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import {
  announcementPushBody,
  parseAnnouncementInput,
  shouldNotifyVolunteersOnPublish,
  type AnnouncementAudience,
} from "@/lib/announcement-schema";
import {
  listVolunteerAnnouncements,
  type AnnouncementSummary,
} from "@/lib/data/announcements";

export type { AnnouncementSummary } from "@/lib/data/announcements";

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
  }));
}

// ─── Staff mutations ─────────────────────────────────

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: string;
  publish?: boolean;
}): Promise<{ error?: string; success?: boolean }> {
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
    return { success: true };
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
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "Announcement not found." };

  try {
    await db.announcement.delete({ where: { id } });

    revalidateAnnouncementPaths();
    return { success: true };
  } catch (e) {
    console.error("Delete announcement error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
