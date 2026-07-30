"use client";

import { useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import { RiLoader4Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatFigure } from "@/components/brand/stat-figure";
import { RsvpControl } from "@/components/event/rsvp-control";
import {
  awaitingReply,
  canRespondToEvent,
  rsvpClosedMessage,
  RSVP_TALLY_LABELS,
  summariseRsvps,
  type RsvpResponse,
} from "@/lib/event-rsvp";
import { getEventGuests, type EventGuest, type StaffEvent } from "@/lib/event-actions";

const RESPONSE_VARIANTS: Record<RsvpResponse, "success" | "warning" | "neutral"> = {
  GOING: "success",
  MAYBE: "warning",
  NOT_GOING: "neutral",
};

const ROLE_LABELS: Partial<Record<Role, string>> = {
  COORDINATOR: "Coordinator",
  ADMIN: "Admin",
};

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-medium text-muted-foreground">{label}</dt>
      <dd>
        <StatFigure value={value} size="md" />
      </dd>
    </div>
  );
}

interface GuestListDialogProps {
  /** The event whose list is open. Mount this only when there is one. */
  event: StaffEvent;
  viewerRole: Role;
  today: string;
  onOpenChange: (open: boolean) => void;
  onReplied: () => void;
}

/**
 * Who's coming — and, just as usefully, who hasn't answered yet.
 *
 * The coordinator's own reply sits at the top: they're on the invite list for
 * anything addressed to staff, and this is where they're already looking.
 */
export function GuestListDialog({
  event,
  viewerRole,
  today,
  onOpenChange,
  onReplied,
}: GuestListDialogProps) {
  // Null while it loads. The dialog is mounted per event (keyed by id), so this
  // starts fresh every time rather than being reset in an effect.
  const [guests, setGuests] = useState<EventGuest[] | null>(null);
  // A failed read has to be told apart from an empty list, or "nobody is
  // invited" would be shown for what is really a broken connection.
  const [failed, setFailed] = useState(false);
  // Bumped after a reply, to re-read the list the reply just changed.
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let current = true;
    getEventGuests(event.id)
      .then((list) => {
        if (current) setGuests(list);
      })
      .catch((err) => {
        console.error("Could not load the guest list:", err);
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [event.id, reloads]);

  /**
   * The tallies come from the guest list rather than from the row that opened
   * this dialog: one source of truth, so replying updates the numbers, the
   * badges and "no reply" together instead of leaving them disagreeing.
   */
  const counts = guests
    ? summariseRsvps(
        guests.map((guest) => guest.response).filter((r): r is RsvpResponse => r !== null)
      )
    : event.counts;
  const inviteeCount = guests ? guests.length : event.inviteeCount;
  const outstanding = awaitingReply(counts, inviteeCount);
  const eligibility = canRespondToEvent(event, viewerRole, today);
  const closed = rsvpClosedMessage(event, today);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            Who&apos;s coming, and who is yet to reply.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-4 gap-3 rounded-lg bg-secondary/40 px-4 py-3">
          <Tally label="Going" value={counts.going} />
          <Tally label="Maybe" value={counts.maybe} />
          <Tally label="Can't" value={counts.notGoing} />
          <Tally label="No reply" value={outstanding} />
        </dl>

        {eligibility.ok ? (
          <div className="space-y-2">
            <p className="eyebrow text-[0.62rem] text-muted-foreground">Your reply</p>
            <RsvpControl
              eventId={event.id}
              response={event.myRsvp?.response ?? null}
              note={event.myRsvp?.note ?? null}
              showNote={false}
              onReplied={() => {
                setReloads((n) => n + 1);
                onReplied();
              }}
            />
          </div>
        ) : closed ? (
          <p className="text-xs text-muted-foreground">{closed}</p>
        ) : null}

        <Separator />

        <div className="max-h-[45vh] overflow-y-auto">
          {failed ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                The guest list didn&apos;t load.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFailed(false);
                  setGuests(null);
                  setReloads((n) => n + 1);
                }}
              >
                Try again
              </Button>
            </div>
          ) : guests === null ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <RiLoader4Line className="size-4 animate-spin" aria-hidden />
              Loading the guest list…
            </div>
          ) : guests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nobody is invited to this one yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {guests.map((guest) => (
                <li key={guest.userId} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                      <span className="min-w-0 truncate">{guest.name}</span>
                      {ROLE_LABELS[guest.role] ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {ROLE_LABELS[guest.role]}
                        </span>
                      ) : null}
                    </p>
                    {guest.note ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        “{guest.note}”
                      </p>
                    ) : null}
                  </div>
                  {guest.response ? (
                    <Badge variant={RESPONSE_VARIANTS[guest.response]}>
                      {RSVP_TALLY_LABELS[guest.response]}
                    </Badge>
                  ) : (
                    <Badge variant="outline">No reply</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
