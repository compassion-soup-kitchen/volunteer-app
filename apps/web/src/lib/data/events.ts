/**
 * Event reads, shared by the web pages, the Server Actions and `/api/v1`.
 *
 * Nothing here checks a session — callers do that and pass the reader in. The
 * one rule these reads *do* enforce is visibility: a volunteer only ever sees
 * events their role is invited to, and never a draft.
 */

import type { Audience, EventStatus, Role } from "@prisma/client";

import { getDb } from "@/lib/db";
import { startOfTodayInAppZone, todayInAppZone } from "@/lib/date-only";
import {
  canRespondToEvent,
  isRsvpResponse,
  rolesForAudience,
  RSVP_NOTE_MAX,
  summariseRsvps,
  type RsvpCounts,
  type RsvpResponse,
} from "@/lib/event-rsvp";

// ─── Types ──────────────────────────────────────────────

/** The reader's own reply, as every event surface shows it. */
export type MyRsvp = {
  response: RsvpResponse;
  note: string | null;
};

/** An event as a guest sees it. */
export type EventSummary = {
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
  myRsvp: MyRsvp | null;
};

/** One line of the staff guest list. */
export type EventGuest = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  response: RsvpResponse | null;
  note: string | null;
  respondedAt: Date | null;
};

/** An event as staff manage it: the guest list plus who is yet to answer. */
export type StaffEvent = EventSummary & {
  authorName: string | null;
  createdAt: Date;
  inviteeCount: number;
  /** How many pānui have gone out about this event. */
  announcementCount: number;
};

// ─── Selects ────────────────────────────────────────────

const eventFields = {
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
} as const;

/**
 * Every reply, but only the two columns the tallies and "my reply" need.
 *
 * An event has at most one row per invited person (~100 here), so reading them
 * all and counting in memory costs one query instead of one per event plus a
 * grouped aggregate — and it answers both questions at once.
 */
const rsvpFields = {
  select: { userId: true, response: true, note: true },
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

function toEventSummary(event: EventRow, userId: string | null): EventSummary {
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

// ─── Guest-facing reads ─────────────────────────────────

/** The audiences a role is invited by — the mirror of `rolesForAudience`. */
function audiencesForRole(role: Role): Audience[] {
  return (["ALL", "VOLUNTEERS", "COORDINATORS"] as const).filter((audience) =>
    rolesForAudience(audience).includes(role)
  );
}

/**
 * Events this person is invited to and can still come to: published or
 * cancelled, today onwards.
 *
 * Cancelled events stay in the list until the day passes — someone who already
 * said yes needs to see that it's off, and dropping it silently is how people
 * turn up to a locked door.
 */
export async function listUpcomingEventsForUser(
  userId: string,
  role: Role,
  options: { limit?: number } = {}
): Promise<EventSummary[]> {
  const db = getDb();

  const events = await db.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "CANCELLED"] },
      audience: { in: audiencesForRole(role) },
      date: { gte: startOfTodayInAppZone() },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(options.limit ? { take: options.limit } : {}),
    select: { ...eventFields, rsvps: rsvpFields },
  });

  return events.map((event) => toEventSummary(event, userId));
}

/** Events this person is invited to that have already happened, newest first. */
export async function listPastEventsForUser(
  userId: string,
  role: Role,
  options: { limit?: number } = {}
): Promise<EventSummary[]> {
  const db = getDb();

  const events = await db.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "CANCELLED"] },
      audience: { in: audiencesForRole(role) },
      date: { lt: startOfTodayInAppZone() },
    },
    orderBy: [{ date: "desc" }],
    ...(options.limit ? { take: options.limit } : {}),
    select: { ...eventFields, rsvps: rsvpFields },
  });

  return events.map((event) => toEventSummary(event, userId));
}

/**
 * A single event as this person may see it, or `null` when they may not.
 *
 * Staff see drafts here because they manage them; everyone else is held to the
 * same audience and published-status rules as the list above.
 */
export async function getEventForUser(
  id: string,
  userId: string,
  role: Role
): Promise<EventSummary | null> {
  const db = getDb();

  const event = await db.event.findUnique({
    where: { id },
    select: { ...eventFields, rsvps: rsvpFields },
  });
  if (!event) return null;

  const isStaff = role === "COORDINATOR" || role === "ADMIN";
  if (!isStaff) {
    if (event.status === "DRAFT") return null;
    if (!rolesForAudience(event.audience).includes(role)) return null;
  }

  return toEventSummary(event, userId);
}

// ─── Invitees ───────────────────────────────────────────

