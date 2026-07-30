/**
 * Event and RSVP rules for the app.
 *
 * Mirrors `apps/web/src/lib/event-rsvp.ts`: the server has the final say on
 * every reply, and these are the same rules so the buttons agree with it. Pure,
 * so they're unit-tested (see the note on mobile testing in AGENTS.md).
 */

import type { RsvpResponse, VolunteerEvent } from '@/types/models';

export const RSVP_RESPONSES: RsvpResponse[] = ['GOING', 'MAYBE', 'NOT_GOING'];

/** How the choice is put to the guest — first person, because they're answering. */
export const RSVP_LABELS: Record<RsvpResponse, string> = {
  GOING: "I'll be there",
  MAYBE: 'Maybe',
  NOT_GOING: "Can't make it",
};

/** How their answer reads back to them once given. */
export const RSVP_CONFIRMATIONS: Record<RsvpResponse, string> = {
  GOING: "You're going",
  MAYBE: 'You said maybe',
  NOT_GOING: "You can't make it",
};

/** Room for dietary needs or "I'll be a bit late" — not an essay. */
export const RSVP_NOTE_MAX = 300;

/** Today as a `YYYY-MM-DD` calendar day on the device's own clock. */
export function todayISO(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The last day replies are taken: the deadline, or the day of the event. */
export function rsvpClosesOn(event: VolunteerEvent): string {
  return event.rsvpDeadline ?? event.date;
}

export function eventHasPassed(event: VolunteerEvent, today = todayISO()): boolean {
  return event.date < today;
}

/**
 * Whether to offer the reply buttons at all.
 *
 * A cancelled event, a save-the-date, and a closed deadline all read the same
 * way to the guest: nothing to answer.
 */
export function canReply(event: VolunteerEvent, today = todayISO()): boolean {
  return (
    event.status === 'PUBLISHED' &&
    event.rsvpEnabled &&
    !eventHasPassed(event, today) &&
    today <= rsvpClosesOn(event)
  );
}

/** Why the buttons aren't there, or null while replies are open. */
export function rsvpClosedMessage(event: VolunteerEvent, today = todayISO()): string | null {
  if (canReply(event, today)) return null;
  if (event.status === 'CANCELLED') return 'This event has been cancelled.';
  if (event.status === 'DRAFT') return "This event hasn't been shared yet.";
  if (!event.rsvpEnabled) return "Replies aren't being collected for this one.";
  if (eventHasPassed(event, today)) return 'This event has been and gone.';
  return 'Replies for this event have closed.';
}

/**
 * "12 going · 3 maybe" — seeing who else is coming is what makes people reply,
 * so the going count is always named, even at zero.
 */
export function formatRsvpTally(event: Pick<VolunteerEvent, 'goingCount' | 'maybeCount'>): string {
  const parts = [`${event.goingCount} going`];
  if (event.maybeCount > 0) parts.push(`${event.maybeCount} maybe`);
  return parts.join(' · ');
}
