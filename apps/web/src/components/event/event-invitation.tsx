import type { Role } from "@prisma/client";
import { RiCalendarEventLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { EventFacts } from "@/components/event/event-facts";
import { RsvpControl } from "@/components/event/rsvp-control";
import { formatDateOnly } from "@/lib/date-only";
import {
  canRespondToEvent,
  rsvpClosedMessage,
  type EventRules,
  type RsvpCounts,
  type RsvpResponse,
} from "@/lib/event-rsvp";
import { cn } from "@/lib/utils";

/** Everything an invitation needs to render — the shape both event reads share. */
export type InvitationEvent = EventRules & {
  id: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  counts: RsvpCounts;
  myRsvp: { response: RsvpResponse; note: string | null } | null;
};

const REPLY_BADGES: Record<RsvpResponse, { label: string; variant: "success" | "warning" | "neutral" }> = {
  GOING: { label: "You're going", variant: "success" },
  MAYBE: { label: "You said maybe", variant: "warning" },
  NOT_GOING: { label: "You can't make it", variant: "neutral" },
};

interface EventInvitationProps {
  event: InvitationEvent;
  /** The reader's role, which decides whether they're on the invite list. */
  role: Role;
  /** Today on the kitchen's calendar, from `todayInAppZone()`. */
  today: string;
  /** Show the event's own name and blurb. Off when the surface already said it. */
  showTitle?: boolean;
  className?: string;
}

/**
 * An invitation: when, where, who's coming, and the reply.
 *
 * A Server Component, so the tallies are always the real ones; only the reply
 * buttons inside are interactive.
 */
export function EventInvitation({
  event,
  role,
  today,
  showTitle = true,
  className,
}: EventInvitationProps) {
  const eligibility = canRespondToEvent(event, role, today);
  const closed = rsvpClosedMessage(event, today);
  const reply = event.myRsvp ? REPLY_BADGES[event.myRsvp.response] : null;
  const cancelled = event.status === "CANCELLED";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={cancelled ? "destructive" : "default"}>
          <RiCalendarEventLine aria-hidden />
          {cancelled ? "Cancelled" : "You're invited"}
        </Badge>
        {reply && !cancelled ? (
          <Badge variant={reply.variant}>{reply.label}</Badge>
        ) : null}
      </div>

      {showTitle ? (
        <div className="space-y-1.5">
          <h3 className="font-serif text-lg font-medium tracking-tight text-balance">
            {event.title}
          </h3>
          {event.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <EventFacts
        date={event.date}
        startTime={event.startTime}
        endTime={event.endTime}
        location={event.location}
        counts={event.rsvpEnabled && !cancelled ? event.counts : null}
      />

      {cancelled ? (
        <p className="text-sm text-muted-foreground">
          This one isn&apos;t going ahead. Sorry for the change of plan.
        </p>
      ) : eligibility.ok ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Can you come?</p>
          {event.rsvpDeadline ? (
            <p className="text-xs text-muted-foreground">
              Please reply by{" "}
              {formatDateOnly(event.rsvpDeadline, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              .
            </p>
          ) : null}
          <RsvpControl
            eventId={event.id}
            response={event.myRsvp?.response ?? null}
            note={event.myRsvp?.note ?? null}
          />
        </div>
      ) : closed ? (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {closed}
        </p>
      ) : null}
    </div>
  );
}