/**
 * Everyone on the invite list: active accounts whose role the audience covers.
 *
 * Archived accounts are left out — they can't sign in, so they can't reply, and
 * counting them would leave "awaiting reply" stuck above zero forever.
 */
export async function listInvitees(audience: Audience): Promise<
  { id: string; name: string | null; email: string; role: Role }[]
> {
  const db = getDb();

  return db.user.findMany({
    where: { status: "ACTIVE", role: { in: rolesForAudience(audience) } },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function countInvitees(audience: Audience): Promise<number> {
  const db = getDb();

  return db.user.count({
    where: { status: "ACTIVE", role: { in: rolesForAudience(audience) } },
  });
}

// ─── Staff reads ────────────────────────────────────────

/**
 * Every event, drafts included, newest first.
 *
 * `viewerId` is the coordinator reading the page — they come to these too, so
 * their own reply comes back with each event.
 */
export async function listStaffEvents(
  viewerId: string | null = null
): Promise<StaffEvent[]> {
  const db = getDb();

  const events = await db.event.findMany({
    orderBy: [{ date: "desc" }],
    select: {
      ...eventFields,
      createdAt: true,
      createdBy: { select: { name: true } },
      rsvps: rsvpFields,
      _count: { select: { announcements: true } },
    },
  });

  // One count per audience rather than one per event: three queries at most,
  // however many Christmas parties are on the books.
  const audiences = [...new Set(events.map((e) => e.audience))];
  const inviteeCounts = new Map(
    await Promise.all(
      audiences.map(
        async (audience) => [audience, await countInvitees(audience)] as const
      )
    )
  );

  return events.map((event) => ({
    ...toEventSummary(event, viewerId),
    authorName: event.createdBy?.name ?? null,
    createdAt: event.createdAt,
    inviteeCount: inviteeCounts.get(event.audience) ?? 0,
    announcementCount: event._count.announcements,
  }));
}

/**
 * The full guest list: everyone invited, with their reply or a blank where they
 * haven't answered. Answers first, so the people to chase are together at the
 * bottom rather than scattered through the list.
 */
export async function listEventGuests(eventId: string): Promise<EventGuest[]> {
  const db = getDb();

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      audience: true,
      rsvps: {
        select: {
          userId: true,
          response: true,
          note: true,
          respondedAt: true,
        },
      },
    },
  });
  if (!event) return [];

  const replies = new Map(event.rsvps.map((r) => [r.userId, r]));
  const invitees = await listInvitees(event.audience);

  const guests: EventGuest[] = invitees.map((invitee) => {
    const reply = replies.get(invitee.id);
    return {
      userId: invitee.id,
      name: invitee.name ?? invitee.email,
      email: invitee.email,
      role: invitee.role,
      response: reply?.response ?? null,
      note: reply?.note ?? null,
      respondedAt: reply?.respondedAt ?? null,
    };
  });

  const rank: Record<string, number> = {
    GOING: 0,
    MAYBE: 1,
    NOT_GOING: 2,
    NONE: 3,
  };

  return guests.sort(
    (a, b) =>
      rank[a.response ?? "NONE"] - rank[b.response ?? "NONE"] ||
      a.name.localeCompare(b.name)
  );
}

// ─── Writes ─────────────────────────────────────────────

export type MutationResult = { error?: string; success?: boolean };

/**
 * Records one person's reply, or changes the one they already gave.
 *
 * Shared by the web Server Action and `/api/v1`, which authenticate
 * differently but must answer identically — the eligibility rules live in
 * `canRespondToEvent`, and this is the only place that writes a reply.
 */
export async function respondToEventAsUser(
  userId: string,
  role: Role,
  eventId: string,
  response: string,
  note?: string | null
): Promise<MutationResult> {
  if (!isRsvpResponse(response)) return { error: "Choose one of the replies." };

  const trimmedNote = note?.trim() ?? "";
  if (trimmedNote.length > RSVP_NOTE_MAX) {
    return { error: `Keep the note under ${RSVP_NOTE_MAX} characters.` };
  }

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      date: true,
      status: true,
      audience: true,
      rsvpEnabled: true,
      rsvpDeadline: true,
    },
  });
  if (!event) return { error: "Event not found." };

  const eligibility = canRespondToEvent(event, role, todayInAppZone());
  if (!eligibility.ok) return { error: eligibility.reason };

  try {
    // One row per person per event, so changing your mind updates rather than
    // stacks up: the tallies can never double-count.
    await db.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: {
        eventId,
        userId,
        response,
        note: trimmedNote || null,
      },
      update: { response, note: trimmedNote || null },
    });
    return { success: true };
  } catch (e) {
    console.error("respondToEventAsUser:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

