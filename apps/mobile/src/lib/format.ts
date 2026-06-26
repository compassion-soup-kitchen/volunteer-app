/**
 * Date and time formatting helpers. Dates are `YYYY-MM-DD`, times are `HH:mm`.
 */

import { differenceInCalendarDays, format, parseISO } from 'date-fns';

function parseDate(date: string): Date {
  return parseISO(date);
}

/** `Sun 28 Jun` */
export function formatShiftDate(date: string): string {
  return format(parseDate(date), 'EEE d MMM');
}

/** `Sunday 28 June` */
export function formatLongDate(date: string): string {
  return format(parseDate(date), 'EEEE d MMMM');
}

/** `June 2026` */
export function formatMonthYear(date: string): string {
  return format(parseDate(date), 'MMMM yyyy');
}

/** `9:00 am` from `09:00` */
export function formatTime(time: string): string {
  const [hStr, m] = time.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

/** `9:00 am – 1:00 pm` */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Friendly relative label: Today / Tomorrow / weekday / date. */
export function relativeDay(date: string): string {
  const diff = differenceInCalendarDays(parseDate(date), new Date());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return format(parseDate(date), 'EEEE');
  return formatShiftDate(date);
}

/** Splits an `HH:mm`–`HH:mm` shift into whole/fractional hours, e.g. `4h`, `2h 30m`. */
export function formatDuration(hours: number): string {
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  if (mins === 0) return `${whole}h`;
  if (whole === 0) return `${mins}m`;
  return `${whole}h ${mins}m`;
}
