"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import {
  RiAddLine,
  RiCalendarEventLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeOffLine,
  RiGroupLine,
  RiMegaphoneLine,
  RiMoreLine,
  RiSendPlaneLine,
  RiCloseCircleLine,
} from "@remixicon/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateBlock } from "@/components/brand/date-block";
import { Illustration } from "@/components/brand/illustration";
import { SectionHeader } from "@/components/brand/section-header";
import { EventFacts } from "@/components/event/event-facts";
import { formatDateOnly, todayInAppZone } from "@/lib/date-only";
import {
  awaitingReply,
  eventHasPassed,
  rsvpsAreOpen,
  type EventRules,
} from "@/lib/event-rsvp";
import {
  cancelEvent,
  deleteEvent,
  getStaffEvents,
  publishEvent,
  unpublishEvent,
  type StaffEvent,
} from "@/lib/event-actions";
import { EventFormDialog } from "./event-form-dialog";
import { GuestListDialog } from "./guest-list-dialog";
import { AnnounceEventDialog } from "./announce-event-dialog";

const AUDIENCE_LABELS: Record<StaffEvent["audience"], string> = {
  ALL: "Everyone",
  VOLUNTEERS: "Volunteers",
  COORDINATORS: "Coordinators",
};

const STATUS_BADGES: Record<
  StaffEvent["status"],
  { label: string; variant: "success" | "neutral" | "destructive" }
