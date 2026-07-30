import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiUserSmileLine,
} from "@remixicon/react";

import { formatDateOnly } from "@/lib/date-only";
import {
  formatEventTimeRange,
  formatRsvpTally,
  type RsvpCounts,
} from "@/lib/event-rsvp";
import { cn } from "@/lib/utils";

interface EventFactsProps {
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  /** Shown only when replies are being collected — a tally of nothing reads oddly. */
  counts?: RsvpCounts | null;
  className?: string;
}

/**
 * When, where, and who's coming — the four facts every event surface repeats.
 *
 * One component so the icon vocabulary and the date treatment can't drift
 * between the staff list, the news feed and the events page.
 */
export function EventFacts({
  date,
  startTime,
  endTime,
  location,
  counts = null,
  className,
}: EventFactsProps) {
  const times = formatEventTimeRange(startTime, endTime);

  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      <li className="flex items-center gap-2">
        <RiCalendarEventLine
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="font-medium">
          {formatDateOnly(date, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </li>
      {times ? (
        <li className="flex items-center gap-2 text-muted-foreground">
          <RiTimeLine className="size-4 shrink-0" aria-hidden />
          <span>{times}</span>
        </li>
      ) : null}
      {location ? (
        <li className="flex items-center gap-2 text-muted-foreground">
          <RiMapPinLine className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0">{location}</span>
        </li>
      ) : null}
      {counts ? (
        <li className="flex items-center gap-2 text-muted-foreground">
          <RiUserSmileLine className="size-4 shrink-0" aria-hidden />
          <span className="tnum">{formatRsvpTally(counts)}</span>
        </li>
      ) : null}
    </ul>
  );
}
