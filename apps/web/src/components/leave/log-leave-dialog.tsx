"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiAddLine, RiSearchLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/brand/status-badge";
import { contactLine } from "@/lib/format";
import type { DateOnly } from "@/lib/date-only";
import type { LeavePersonOption } from "@/lib/leave-actions";
import { LeaveForm } from "./leave-form";

function search(people: LeavePersonOption[], query: string): LeavePersonOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return people;
  const digits = needle.replace(/\s/g, "");
  return people.filter(
    (person) =>
      person.name.toLowerCase().includes(needle) ||
      person.email?.toLowerCase().includes(needle) ||
      (digits.length > 0 && person.phone?.replace(/\s/g, "").includes(digits))
  );
}

/** The signed-in staff member first, so logging their own leave is one tap. */
function viewerFirst(people: LeavePersonOption[], viewerUserId: string | undefined) {
  const viewer = people.find((person) => person.id === viewerUserId);
  return viewer ? [viewer, ...people.filter((person) => person !== viewer)] : people;
}

function PersonBadges({ person, isYou }: { person: LeavePersonOption; isYou: boolean }) {
  return (
    <>
      {isYou && <Badge variant="outline">You</Badge>}
      {person.isStaff && <StatusBadge status="STAFF" />}
      {person.isOffline && <StatusBadge status="OFFLINE" />}
    </>
  );
}

interface LogLeaveDialogProps {
  today: DateOnly;
  /** Everyone leave can be logged for, when staff choose who. */
  people?: LeavePersonOption[];
  /** Or one person, fixed - from their own record. Keyed by user id. */
  person?: { id: string; name: string };
  /** The staff member using the dialog, so their own leave reads as theirs. */
  viewerUserId?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
}

/**
 * Staff logging leave - a volunteer who rang in, told a coordinator at the
 * door, or doesn't use the app at all, or the staff member's own. The same
 * form and preview the volunteer gets, with the person chosen first.
 */
export function LogLeaveDialog({
  today,
  people = [],
  person,
  viewerUserId,
  size = "default",
  variant = "default",
}: LogLeaveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chosenId, setChosenId] = useState<string | null>(null);

  const ordered = useMemo(() => viewerFirst(people, viewerUserId), [people, viewerUserId]);
  const matches = useMemo(() => search(ordered, query).slice(0, 8), [ordered, query]);
  const picked = people.find((option) => option.id === chosenId) ?? null;
  const chosen = person ?? picked;
  const isOwn = chosen !== null && chosen.id === viewerUserId;

  // Starts afresh on opening rather than on closing, so the dialog doesn't
  // flick back to the picker while it fades out.
  function reset(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setChosenId(null);
    }
  }

  // Worded for whoever is chosen, so picking yourself reads as your own leave.
  const title = isOwn ? "Log your leave" : person ? `Log leave for ${person.name}` : "Log leave";
  const description = isOwn
    ? "The team sees you're away, and you come off any shifts you're on."
    : person
      ? "They come off any shifts while they're away."
      : "They come off any shifts while they're away, and get a notification if they use the app.";

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <RiAddLine className="size-4" aria-hidden />
          Log leave
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!person && (
          <div className="space-y-2">
            <Label htmlFor="leave-person-search">Who&apos;s going away?</Label>
            {picked ? (
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-border">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {picked.name}
                    <PersonBadges person={picked} isYou={isOwn} />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {contactLine(picked)}
                  </span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setChosenId(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <RiSearchLine
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="leave-person-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, email or phone"
                    className="pl-8"
                    autoComplete="off"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto rounded-lg p-1 ring-1 ring-border" aria-label="People">
                  {matches.length === 0 ? (
                    <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No one matches that search.
                    </li>
                  ) : (
                    matches.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => setChosenId(option.id)}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none hover:bg-secondary/60 focus-visible:bg-secondary/60"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{option.name}</span>
                              <PersonBadges person={option} isYou={option.id === viewerUserId} />
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {contactLine(option)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        )}

        {chosen && (
          <LeaveForm
            key={chosen.id}
            audience={isOwn ? "self" : "staff"}
            today={today}
            userId={chosen.id}
            personName={chosen.name.split(" ")[0]}
            onCancel={() => reset(false)}
            onSaved={() => {
              reset(false);
              router.refresh();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
