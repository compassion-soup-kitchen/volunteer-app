/**
 * Events and their RSVPs.
 *
 * Everything here is pure, so the server actions and the buttons that call them
 * share one set of rules: who is invited, when replies close, and how a guest
 * list is tallied. Nothing in this file touches the database or the session.
 */

import type { Audience, EventStatus, Role } from "@prisma/client";

import {
  dateOnlyOf,
  formatDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";

export const RSVP_RESPONSES = ["GOING", "MAYBE", "NOT_GOING"] as const;

export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

/** Room for dietary needs or "I'll be a bit late" — not an essay. */
export const RSVP_NOTE_MAX = 300;

export function isRsvpResponse(value: unknown): value is RsvpResponse {
  return (
    typeof value === "string" &&
    (RSVP_RESPONSES as readonly string[]).includes(value)
  );
}

/** How the choice is put to the guest — first person, because they're answering. */
export const RSVP_LABELS: Record<RsvpResponse, string> = {
  GOING: "I'll be there",
  MAYBE: "Maybe",
  NOT_GOING: "Can't make it",
};

/** How a reply is reported back — third person, for tallies and guest lists. */
export const RSVP_TALLY_LABELS: Record<RsvpResponse, string> = {
  GOING: "Going",
  MAYBE: "Maybe",
  NOT_GOING: "Can't make it",
};

/**
 * Which roles an audience covers.
 *
 * Invitations are the point of the `audience` field: a party for the whole
 * whānau is `ALL`, and volunteers and staff alike can put their hand up.
 * `PUBLIC` accounts are still mid-application, so they are never on a list.
 */
export function rolesForAudience(audience: Audience): Role[] {
  switch (audience) {
    case "ALL":
      return ["VOLUNTEER", "COORDINATOR", "ADMIN"];
    case "VOLUNTEERS":
      return ["VOLUNTEER"];
    case "COORDINATORS":
      return ["COORDINATOR", "ADMIN"];
  }
}

export function audienceIncludesRole(audience: Audience, role: Role): boolean {
  return rolesForAudience(audience).includes(role);
}

/** The fields of an event these rules read. */
export type EventRules = {
  date: Date;
  status: EventStatus;
  audience: Audience;
  rsvpEnabled: boolean;
  rsvpDeadline: Date | null;
};

/**
 * The last day replies are taken: the stated deadline, or the day of the event
 * when none was set — a reply on the morning of the party still helps.
 */
export function rsvpClosesOn(event: EventRules): DateOnly {
  return dateOnlyOf(event.rsvpDeadline ?? event.date);
}

/** Whether the event is over, on the kitchen's wall calendar. */
export function eventHasPassed(event: EventRules, today: DateOnly): boolean {
  return dateOnlyOf(event.date) < today;
}

export function rsvpsAreOpen(event: EventRules, today: DateOnly): boolean {
  return (
    event.status === "PUBLISHED" &&
    event.rsvpEnabled &&
    today <= rsvpClosesOn(event)
  );
}

export type RsvpEligibility = { ok: true } | { ok: false; reason: string };

/**
 * Whether this person may reply to this event right now.
 *
 * Every gate that could turn a reply away lives here, so the server action and
 * the button that calls it can't drift apart on the answer.
 */
export function canRespondToEvent(
  event: EventRules,
  role: Role,
  today: DateOnly
): RsvpEligibility {
  if (event.status === "DRAFT") {
    return { ok: false, reason: "This event hasn't been shared yet." };
  }
  if (event.status === "CANCELLED") {
    return { ok: false, reason: "This event has been cancelled." };
  }
  if (!audienceIncludesRole(event.audience, role)) {
    return { ok: false, reason: "This event isn't open to you." };
  }
  if (!event.rsvpEnabled) {
    return { ok: false, reason: "This event isn't taking replies." };
  }
  if (eventHasPassed(event, today)) {
    return { ok: false, reason: "This event has already been." };
  }
  if (today > rsvpClosesOn(event)) {
    return { ok: false, reason: "Replies for this event have closed." };
  }
  return { ok: true };
}

/**
 * Why the RSVP buttons aren't available, in words a volunteer would use.
 * `null` while replies are open — there is nothing to explain.
 */
export function rsvpClosedMessage(
  event: EventRules,
  today: DateOnly
): string | null {
  if (rsvpsAreOpen(event, today)) return null;
  if (event.status === "CANCELLED") return "This event has been cancelled.";
  if (!event.rsvpEnabled) return "Replies aren't being collected for this one.";
  if (eventHasPassed(event, today)) return "This event has been and gone.";

  const closed = rsvpClosesOn(event);
  return `Replies closed on ${formatDateOnly(parseDateOnly(closed), {
    day: "numeric",
    month: "long",
  })}.`;
}

export type RsvpCounts = {
  going: number;
  maybe: number;
  notGoing: number;
  /** Everyone who replied at all, whatever they said. */
  replied: number;
};

export const EMPTY_RSVP_COUNTS: RsvpCounts = {
  going: 0,
  maybe: 0,
  notGoing: 0,
  replied: 0,
};

/** Tally a set of replies. */
export function summariseRsvps(responses: readonly RsvpResponse[]): RsvpCounts {
  const counts = { ...EMPTY_RSVP_COUNTS };
  for (const response of responses) {
    if (response === "GOING") counts.going += 1;
    else if (response === "MAYBE") counts.maybe += 1;
    else if (response === "NOT_GOING") counts.notGoing += 1;
    else continue;
    counts.replied += 1;
  }
  return counts;
}

/**
 * How many invitees haven't answered — the number a coordinator chases before
 * confirming numbers with a caterer. Never negative, even if the invite list
 * shrank after people replied (a volunteer archived since answering).
 */
export function awaitingReply(counts: RsvpCounts, inviteeCount: number): number {
  return Math.max(0, inviteeCount - counts.replied);
}

/**
 * "12 going · 3 maybe" — the shoulder line under an event. Seeing who else is
 * coming is what makes people reply, so `going` is always named, even at zero.
 */
export function formatRsvpTally(counts: RsvpCounts): string {
  const parts = [`${counts.going} going`];
  if (counts.maybe > 0) parts.push(`${counts.maybe} maybe`);
  return parts.join(" · ");
}

/** `18:00` → `6:00 pm`, the same reading as shift and training times. */
export function formatEventTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minutes} ${period}`;
}

/** `6:00 pm – 9:00 pm`, or just the start when there's no end time. */
export function formatEventTimeRange(
  startTime: string | null,
  endTime: string | null
): string | null {
  if (!startTime) return null;
  if (!endTime) return `From ${formatEventTime(startTime)}`;
  return `${formatEventTime(startTime)} – ${formatEventTime(endTime)}`;
}

/**
 * "Sat 20 Dec 2026, 6:00 pm" — one line of when, for cards and push bodies.
 */
export function formatEventWhen(event: {
  date: Date;
  startTime: string | null;
}): string {
  const day = formatDateOnly(event.date, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return event.startTime ? `${day}, ${formatEventTime(event.startTime)}` : day;
}
