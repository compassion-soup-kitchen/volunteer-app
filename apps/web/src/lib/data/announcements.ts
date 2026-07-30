import type { Audience, EventStatus, Role } from "@prisma/client";

import { getDb } from "@/lib/db";
import { summariseRsvps, type RsvpCounts, type RsvpResponse } from "@/lib/event-rsvp";

/** A file riding along with a pānui — a roster PDF, a flyer, a menu. */
export type AnnouncementAttachmentSummary = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
};

/**
 * The gathering a pānui is announcing, carried along so the reader can reply
 * where they read about it rather than being sent off to find it.
 */
export type AnnouncementEvent = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  audience: Audience;
  status: EventStatus;
  rsvpEnabled: boolean;
  rsvpDeadline: Date | null;
  counts: RsvpCounts;
  myRsvp: { response: RsvpResponse; note: string | null } | null;
};

export type AnnouncementSummary = {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "VOLUNTEERS";
  sentAt: Date;
  authorName: string | null;
  attachments: AnnouncementAttachmentSummary[];
  event: AnnouncementEvent | null;
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

/** The linked event, with every reply so tallies and "my reply" both fall out. */
const eventSelect = {
  select: {
    id: true,
    title: true,
    description: true,
    date: true,
    startTime: true,
    endTime: true,
    location: true,
    audience: true,
    status: true,
    rsvpEnabled: true,
    rsvpDeadline: true,
    rsvps: { select: { userId: true, response: true, note: true } },
  },
} as const;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  audience: Audience;
  status: EventStatus;
  rsvpEnabled: boolean;
  rsvpDeadline: Date | null;
  rsvps: { userId: string; response: RsvpResponse; note: string | null }[];
};

/**
 * Attaches the reader's own reply and the tallies.
 *
 * A draft event is dropped: the pānui announcing it might have gone out early,
 * and an invitation to something nobody can see yet is just confusing.
 */
function toAnnouncementEvent(
  event: EventRow | null,
  userId: string | null
): AnnouncementEvent | null {
  if (!event || event.status === "DRAFT") return null;

  const mine = userId ? event.rsvps.find((r) => r.userId === userId) : undefined;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    audience: event.audience,
    status: event.status,
    rsvpEnabled: event.rsvpEnabled,
    rsvpDeadline: event.rsvpDeadline,
    counts: summariseRsvps(event.rsvps.map((r) => r.response)),
    myRsvp: mine ? { response: mine.response, note: mine.note } : null,
  };
}

/** Who is reading, so their own reply to any linked event comes back with it. */
export type AnnouncementReader = { userId: string; role: Role };

/** Published announcements a volunteer may see (ALL + VOLUNTEERS audiences). */
export async function listVolunteerAnnouncements(
  options: { limit?: number; reader?: AnnouncementReader | null } = {}
): Promise<AnnouncementSummary[]> {
  const db = getDb();
  const { limit, reader } = options;

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
      event: eventSelect,
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
    event: toAnnouncementEvent(a.event, reader?.userId ?? null),
  }));
}

/** A single volunteer-visible announcement, or null if missing / not visible. */
export async function getVolunteerAnnouncement(
  id: string,
  reader?: AnnouncementReader | null
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
      event: eventSelect,
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
    event: toAnnouncementEvent(a.event, reader?.userId ?? null),
  };
}
