import { getDb } from "@/lib/db";

/** A file riding along with a pānui — a roster PDF, a flyer, a menu. */
export type AnnouncementAttachmentSummary = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
};

export type AnnouncementSummary = {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "VOLUNTEERS";
  sentAt: Date;
  authorName: string | null;
  attachments: AnnouncementAttachmentSummary[];
};

/** Attachment fields every read needs — the storage key is never sent out. */
const attachmentSelect = {
  select: {
    id: true,
    fileName: true,
    contentType: true,
    fileSize: true,
  },
  orderBy: { uploadedAt: "asc" },
} as const;

/** Published announcements a volunteer may see (ALL + VOLUNTEERS audiences). */
export async function listVolunteerAnnouncements(
  limit?: number
): Promise<AnnouncementSummary[]> {
  const db = getDb();

  const announcements = await db.announcement.findMany({
    where: {
      sentAt: { not: null },
      audience: { in: ["ALL", "VOLUNTEERS"] },
    },
    orderBy: { sentAt: "desc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      title: true,
      body: true,
      audience: true,
      sentAt: true,
      createdBy: { select: { name: true } },
      attachments: attachmentSelect,
    },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience === "ALL" ? ("ALL" as const) : ("VOLUNTEERS" as const),
    sentAt: a.sentAt!,
    authorName: a.createdBy?.name ?? null,
    attachments: a.attachments,
  }));
}

/** A single volunteer-visible announcement, or null if missing / not visible. */
export async function getVolunteerAnnouncement(
  id: string
): Promise<AnnouncementSummary | null> {
  const db = getDb();

  const a = await db.announcement.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      sentAt: true,
      audience: true,
      createdBy: { select: { name: true } },
      attachments: attachmentSelect,
    },
  });

  if (!a || !a.sentAt || !["ALL", "VOLUNTEERS"].includes(a.audience)) {
    return null;
  }

  return {
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience === "ALL" ? "ALL" : "VOLUNTEERS",
    sentAt: a.sentAt,
    authorName: a.createdBy?.name ?? null,
    attachments: a.attachments,
  };
}
