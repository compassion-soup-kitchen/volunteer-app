"use server";

import { after, connection } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import { formatDateOnly, todayInAppZone } from "@/lib/date-only";
import { parseEventForm, type EventFormData } from "@/lib/event-form";
import { canRespondToEvent, formatEventWhen } from "@/lib/event-rsvp";
import {
  getEventForUser,
  listEventGuests,
  listPastEventsForUser,
  listStaffEvents,
  listUpcomingEventsForUser,
  respondToEventAsUser,
  type EventGuest,
  type EventSummary,
  type StaffEvent,
} from "@/lib/data/events";

export type {
  EventGuest,
  EventSummary,
  MyRsvp,
  StaffEvent,
} from "@/lib/data/events";

export type ActionResult = { error?: string; success?: boolean };

// ─── Helpers ─────────────────────────────────────────────

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

/** Every surface that renders events or the pānui that announce them. */
function revalidateEventPaths() {
  revalidatePath("/staff/events");
  revalidatePath("/staff/announcements");
  revalidatePath("/events");
  revalidatePath("/news");
  revalidatePath("/dashboard");
}

// ─── Guest reads ─────────────────────────────────────────

export async function getUpcomingEvents(): Promise<EventSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return listUpcomingEventsForUser(session.user.id, session.user.role);
}

export async function getPastEvents(limit = 6): Promise<EventSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return listPastEventsForUser(session.user.id, session.user.role, { limit });
}

/**
 * Invitations still waiting on an answer — what the dashboard nudges about.
 * A reply already given needs no nudge, so those drop out.
 */
export async function getUnansweredInvitations(
  limit = 2
): Promise<EventSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  const today = todayInAppZone();
  const events = await listUpcomingEventsForUser(
    session.user.id,
    session.user.role
  );

  return events
    .filter(
      (event) =>
        event.myRsvp === null &&
        canRespondToEvent(event, session.user.role, today).ok
    )
    .slice(0, limit);
}

export async function getEvent(id: string): Promise<EventSummary | null> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;

  return getEventForUser(id, session.user.id, session.user.role);
}

// ─── Staff reads ─────────────────────────────────────────

export async function getStaffEvents(): Promise<StaffEvent[]> {
  await connection();
  const session = await requireStaff();
  if (!session) return [];

  return listStaffEvents(session.user!.id);
}

/** The full guest list for one event — staff only, it names people. */
export async function getEventGuests(eventId: string): Promise<EventGuest[]> {
  await connection();
  const session = await requireStaff();
  if (!session) return [];

  return listEventGuests(eventId);
}

// ─── Staff mutations ─────────────────────────────────────

