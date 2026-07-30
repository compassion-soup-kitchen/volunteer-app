/**
 * Events service. Mirrors `getUpcomingEvents` / `respondToEvent` in the web
 * app; against the real API it calls `/api/v1/events`.
 *
 * The API only ever returns events this volunteer is invited to, so there is no
 * audience filtering to do here.
 */

import { db, isPast } from '@/data/mock-db';
import { canReply } from '@/lib/events';
import type { ActionResult, RsvpResponse, VolunteerEvent } from '@/types/models';

import { apiFetch, ApiError, delay, toActionError, USE_MOCK } from './client';

/** Soonest first — an invitation is about what's next. */
function sortByDate(events: VolunteerEvent[]): VolunteerEvent[] {
  return events
    .slice()
    .sort((a, b) => (a.date + (a.startTime ?? '')).localeCompare(b.date + (b.startTime ?? '')));
}

function visible(event: VolunteerEvent): boolean {
  return event.status !== 'DRAFT';
}

export async function getUpcomingEvents(): Promise<VolunteerEvent[]> {
  if (!USE_MOCK) return apiFetch<VolunteerEvent[]>('/api/v1/events');

  await delay(150);
  return sortByDate(db.events.filter((e) => visible(e) && !isPast(e.date)));
}

export async function getPastEvents(): Promise<VolunteerEvent[]> {
  if (!USE_MOCK) return apiFetch<VolunteerEvent[]>('/api/v1/events?past=1');

  await delay(150);
  return sortByDate(db.events.filter((e) => visible(e) && isPast(e.date))).reverse();
}

/** A single event, or `null` if it's gone or not for this volunteer. */
export async function getEventById(id: string): Promise<VolunteerEvent | null> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<VolunteerEvent>(`/api/v1/events/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  await delay(140);
  const event = db.events.find((e) => e.id === id);
  return event && visible(event) ? event : null;
}

/**
 * Records this volunteer's reply, or changes the one they already gave.
 *
 * The server has the final say — these mock checks only keep the offline
 * experience honest about what it would refuse.
 */
export async function respondToEvent(
  eventId: string,
  response: RsvpResponse,
  note?: string | null,
): Promise<ActionResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<ActionResult>(
        `/api/v1/events/${encodeURIComponent(eventId)}/rsvp`,
        { method: 'POST', body: JSON.stringify({ response, note: note ?? null }) },
      );
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const event = db.events.find((e) => e.id === eventId);
  if (!event) return { error: 'That event could not be found.' };
  if (!canReply(event)) return { error: 'Replies for this event have closed.' };

  // Move this volunteer between the tallies, so the counts stay believable as
  // they change their mind. Announcements hold the same object, so the feed
  // updates with it.
  if (event.myResponse === 'GOING') event.goingCount = Math.max(0, event.goingCount - 1);
  if (event.myResponse === 'MAYBE') event.maybeCount = Math.max(0, event.maybeCount - 1);
  if (response === 'GOING') event.goingCount += 1;
  if (response === 'MAYBE') event.maybeCount += 1;

  event.myResponse = response;
  event.myNote = note?.trim() ? note.trim() : null;

  return { success: true };
}
