"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cva } from "class-variance-authority";
import {
  RiCheckLine,
  RiCloseCircleLine,
  RiLoader4Line,
  RiQuestionLine,
} from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { respondToEvent } from "@/lib/event-actions";
import {
  RSVP_LABELS,
  RSVP_NOTE_MAX,
  RSVP_RESPONSES,
  type RsvpResponse,
} from "@/lib/event-rsvp";
import { cn } from "@/lib/utils";

/**
 * The three replies, coloured by what they mean rather than by the brand red:
 * yes is affirmative green, maybe is waiting ochre, no is a quiet neutral. Each
 * carries its own icon as well, so the choice never rests on colour alone.
 */
const OPTION_ICONS = {
  GOING: RiCheckLine,
  MAYBE: RiQuestionLine,
  NOT_GOING: RiCloseCircleLine,
} as const;

const rsvpOption = cva(
  // `min-w-28` is what makes the group wrap sensibly in a narrow card instead
  // of squeezing "Can't make it" onto three lines.
  "inline-flex min-h-11 min-w-28 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      response: {
        GOING: "",
        MAYBE: "",
        NOT_GOING: "",
      },
      selected: {
        true: "",
        false:
          "border-input bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      },
    },
    compoundVariants: [
      {
        response: "GOING",
        selected: true,
        class: "border-success bg-success-tint text-success-tint-foreground",
      },
      {
        response: "MAYBE",
        selected: true,
        class: "border-warning bg-warning-tint text-warning-tint-foreground",
      },
      {
        response: "NOT_GOING",
        selected: true,
        class:
          "border-neutral-tint-foreground/40 bg-neutral-tint text-neutral-tint-foreground",
      },
    ],
    defaultVariants: { selected: false },
  }
);

interface RsvpControlProps {
  eventId: string;
  /** The reply on record, or null if they haven't answered. */
  response: RsvpResponse | null;
  note: string | null;
  /** Why replies are shut, from `rsvpClosedMessage`. Null while open. */
  closedMessage?: string | null;
  /** Ask the organisers' question quietly — off on dense lists. */
  showNote?: boolean;
  /**
   * Told after a reply lands, for callers holding their own copy of the
   * tallies (a dialog that fetched its guest list, say). `router.refresh()`
   * covers server-rendered surfaces on its own.
   */
  onReplied?: () => void;
  className?: string;
}

/**
 * The reply control, shared by every surface that offers an RSVP.
 *
 * Answering is one tap: the note is a second, optional step, because most
 * people have nothing to add and asking for a comment before an answer is how
 * you lose the answer.
 */
export function RsvpControl({
  eventId,
  response,
  note,
  closedMessage = null,
  showNote = true,
  onReplied,
  className,
}: RsvpControlProps) {
  const [current, setCurrent] = useState<RsvpResponse | null>(response);
  const [savedNote, setSavedNote] = useState(note ?? "");
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [pending, setPending] = useState<RsvpResponse | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const router = useRouter();

  const closed = closedMessage !== null;
  const busy = pending !== null || savingNote;

  async function send(next: RsvpResponse, noteToSend: string) {
    const result = await respondToEvent(eventId, next, noteToSend);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    setCurrent(next);
    setSavedNote(noteToSend);
    // The buttons already show the new answer; this is for the tallies beside
    // them, which only the server knows.
    router.refresh();
    onReplied?.();
    return true;
  }

  async function choose(next: RsvpResponse) {
    if (closed || busy) return;
    setPending(next);
    const ok = await send(next, draftNote);
    setPending(null);
    if (ok) {
      toast.success(
        next === "GOING"
          ? "Lovely — you're on the list."
          : next === "MAYBE"
            ? "Noted as a maybe."
            : "Thanks for letting us know."
      );
    }
  }

  async function saveNote() {
    if (closed || busy || current === null) return;
    setSavingNote(true);
    const ok = await send(current, draftNote);
    setSavingNote(false);
    if (ok) toast.success("Note saved.");
  }

  const noteChanged = draftNote.trim() !== savedNote.trim();

  return (
    <div className={cn("@container space-y-3", className)}>
      {/*
        The three replies sit in one row when the card is wide enough and wrap
        when it isn't — a container query, because what matters is the width of
        the card (the dashboard's rail is narrow on a wide screen), not the
        viewport.
      */}
      <div
        role="group"
        aria-label="Your reply"
        className="flex flex-wrap gap-2 @sm:flex-nowrap"
      >
        {RSVP_RESPONSES.map((option) => {
          const Icon = OPTION_ICONS[option];
          const selected = current === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={closed || busy}
              onClick={() => choose(option)}
              className={rsvpOption({ response: option, selected })}
            >
              {pending === option ? (
                <RiLoader4Line className="animate-spin" aria-hidden />
              ) : (
                <Icon aria-hidden />
              )}
              {RSVP_LABELS[option]}
            </button>
          );
        })}
      </div>

      {closed ? (
        <p className="text-xs text-muted-foreground">{closedMessage}</p>
      ) : null}

      {showNote && !closed && current !== null ? (
        <div className="space-y-2">
          <Label htmlFor={`rsvp-note-${eventId}`} className="text-xs">
            Anything we should know? (optional)
          </Label>
          <Textarea
            id={`rsvp-note-${eventId}`}
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            maxLength={RSVP_NOTE_MAX}
            rows={2}
            disabled={busy}
            placeholder="Dietary needs, bringing tamariki, arriving late…"
          />
          {noteChanged ? (
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={saveNote} disabled={busy}>
                {savingNote ? (
                  <RiLoader4Line className="animate-spin" aria-hidden />
                ) : null}
                Save note
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
