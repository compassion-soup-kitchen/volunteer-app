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
import { contactLine } from "@/lib/format";
import type { DateOnly } from "@/lib/date-only";
import { LeaveForm } from "./leave-form";

/** Who leave can be logged for - the same shape the roster pickers use. */
export type LeaveVolunteerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isOffline: boolean;
};

function search(volunteers: LeaveVolunteerOption[], query: string): LeaveVolunteerOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return volunteers;
  const digits = needle.replace(/\s/g, "");
  return volunteers.filter(
    (volunteer) =>
      volunteer.name.toLowerCase().includes(needle) ||
      volunteer.email?.toLowerCase().includes(needle) ||
      (digits.length > 0 && volunteer.phone?.replace(/\s/g, "").includes(digits))
  );
}

interface LogLeaveDialogProps {
  today: DateOnly;
  /** Everyone leave can be logged for, when staff choose who. */
  volunteers?: LeaveVolunteerOption[];
  /** Or one volunteer, fixed - from their own record. */
  volunteer?: { id: string; name: string };
  size?: "sm" | "default";
  variant?: "default" | "outline";
}

/**
 * Staff logging leave for someone - they rang in, told a coordinator at the
 * door, or don't use the app at all. The same form and preview the volunteer
 * gets, with the person chosen first.
 */
export function LogLeaveDialog({
  today,
  volunteers = [],
  volunteer,
  size = "default",
  variant = "default",
}: LogLeaveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chosenId, setChosenId] = useState<string | null>(null);

  const matches = useMemo(() => search(volunteers, query).slice(0, 8), [volunteers, query]);
  const picked = volunteers.find((option) => option.id === chosenId) ?? null;
  const chosen = volunteer ?? picked;

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setChosenId(null);
    }
  }

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
          <DialogTitle className="font-serif text-xl tracking-tight">
            {volunteer ? `Log leave for ${volunteer.name}` : "Log leave"}
          </DialogTitle>
          <DialogDescription>
            They come off any shifts while they&apos;re away
            {volunteer ? "" : ", and get a notification if they use the app"}.
          </DialogDescription>
        </DialogHeader>

        {!volunteer && (
          <div className="space-y-2">
            <Label htmlFor="leave-volunteer-search">Who&apos;s going away?</Label>
            {picked ? (
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-border">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {picked.name}
                    {picked.isOffline && <Badge variant="neutral">Offline</Badge>}
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
                    id="leave-volunteer-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, email or phone"
                    className="pl-8"
                    autoComplete="off"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto rounded-lg p-1 ring-1 ring-border" aria-label="Volunteers">
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
                              {option.isOffline && <Badge variant="neutral">Offline</Badge>}
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
            audience="staff"
            today={today}
            volunteerId={chosen.id}
            volunteerName={chosen.name.split(" ")[0]}
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
