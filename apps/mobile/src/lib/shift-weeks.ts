/**
 * The Shifts tab pages through the roster a week at a time. The server does
 * the paging against the real API (`/api/v1/shifts/week`); these are the same
 * rules for the mock database, kept pure so they can be tested.
 */

import { addDays, format, parseISO, startOfWeek } from 'date-fns';

/** Monday of the week a `YYYY-MM-DD` day falls in. */
export function weekStartOf(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

/** Sunday of the week a `YYYY-MM-DD` day falls in. */
export function weekEndOf(date: string): string {
  return format(addDays(parseISO(weekStartOf(date)), 6), 'yyyy-MM-dd');
}

export type WeekPage<T> = { weekStart: string | null; items: T[]; nextWeek: string | null };

/**
 * The first week on or after `from` (never before `today`) that has anything
 * in it, plus the Monday of the next week that does. Empty weeks are skipped
 * both ways, so following `nextWeek` never lands on a blank page.
 *
 * `items` must be sorted by date.
 */
export function pageByWeek<T extends { date: string }>(items: readonly T[], today: string, from?: string): WeekPage<T> {
  const floor = from && from > today ? from : today;
  const first = items.find((item) => item.date >= floor);
  if (!first) return { weekStart: null, items: [], nextWeek: null };

  const weekStart = weekStartOf(first.date);
  const weekEnd = weekEndOf(first.date);
  const next = items.find((item) => item.date > weekEnd);

  return {
    weekStart,
    items: items.filter((item) => item.date >= floor && item.date <= weekEnd),
    nextWeek: next ? weekStartOf(next.date) : null,
  };
}
