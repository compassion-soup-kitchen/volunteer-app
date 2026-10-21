import { describe, expect, it } from 'vitest';

import { countUnread, newestPublishedAt, noticesBellLabel } from '@/lib/notices';

const notices = [
  { publishedAt: '2026-10-20T09:00:00.000Z' },
  { publishedAt: '2026-10-21T02:30:00.000Z' },
  { publishedAt: '2026-10-18T22:00:00.000Z' },
];

describe('countUnread', () => {
  it('counts every notice when the feed has never been opened', () => {
    expect(countUnread(notices, null)).toBe(3);
  });

  it('counts only notices published after the last one seen', () => {
    expect(countUnread(notices, '2026-10-20T09:00:00.000Z')).toBe(1);
    expect(countUnread(notices, '2026-10-21T02:30:00.000Z')).toBe(0);
  });

  it('compares instants, not strings, so offsets agree with UTC', () => {
    expect(countUnread(notices, '2026-10-21T15:30:00+13:00')).toBe(0);
    expect(countUnread(notices, '2026-10-21T15:29:00+13:00')).toBe(1);
  });

  it('has nothing unread with no notices', () => {
    expect(countUnread([], null)).toBe(0);
  });
});

describe('newestPublishedAt', () => {
  it('picks the latest publish time whatever the order', () => {
    expect(newestPublishedAt(notices)).toBe('2026-10-21T02:30:00.000Z');
  });

  it('is null with no notices', () => {
    expect(newestPublishedAt([])).toBeNull();
  });
});

describe('noticesBellLabel', () => {
  it('says how many are unread', () => {
    expect(noticesBellLabel(2)).toBe('Notices, 2 unread');
    expect(noticesBellLabel(1)).toBe('Notices, 1 unread');
  });

  it('is just "Notices" when everything has been seen', () => {
    expect(noticesBellLabel(0)).toBe('Notices');
  });
});
