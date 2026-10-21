/**
 * Spoken labels for VoiceOver / TalkBack, where a card reads as one element and
 * its visible pieces (a date block, an icon row, a status badge) need putting
 * into a sentence.
 */

import { formatLongDate, formatTimeRange } from '@/lib/format';

/**
 * `Kitchen, Sunday 28 June, 9am – 1pm, 3 spots left` - everything the
 * shift card shows, in reading order. The date is spelled out: VoiceOver reads
 * an abbreviated "Sun" as the star.
 */
export function shiftCardLabel({
  areaName,
  date,
  startTime,
  endTime,
  meta,
  badge,
}: {
  areaName: string;
  date: string;
  startTime: string;
  endTime: string;
  meta?: string;
  badge?: string;
}): string {
  return [areaName, formatLongDate(date), formatTimeRange(startTime, endTime), meta, badge]
    .filter(Boolean)
    .join(', ');
}
