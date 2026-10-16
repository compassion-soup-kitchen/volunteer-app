/**
 * Leave - time someone is away from the kitchen. Mirrors the rules in the web
 * app's `leave.ts`; the server has the final say on everything,
 * these keep the screens (and the offline mock) honest about what it will do.
 *
 * Dates are `YYYY-MM-DD` and a range is inclusive at both ends - "3 to 14
 * November" means back on the 15th.
 */

import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import type { Role } from '@/types/models';

export type LeaveRange = { startsOn: string; endsOn: string };

export type LeaveStage = 'upcoming' | 'current' | 'past';

/**
 * Whether the profile screen offers leave. A volunteer gets it once they're
 * past onboarding - before then there's no roster to be away from. The
 * kitchen team keep leave whether or not they volunteer (a coordinator with no
 * volunteer record reads as still onboarding), so they always do.
 */
export function offersLeave(input: { role: Role; onboarding: boolean }): boolean {
  return input.role === 'COORDINATOR' || input.role === 'ADMIN' || !input.onboarding;
}

/** Matches the server: a short note, not a medical history. */
export const LEAVE_REASON_MAX = 120;

/** Longer than a year is a pause, not leave. */
export const MAX_LEAVE_DAYS = 366;

export function leaveStage(range: LeaveRange, today: string): LeaveStage {
  if (range.endsOn < today) return 'past';
  if (range.startsOn > today) return 'upcoming';
  return 'current';
}

export function coversDay(range: LeaveRange, date: string): boolean {
  return range.startsOn <= date && date <= range.endsOn;
}

export function rangesOverlap(a: LeaveRange, b: LeaveRange): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

/** Days covered, both ends included. */
export function leaveLength(range: LeaveRange): number {
  return differenceInCalendarDays(parseISO(range.endsOn), parseISO(range.startsOn)) + 1;
}

export function addDaysIso(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

/**
 * "Tue 3 Nov", "3 – 14 Nov", "28 Nov – 4 Dec", "21 Dec 2026 – 8 Jan 2027".
 * The year shows only when the range crosses one or isn't this year.
 */
export function formatLeaveRange(range: LeaveRange, today?: string): string {
  const { startsOn, endsOn } = range;
  const sameYear = startsOn.slice(0, 4) === endsOn.slice(0, 4);
  const showYear = !sameYear || (today !== undefined && startsOn.slice(0, 4) !== today.slice(0, 4));
  const start = parseISO(startsOn);
  const end = parseISO(endsOn);

  if (startsOn === endsOn) return format(start, showYear ? 'EEE d MMM yyyy' : 'EEE d MMM');

  const endText = format(end, showYear ? 'd MMM yyyy' : 'd MMM');
  const sameMonth = sameYear && startsOn.slice(5, 7) === endsOn.slice(5, 7);
  const startText = sameMonth ? format(start, 'd') : format(start, sameYear ? 'd MMM' : 'd MMM yyyy');
  return `${startText} – ${endText}`;
}

/** "1 day", "12 days". */
export function formatLeaveLength(range: LeaveRange): string {
  const days = leaveLength(range);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** "Away until Fri 14 Nov", "Starts Tue 3 Nov", "Back on Sun 15 Nov". */
export function describeLeaveStatus(range: LeaveRange, today: string): string {
  const stage = leaveStage(range, today);
  const day = (date: string) => format(parseISO(date), 'EEE d MMM');
  if (stage === 'current') {
    return range.endsOn === today ? 'Away today, back tomorrow' : `Away until ${day(range.endsOn)}`;
  }
  if (stage === 'upcoming') return `Starts ${day(range.startsOn)}`;
  return `Back on ${day(addDaysIso(range.endsOn, 1))}`;
}

/**
 * Why the dates on the form can't be saved yet, or null. Only what the form
 * itself can know - overlaps and the rest come back from the server preview.
 */
export function leaveFormProblem(input: {
  startsOn: string;
  endsOn: string;
  today: string;
  /** The leave being changed, if it's already under way. */
  existing?: LeaveRange | null;
}): string | null {
  const { startsOn, endsOn, today, existing } = input;
  if (!startsOn) return 'Choose the first day you’re away.';
  if (!endsOn) return 'Choose the last day you’re away.';
  if (endsOn < startsOn) return 'The last day away can’t be before the first.';
  if (endsOn < today) return 'That leave has already finished - choose dates from today on.';
  if (existing && leaveStage(existing, today) === 'current' && startsOn !== existing.startsOn) {
    return 'That leave has already started, so its first day can’t move.';
  }
  if (leaveLength({ startsOn, endsOn }) > MAX_LEAVE_DAYS) {
    return 'Leave can be up to a year at a time. For longer, talk to the kitchen.';
  }
  return null;
}

/** What can be done to a stretch of leave from the app. */
export function leaveActions(range: LeaveRange, today: string): {
  canEdit: boolean;
  canEndNow: boolean;
  canCancel: boolean;
} {
  const stage = leaveStage(range, today);
  return {
    canEdit: stage !== 'past',
    canEndNow: stage === 'current',
    canCancel: stage === 'upcoming',
  };
}

/** What happens to the shifts given up if plans change - regular seats come back, chosen ones don't. */
export function afterLeaveNote(shifts: { isRegular: boolean }[]): string {
  const regular = shifts.some((shift) => shift.isRegular);
  const chosen = shifts.some((shift) => !shift.isRegular);
  const back = 'Regular spots come back if you shorten or cancel your leave.';
  if (regular && !chosen) return back;
  const again = `You can sign up again${regular ? ' for the others' : ''} if your plans change and there’s still room.`;
  return regular ? `${back} ${again}` : again;
}