> = {
  PUBLISHED: { label: "Shared", variant: "success" },
  DRAFT: { label: "Draft", variant: "neutral" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

interface EventManagerProps {
  initialEvents: StaffEvent[];
  viewerRole: Role;
}

export function EventManager({ initialEvents, viewerRole }: EventManagerProps) {
  const [events, setEvents] = useState(initialEvents);
  const [, startTransition] = useTransition();

  const [formTarget, setFormTarget] = useState<StaffEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [guestsTarget, setGuestsTarget] = useState<StaffEvent | null>(null);
  // Announcing only needs the event's name and id — it can be a freshly created
  // one the list hasn't caught up with yet.
  const [announceTarget, setAnnounceTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [publishTarget, setPublishTarget] = useState<StaffEvent | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StaffEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffEvent | null>(null);
  const [working, setWorking] = useState(false);

  const today = todayInAppZone();

  function refresh() {
    startTransition(async () => {
      setEvents(await getStaffEvents());
    });
  }

  function openCreate() {
    setFormTarget(null);
    setFormOpen(true);
  }

  function openEdit(event: StaffEvent) {
    setFormTarget(event);
    setFormOpen(true);
  }

  async function run(
    action: () => Promise<{ error?: string; success?: boolean }>,
    successMessage: string
  ) {
    setWorking(true);
    const result = await action();
    setWorking(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    refresh();
  }

  const upcoming = events.filter(
    (event) => event.status !== "DRAFT" && !eventHasPassed(event, today)
  );
  const drafts = events.filter((event) => event.status === "DRAFT");
  const past = events.filter(
    (event) => event.status !== "DRAFT" && eventHasPassed(event, today)
  );

  const sections: { key: string; eyebrow: string; title: string; items: StaffEvent[] }[] = [
    { key: "upcoming", eyebrow: "Kei te haere", title: "Coming up", items: upcoming },
    { key: "drafts", eyebrow: "Hukihuki", title: "Drafts", items: drafts },
    { key: "past", eyebrow: "Kua oti", title: "Been and gone", items: past },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <RiAddLine className="size-4" />
          New event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Illustration name="korero" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No events yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Put the Christmas party, a hui or a working bee in the diary, then
                share it and see who can come.
              </p>
            </div>
            <Button variant="secondary" onClick={openCreate}>
              <RiAddLine className="size-4" />
              New event
            </Button>
          </CardContent>
        </Card>
      ) : (
        sections
          .filter((section) => section.items.length > 0)
          .map((section, index) => (
            <section key={section.key} className="space-y-4">
              <SectionHeader
                divider={index > 0}
                eyebrow={section.eyebrow}
                title={`${section.title} (${section.items.length})`}
              />
              <Card>
                <ul className="divide-y divide-border">
                  {section.items.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      today={today}
                      onEdit={() => openEdit(event)}
                      onGuests={() => setGuestsTarget(event)}
                      onAnnounce={() => setAnnounceTarget(event)}
                      onPublish={() => setPublishTarget(event)}
                      onUnpublish={() =>
                        run(() => unpublishEvent(event.id), `"${event.title}" is back to a draft.`)
                      }
                      onCancel={() => setCancelTarget(event)}
                      onDelete={() => setDeleteTarget(event)}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          ))
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={formTarget}
        onSaved={(created) => {
          refresh();
          // Straight from saving a new event into telling people about it —
          // an event nobody hears about may as well not exist.
          if (created) setAnnounceTarget(created);
        }}
      />

      {/* Both dialogs mount per event, so each opening starts from clean state. */}
      {guestsTarget ? (
        <GuestListDialog
          key={guestsTarget.id}
          event={guestsTarget}
          viewerRole={viewerRole}
          today={today}
          onOpenChange={(open) => {
            if (!open) setGuestsTarget(null);
          }}
          onReplied={refresh}
        />
      ) : null}

      {announceTarget ? (
        <AnnounceEventDialog
          key={announceTarget.id}
          event={announceTarget}
          onOpenChange={(open) => {
            if (!open) setAnnounceTarget(null);
          }}
          onSent={refresh}
        />
      ) : null}

      {/* Publish confirm */}
      <AlertDialog
        open={publishTarget !== null}
        onOpenChange={(open) => !open && setPublishTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {publishTarget
                ? `"${publishTarget.title}" will appear for ${AUDIENCE_LABELS[
                    publishTarget.audience
                  ].toLowerCase()}, who can then reply. Nobody is notified until you announce it.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={() => {
                if (publishTarget) {
                  const target = publishTarget;
                  run(() => publishEvent(target.id), `"${target.title}" is live.`);
                }
                setPublishTarget(null);
              }}
            >
              Share it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirm */}
      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Call this event off?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget
                ? `Everyone who said they were coming to "${cancelTarget.title}" will be notified straight away. The event and its replies are kept.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={working}
              onClick={() => {
                if (cancelTarget) {
                  const target = cancelTarget;
                  run(
                    () => cancelEvent(target.id),
                    `"${target.title}" is cancelled and everyone who replied has been told.`
                  );
                }
                setCancelTarget(null);
              }}
            >
              Cancel the event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" and its ${deleteTarget.counts.replied} ${
                    deleteTarget.counts.replied === 1 ? "reply" : "replies"
                  } will be removed for good. Any pānui about it stays, without the link. If it was already shared, cancelling it is usually kinder.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={working}
              onClick={() => {
                if (deleteTarget) {
                  const target = deleteTarget;
                  run(() => deleteEvent(target.id), `"${target.title}" deleted.`);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EventRow({
  event,
  today,
  onEdit,
  onGuests,
  onAnnounce,
  onPublish,
  onUnpublish,
  onCancel,
  onDelete,
}: {
  event: StaffEvent;
  today: string;
  onEdit: () => void;
  onGuests: () => void;
  onAnnounce: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_BADGES[event.status];
  const outstanding = awaitingReply(event.counts, event.inviteeCount);
  const collecting = event.rsvpEnabled && event.status !== "DRAFT";
  const rules: EventRules = event;

  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <DateBlock date={event.date} className="pt-0.5" />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 font-serif text-base font-medium tracking-tight">
            {event.title}
          </h3>
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="outline">{AUDIENCE_LABELS[event.audience]}</Badge>
          {event.myRsvp ? (
            <Badge variant="info">
              {event.myRsvp.response === "GOING"
                ? "You're going"
                : event.myRsvp.response === "MAYBE"
                  ? "You're a maybe"
                  : "You're out"}
            </Badge>
          ) : null}
        </div>

        <EventFacts
          date={event.date}
          startTime={event.startTime}
          endTime={event.endTime}
          location={event.location}
          counts={collecting ? event.counts : null}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {collecting ? (
            <>
              <button
                type="button"
                onClick={onGuests}
                className="inline-flex items-center gap-1.5 rounded-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <RiGroupLine className="size-3.5" aria-hidden />
                Guest list
              </button>
              <span className="tnum">
                {outstanding} of {event.inviteeCount} yet to reply
              </span>
              {event.rsvpDeadline ? (
                <span>
                  {rsvpsAreOpen(rules, today) ? "Replies close" : "Replies closed"}{" "}
                  {formatDateOnly(event.rsvpDeadline, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              ) : null}
            </>
          ) : (
            <span>
              {event.rsvpEnabled
                ? "Not shared yet — nobody can reply"
                : "Replies aren't being collected"}
            </span>
          )}
          {event.announcementCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <RiMegaphoneLine className="size-3.5" aria-hidden />
              {event.announcementCount} pānui sent
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {event.status === "PUBLISHED" ? (
          <Button variant="outline" size="sm" onClick={onAnnounce}>
            <RiMegaphoneLine className="size-4" />
            Announce
          </Button>
        ) : event.status === "DRAFT" ? (
          <Button variant="outline" size="sm" onClick={onPublish}>
            <RiSendPlaneLine className="size-4" />
            Share
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${event.title}`}>
              <RiMoreLine className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <RiEditLine className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            {collecting ? (
              <DropdownMenuItem onClick={onGuests}>
                <RiGroupLine className="mr-2 size-4" />
                Guest list
              </DropdownMenuItem>
            ) : null}
            {event.status === "PUBLISHED" ? (
              <>
                <DropdownMenuItem onClick={onAnnounce}>
                  <RiMegaphoneLine className="mr-2 size-4" />
                  Announce it
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUnpublish}>
                  <RiEyeOffLine className="mr-2 size-4" />
                  Back to draft
                </DropdownMenuItem>
              </>
            ) : null}
            {event.status === "DRAFT" ? (
              <DropdownMenuItem onClick={onPublish}>
                <RiCalendarEventLine className="mr-2 size-4" />
                Share with {AUDIENCE_LABELS[event.audience].toLowerCase()}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {event.status !== "CANCELLED" ? (
              <DropdownMenuItem variant="destructive" onClick={onCancel}>
                <RiCloseCircleLine className="mr-2 size-4" />
                Call it off
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <RiDeleteBinLine className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
