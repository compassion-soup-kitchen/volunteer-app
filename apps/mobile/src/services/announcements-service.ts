/**
 * Announcements service. Mirrors `getAnnouncements` in the web app; against
 * the real API it calls `/api/v1/announcements`.
 *
 * Volunteers see notices addressed to everyone (`ALL`) or to volunteers
 * (`VOLUNTEERS`); coordinator-only notices are filtered out. Pinned notices
 * float to the top, then newest first.
 */

import { db } from '@/data/mock-db';
import type { Announcement } from '@/types/models';

import { apiFetch, ApiError, delay, USE_MOCK } from './client';

/** Audiences a VOLUNTEER is allowed to see. */
const VISIBLE = new Set<Announcement['audience']>(['ALL', 'VOLUNTEERS']);

function sortForFeed(notices: Announcement[]): Announcement[] {
  return notices.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (!USE_MOCK) {
    return sortForFeed(await apiFetch<Announcement[]>('/api/v1/announcements'));
  }

  await delay(160);
  return sortForFeed(db.announcements.filter((a) => VISIBLE.has(a.audience)));
}

/** A single notice, or `null` if it's gone or not visible to volunteers. */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<Announcement>(`/api/v1/announcements/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  await delay(140);
  const a = db.announcements.find((x) => x.id === id);
  return a && VISIBLE.has(a.audience) ? a : null;
}
