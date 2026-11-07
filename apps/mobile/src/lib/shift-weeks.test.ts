import { describe, expect, it } from 'vitest';

import { pageByWeek, weekEndOf, weekStartOf } from '@/lib/shift-weeks';

// Wednesday.
const TODAY = '2026-11-11';
const on = (date: string) => ({ date, id: date });

describe('weekStartOf / weekEndOf', () => {
  it('runs Monday to Sunday', () => {
    expect(weekStartOf('2026-11-11')).toBe('2026-11-09');
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09');
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09');
    expect(weekEndOf('2026-11-09')).toBe('2026-11-15');
  });

  it('crosses a year', () => {
    expect(weekStartOf('2027-01-01')).toBe('2026-12-28');
    expect(weekEndOf('2026-12-28')).toBe('2027-01-03');
  });
});

describe('pageByWeek', () => {
  const items = [on('2026-11-10'), on('2026-11-11'), on('2026-11-15'), on('2026-11-16'), on('2026-12-01')];

  it('starts at today, not Monday, and points at the next week', () => {
    expect(pageByWeek(items, TODAY)).toEqual({
      weekStart: '2026-11-09',
      items: [on('2026-11-11'), on('2026-11-15')],
      nextWeek: '2026-11-16',
    });
  });

  it('follows `from`, skipping empty weeks to the next one with anything on', () => {
    expect(pageByWeek(items, TODAY, '2026-11-16')).toEqual({
      weekStart: '2026-11-16',
      items: [on('2026-11-16')],
      nextWeek: '2026-11-30',
    });
    expect(pageByWeek(items, TODAY, '2026-11-23')).toEqual({
      weekStart: '2026-11-30',
      items: [on('2026-12-01')],
      nextWeek: null,
    });
  });

  it('never pages back before today', () => {
    expect(pageByWeek(items, TODAY, '2026-10-05').items[0]).toEqual(on('2026-11-11'));
  });

  it('is an empty, final page when nothing is left', () => {
    expect(pageByWeek(items, '2026-12-02')).toEqual({ weekStart: null, items: [], nextWeek: null });
  });
});