export async function createEvent(
  input: EventFormData & { publish?: boolean }
): Promise<ActionResult & { id?: string }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const parsed = parseEventForm(input, { today: todayInAppZone() });
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  try {
    const event = await db.event.create({
      data: {
        ...parsed.value,
        status: input.publish === true ? "PUBLISHED" : "DRAFT",
        createdById: session.user!.id,
      },
      select: { id: true },
    });

    revalidateEventPaths();
    // The id goes back so the caller can announce what it just created.
    return { success: true, id: event.id };
  } catch (e) {
    console.error("Create event error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateEvent(
  id: string,
  input: EventFormData
): Promise<ActionResult> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true, date: true, rsvpDeadline: true },
  });
  if (!existing) return { error: "Event not found." };

  const parsed = parseEventForm(input, {
    today: todayInAppZone(),
    existing: { date: existing.date, rsvpDeadline: existing.rsvpDeadline },
  });
  if (!parsed.ok) return { error: parsed.error };

  try {
    await db.event.update({ where: { id }, data: parsed.value });
    revalidateEventPaths();
    return { success: true };
  } catch (e) {
    console.error("Update event error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Shares an event with its invitees.
 *
 * Publishing only makes the event visible — it sends nothing. Telling people is
 * what a pānui is for, and keeping the push in one place is what stops an event
 * being announced twice over.
 */
export async function publishEvent(id: string): Promise<ActionResult> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.event.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return { error: "Event not found." };
  if (existing.status === "CANCELLED") {
    return { error: "This event was cancelled. Edit it to bring it back." };
  }

  try {
    await db.event.update({ where: { id }, data: { status: "PUBLISHED" } });
    revalidateEventPaths();
    return { success: true };
  } catch (e) {
    console.error("Publish event error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/** Back to a draft — hides it again without touching the guest list. */
export async function unpublishEvent(id: string): Promise<ActionResult> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "Event not found." };

  try {
    await db.event.update({ where: { id }, data: { status: "DRAFT" } });
    revalidateEventPaths();
    return { success: true };
  } catch (e) {
    console.error("Unpublish event error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Calls an event off.
 *
 * The row stays, so the guest list is still there and last year's party is
 * still in the record. Anyone who said they were coming (or might) gets told
 * straight away — this is the one event change nobody can afford to miss.
 */
export async function cancelEvent(id: string): Promise<ActionResult> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      status: true,
      rsvps: {
        where: { response: { in: ["GOING", "MAYBE"] } },
        select: { userId: true },
      },
    },
  });
  if (!existing) return { error: "Event not found." };
  if (existing.status === "CANCELLED") return { success: true };

  try {
    await db.event.update({ where: { id }, data: { status: "CANCELLED" } });

    // Only worth telling people about an event that was actually shared.
    if (existing.status === "PUBLISHED" && existing.rsvps.length > 0) {
      const userIds = existing.rsvps.map((r) => r.userId);
      after(() =>
        sendPushToUsers(userIds, {
          title: `Cancelled: ${existing.title}`,
          body: `${formatEventWhen(existing)} is no longer going ahead. Sorry for the change of plan.`,
          data: { url: `/event/${existing.id}` },
        })
      );
    }

    revalidateEventPaths();
    return { success: true };
  } catch (e) {
    console.error("Cancel event error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Removes an event outright.
 *
 * Replies cascade with it, which is why the UI confirms and why cancelling is
 * the usual answer for something that was already shared.
 */
export async function deleteEvent(id: string): Promise<ActionResult> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "Event not found." };

  try {
    // Any pānui about it stays — a message that was sent was still sent — and
    // its link falls away (`onDelete: SetNull`).
    await db.event.delete({ where: { id } });
    revalidateEventPaths();
    return { success: true };
  } catch (e) {
    console.error("Delete event error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── RSVPs ───────────────────────────────────────────────

/**
 * Records this person's reply, or changes the one they already gave.
 *
 * Open to volunteers and staff alike: who may answer is the event's audience,
 * not a role check, because coordinators come to the party too.
 */
export async function respondToEvent(
  eventId: string,
  response: string,
  note?: string | null
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in to reply." };

  const result = await respondToEventAsUser(
    session.user.id,
    session.user.role,
    eventId,
    response,
    note
  );
  if (result.success) revalidateEventPaths();
  return result;
}

// ─── Announcing an event ─────────────────────────────────

/**
 * A first draft of the pānui announcing an event, so a coordinator starts from
 * something they can send rather than an empty box. Pure, and exported so the
 * dialog can prefill without a round trip.
 */
export async function draftEventAnnouncement(eventId: string): Promise<{
  title: string;
  body: string;
  audience: string;
} | null> {
  const session = await requireStaff();
  if (!session) return null;

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      description: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      audience: true,
      rsvpEnabled: true,
      rsvpDeadline: true,
    },
  });
  if (!event) return null;

  // Wherever this pānui is read, the event's own card is right beneath it with
  // the day, the place, who's coming and the reply buttons — so the message
  // doesn't repeat any of that. It carries the invitation in words, which is
  // also all a push notification gets to show.
  const lines: string[] = [];
  if (event.description) lines.push(event.description, "");
  lines.push(`Join us on ${formatEventWhen(event)}.`);
  if (event.rsvpEnabled) {
    lines.push(
      event.rsvpDeadline
        ? `Please let us know by ${formatDateOnly(event.rsvpDeadline, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })} so we can plan the kai.`
        : "Let us know if you can come."
    );
  }

  return {
    title: event.title,
    body: lines.join("\n"),
    audience: event.audience,
  };
}
