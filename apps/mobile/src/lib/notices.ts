/**
 * Which notices (pānui) are new to the volunteer. The app remembers when they
 * last opened the notices feed, as the publish time of the newest notice they
 * saw then; anything published after it is unread.
 *
 * Keyed on publish time, not ids, so it needs one stored value however many
 * notices come and go, and a notice deleted after being seen can't leave a
 * stale count behind.
 */

type Published = { publishedAt: string };

/** How many notices were published after `lastSeenAt` (all of them when never opened). */
export function countUnread(notices: readonly Published[], lastSeenAt: string | null): number {
  if (!lastSeenAt) return notices.length;
  const seen = Date.parse(lastSeenAt);
  return notices.filter((notice) => Date.parse(notice.publishedAt) > seen).length;
}

/** The value to remember once the feed has been opened: the newest publish time, or null with none. */
export function newestPublishedAt(notices: readonly Published[]): string | null {
  let newest: string | null = null;
  for (const notice of notices) {
    if (!newest || Date.parse(notice.publishedAt) > Date.parse(newest)) newest = notice.publishedAt;
  }
  return newest;
}

/** VoiceOver label for the notices bell: `Notices, 2 unread`. */
export function noticesBellLabel(unread: number): string {
  return unread > 0 ? `Notices, ${unread} unread` : 'Notices';
}
