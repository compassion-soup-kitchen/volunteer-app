import { describe, expect, it } from 'vitest';

import {
  canReply,
  eventHasPassed,
  formatRsvpTally,
  rsvpClosedMessage,
  rsvpClosesOn,
  todayISO,
} from '@/lib/events';
import type { VolunteerEvent } from '@/types/models';

const TODAY = '2026-12-01';

function event(overrides: Partial<VolunteerEvent> = {}): VolunteerEvent {
  return {
    id: 'ev-1',
    title: 'Christmas party',
    description: 'Kai and waiata.',
    date: '2026-12-20',
    startTime: '18:00',
    endTime: '21:00',
    location: '132 Tory Street',
    audience: 'ALL',
    status: 'PUBLISHED',
    rsvpEnabled: true,
    rsvpDeadline: null,
    goingCount: 0,
    maybeCount: 0,
    myResponse: null,
    myNote: null,
    ...overrides,
  };
}

describe('todayISO', () => {
  it('reads the local calendar day, not the UTC one', () => {
    // 9am on 1 December in Aotearoa is still 30 November in UTC; the calendar
    // day the guest sees has to be theirs.
    const localMorning = new Date(2026, 11, 1, 9, 0, 0);
    expect(todayISO(localMorning)).toBe('2026-12-01');
  });

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('rsvpClosesOn', () => {
  it('falls back to the day of the event', () => {
    expect(rsvpClosesOn(event())).toBe('2026-12-20');
  });

  it('uses the deadline when there is one', () => {
    expect(rsvpClosesOn(event({ rsvpDeadline: '2026-12-10' }))).toBe('2026-12-10');
  });
});

describe('eventHasPassed', () => {
  it('counts the day of the event as still to come', () => {
    expect(eventHasPassed(event(), '2026-12-20')).toBe(false);
    expect(eventHasPassed(event(), '2026-12-21')).toBe(true);
  });
});

describe('canReply', () => {
  it('is open on a shared event before the deadline', () => {
    expect(canReply(event(), TODAY)).toBe(true);
    expect(canReply(event({ rsvpDeadline: '2026-12-10' }), '2026-12-10')).toBe(true);
  });

  it('is shut past the deadline, once it has been, and when cancelled', () => {
    expect(canReply(event({ rsvpDeadline: '2026-12-10' }), '2026-12-11')).toBe(false);
    expect(canReply(event(), '2026-12-21')).toBe(false);
    expect(canReply(event({ status: 'CANCELLED' }), TODAY)).toBe(false);
    expect(canReply(event({ status: 'DRAFT' }), TODAY)).toBe(false);
    expect(canReply(event({ rsvpEnabled: false }), TODAY)).toBe(false);
  });
});

describe('rsvpClosedMessage', () => {
  it('says nothing while replies are open', () => {
    expect(rsvpClosedMessage(event(), TODAY)).toBeNull();
  });

  it('explains each way replies can be shut', () => {
    expect(rsvpClosedMessage(event({ status: 'CANCELLED' }), TODAY)).toBe(
      'This event has been cancelled.',
    );
    expect(rsvpClosedMessage(event({ rsvpEnabled: false }), TODAY)).toBe(
      "Replies aren't being collected for this one.",
    );
    expect(rsvpClosedMessage(event(), '2026-12-21')).toBe('This event has been and gone.');
    expect(rsvpClosedMessage(event({ rsvpDeadline: '2026-12-10' }), '2026-12-11')).toBe(
      'Replies for this event have closed.',
    );
  });
});

describe('formatRsvpTally', () => {
  it('always names the going count and adds maybes only when there are some', () => {
    expect(formatRsvpTally({ goingCount: 0, maybeCount: 0 })).toBe('0 going');
    expect(formatRsvpTally({ goingCount: 12, maybeCount: 3 })).toBe('12 going · 3 maybe');
    expect(formatRsvpTally({ goingCount: 12, maybeCount: 0 })).toBe('12 going');
  });
});
