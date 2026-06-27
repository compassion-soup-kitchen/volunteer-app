/**
 * Date and time formatting helpers. Dates are `YYYY-MM-DD`, times are `HH:mm`.
 */

import { differenceInCalendarDays, differenceInMonths, differenceInYears, format, parseISO } from 'date-fns';

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

/**
 * Urgency label for an upcoming date: Today / Tomorrow / In N days / Next week /
 * date. `imminent` is true for today and tomorrow, so the UI can lift the
 * emphasis on time-sensitive shifts.
 */
export function countdownLabel(date: string): { label: string; imminent: boolean } {
  const diff = differenceInCalendarDays(parseDate(date), new Date());
  if (diff <= 0) return { label: 'Today', imminent: true };
  if (diff === 1) return { label: 'Tomorrow', imminent: true };
  if (diff < 7) return { label: `In ${diff} days`, imminent: false };
  if (diff < 14) return { label: 'Next week', imminent: false };
  return { label: formatShiftDate(date), imminent: false };
}

/** Warm relative timestamp for notices: Just now / 5m ago / 3h ago / Yesterday / date. */
export function formatRelativeTime(iso: string): string {
  const then = parseISO(iso);
  const now = new Date();
  const mins = Math.round((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = differenceInCalendarDays(now, then);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatShiftDate(iso);
}

/**
 * Warm tenure label from a join date: `8 days`, `4 months`, `1 year 2 months`.
 * Grounds the profile identity without leaning on the Impact tab's figures.
 */
export function formatTenure(date: string): string {
  const start = parseDate(date);
  const now = new Date();
  const years = differenceInYears(now, start);
  const totalMonths = differenceInMonths(now, start);

  if (years >= 1) {
    const months = totalMonths - years * 12;
    const y = `${years} ${years === 1 ? 'year' : 'years'}`;
    return months > 0 ? `${y} ${months} ${months === 1 ? 'month' : 'months'}` : y;
  }
  if (totalMonths >= 1) return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
  const days = Math.max(0, differenceInCalendarDays(now, start));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Splits an `HH:mm`–`HH:mm` shift into whole/fractional hours, e.g. `4h`, `2h 30m`. */
export function formatDuration(hours: number): string {
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  if (mins === 0) return `${whole}h`;
  if (whole === 0) return `${mins}m`;
  return `${whole}h ${mins}m`;
}
