"use client";

import { useState } from "react";
import { RiLoader4Line, RiSendPlaneLine } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DatePicker } from "@/components/date-picker";
import { toDateOnly, toPickerDate } from "@/lib/date-only";
import {
  EVENT_DESCRIPTION_MAX,
  EVENT_LOCATION_MAX,
  EVENT_TITLE_MAX,
  type EventFormData,
} from "@/lib/event-form";
import { createEvent, updateEvent, type StaffEvent } from "@/lib/event-actions";

/** The kitchen's own address — where most gatherings happen. */
const DEFAULT_LOCATION = "132 Tory Street, Te Aro, Pōneke";

type FormState = {
  title: string;
  description: string;
  date: Date | undefined;
  startTime: string;
  endTime: string;
  location: string;
  audience: EventFormData["audience"];
  rsvpEnabled: boolean;
  rsvpDeadline: Date | undefined;
};

function emptyForm(): FormState {
  return {
    title: "",
    description: "",
    date: undefined,
    startTime: "",
    endTime: "",
    location: DEFAULT_LOCATION,
    audience: "ALL",
    rsvpEnabled: true,
    rsvpDeadline: undefined,
  };
}

function formFor(event: StaffEvent): FormState {
  return {
    title: event.title,
    description: event.description ?? "",
    // A stored `@db.Date` has to come back as local midnight or the picker
    // shows the day before.
    date: toPickerDate(event.date),
    startTime: event.startTime ?? "",
    endTime: event.endTime ?? "",
    location: event.location ?? "",
    audience: event.audience,
    rsvpEnabled: event.rsvpEnabled,
    rsvpDeadline: event.rsvpDeadline ? toPickerDate(event.rsvpDeadline) : undefined,
  };
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The event being edited, or null to create a new one. */
  event: StaffEvent | null;
  /**
   * Called after a successful save. `created` names the new event when one was
   * just made and shared, so the caller can offer to announce it.
   */
  onSaved: (created: { id: string; title: string } | null) => void;
}

/**
 * The dialog shell. The form inside is keyed by what it is editing, so opening
 * it always starts from fresh state — no resetting in an effect, and a
 * cancelled edit leaves nothing behind.
 */
export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: EventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <EventForm
            key={event?.id ?? "new"}
            event={event}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  event,
  onOpenChange,
  onSaved,
}: Omit<EventFormDialogProps, "open">) {
  const [form, setForm] = useState<FormState>(() =>
    event ? formFor(event) : emptyForm()
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function payload(): EventFormData {
    return {
      title: form.title,
      description: form.description,
      date: form.date ? toDateOnly(form.date) : "",
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      audience: form.audience,
      rsvpEnabled: form.rsvpEnabled,
      rsvpDeadline: form.rsvpDeadline ? toDateOnly(form.rsvpDeadline) : "",
    };
  }

  async function save(publish: boolean) {
    setSaving(true);
    setError("");

    if (event) {
      const result = await updateEvent(event.id, payload());
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Event updated.");
      onOpenChange(false);
      onSaved(null);
      return;
    }

    const result = await createEvent({ ...payload(), publish });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(
      publish ? "Event shared — now tell people about it." : "Draft saved."
    );
    onOpenChange(false);
    onSaved(
      publish && result.id ? { id: result.id, title: form.title.trim() } : null
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update the details. Anyone who has replied keeps their reply."
              : "Put a gathering in the diary. Share it when you're ready, then announce it to let people know."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-2">
            <Label htmlFor="event-title">What is it?</Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={EVENT_TITLE_MAX}
              placeholder="e.g. Christmas party for the whānau"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Details (optional)</Label>
            <Textarea
              id="event-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={EVENT_DESCRIPTION_MAX}
              rows={3}
              placeholder="Kai, waiata and a Secret Santa — bring a plate if you can."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-date">Day</Label>
            <DatePicker
              id="event-date"
              value={form.date}
              onChange={(date) => set("date", date)}
              placeholder="Pick the day"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-start">Starts (optional)</Label>
              <Input
                id="event-start"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Ends (optional)</Label>
              <Input
                id="event-end"
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Where (optional)</Label>
            <Input
              id="event-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              maxLength={EVENT_LOCATION_MAX}
              placeholder="e.g. 132 Tory Street, Te Aro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-audience">Who&apos;s invited?</Label>
            <Select
              value={form.audience}
              onValueChange={(value) =>
                set("audience", value as EventFormData["audience"])
              }
            >
              <SelectTrigger id="event-audience" className="w-full">
                <SelectValue placeholder="Choose who's invited" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone — volunteers and staff</SelectItem>
                <SelectItem value="VOLUNTEERS">Volunteers only</SelectItem>
                <SelectItem value="COORDINATORS">Coordinators and admins</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Whoever is invited is who can reply.
            </p>
          </div>

          <div className="space-y-3 rounded-lg bg-secondary/40 p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="event-rsvp"
                checked={form.rsvpEnabled}
                onCheckedChange={(checked) => {
                  const on = checked === true;
                  set("rsvpEnabled", on);
                  // A reply-by date with replies off is refused on save, so it
                  // goes as soon as the box is unticked.
                  if (!on) set("rsvpDeadline", undefined);
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="event-rsvp" className="font-semibold">
                  Ask people to reply
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turn this off for a save-the-date you don&apos;t need numbers for.
                </p>
              </div>
            </div>

            {form.rsvpEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="event-deadline">Reply by (optional)</Label>
                <DatePicker
                  id="event-deadline"
                  value={form.rsvpDeadline}
                  onChange={(date) => set("rsvpDeadline", date)}
                  placeholder="Replies close on the day by default"
                  toDate={form.date}
                />
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {event ? (
            <Button onClick={() => save(false)} disabled={saving}>
              {saving ? <RiLoader4Line className="animate-spin" aria-hidden /> : null}
              Save changes
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => save(false)}
                disabled={saving}
              >
                Save draft
              </Button>
              <Button onClick={() => save(true)} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="animate-spin" aria-hidden />
                ) : (
                  <RiSendPlaneLine className="size-4" />
                )}
                Save and share
              </Button>
            </>
          )}
      </DialogFooter>
    </>
  );
}
