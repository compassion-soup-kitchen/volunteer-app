/**
 * Announcements service (mock). Mirrors `getAnnouncements` in the web app.
 *
 * Volunteers see notices addressed to everyone (`ALL`) or to volunteers
 * (`VOLUNTEERS`); coordinator-only notices are filtered out. Pinned notices
 * float to the top, then newest first.
 */

import { db } from '@/data/mock-db';
import type { Announcement } from '@/types/models';

import { delay } from './client';

/** Audiences a VOLUNTEER is allowed to see. */
const VISIBLE = new Set<Announcement['audience']>(['ALL', 'VOLUNTEERS']);

export async function getAnnouncements(): Promise<Announcement[]> {
  await delay(160);
  return db.announcements
    .filter((a) => VISIBLE.has(a.audience))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}
