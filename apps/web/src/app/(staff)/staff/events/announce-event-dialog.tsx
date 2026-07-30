"use client";

import { useEffect, useState } from "react";
import { RiLoader4Line, RiSendPlaneLine } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncement } from "@/lib/announcement-actions";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  type AnnouncementAudience,
} from "@/lib/announcement-schema";
import { draftEventAnnouncement } from "@/lib/event-actions";

interface AnnounceEventDialogProps {
  /** The event to announce. Mount this only when there is one. */
  event: { id: string; title: string };
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

/**
 * Tells people about an event by writing a pānui linked to it.
 *
 * Announcing is deliberately a separate step from sharing the event: the event
 * can be edited and re-announced as often as it needs, and the notification
 * only ever goes out from here — the one place a coordinator sees what will be
 * sent before they send it.
 */
export function AnnounceEventDialog({
  event,
  onOpenChange,
  onSent,
}: AnnounceEventDialogProps) {
  const [title, setTitle] = useState(event.title);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("ALL");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Start from a draft built out of the event's own details, so the usual case
  // is read-it-and-send rather than write-it-again. Mounted per event, so the
  // fields need no resetting between openings.
  useEffect(() => {
    let current = true;
    draftEventAnnouncement(event.id)
      .then((draft) => {
        if (!current || !draft) return;
        setTitle(draft.title);
        setBody(draft.body);
        setAudience(draft.audience as AnnouncementAudience);
      })
      .catch((err) => {
        // The event's title is already in hand, so the coordinator can still
        // write the pānui themselves rather than staring at a spinner.
        console.error("Could not draft the event announcement:", err);
        if (current) toast.error("Couldn't write a draft — please write your own.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [event.id]);

  async function send(publish: boolean) {
    setSending(true);
    setError("");

    const result = await createAnnouncement({
      title,
      body,
      audience,
      publish,
      eventId: event.id,
    });
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(
      publish ? "Pānui sent — everyone will hear about it." : "Draft pānui saved."
    );
    onOpenChange(false);
    onSent();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Announce this event</DialogTitle>
          <DialogDescription>
            This writes a pānui linked to the event, so people can reply straight
            from the notice.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <RiLoader4Line className="size-4 animate-spin" aria-hidden />
            Writing a first draft…
          </div>
        ) : (
          <div className="max-h-[55vh] space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="announce-title">Title</Label>
              <Input
                id="announce-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={ANNOUNCEMENT_TITLE_MAX}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announce-body">Message</Label>
              <Textarea
                id="announce-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={ANNOUNCEMENT_BODY_MAX}
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announce-audience">Who is this pānui for?</Label>
              <Select
                value={audience}
                onValueChange={(value) =>
                  setAudience(value as AnnouncementAudience)
                }
              >
                <SelectTrigger id="announce-audience" className="w-full">
                  <SelectValue placeholder="Choose an audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="VOLUNTEERS">Volunteers</SelectItem>
                  <SelectItem value="COORDINATORS">Coordinators</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set this to match who&apos;s invited. Anyone the event isn&apos;t
                for reads the message without the event attached, so they can&apos;t
                see its details or reply.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Not now
          </Button>
          <Button
            variant="secondary"
            onClick={() => send(false)}
            disabled={sending || loading}
          >
            Save as draft
          </Button>
          <Button onClick={() => send(true)} disabled={sending || loading}>
            {sending ? (
              <RiLoader4Line className="animate-spin" aria-hidden />
            ) : (
              <RiSendPlaneLine className="size-4" />
            )}
            Send it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
