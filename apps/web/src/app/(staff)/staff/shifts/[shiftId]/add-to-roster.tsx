"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RiLoader4Line, RiSearchLine, RiUserAddLine } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GroupBadges } from "@/components/brand/group-badge";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState } from "@/components/brand/empty-state";
import {
  addVolunteerToShift,
  type VolunteerOption,
} from "@/lib/shift-actions";
import { contactLine } from "@/lib/format";
import { searchVolunteers } from "../volunteer-picker";
import type { DateOnly } from "@/lib/date-only";
import { formatLeaveRange } from "@/lib/leave";

/** Someone on leave on the shift's day. */
export type AwayVolunteer = { volunteerId: string; startsOn: DateOnly; endsOn: DateOnly };

interface AddToRosterProps {
  shiftId: string;
  volunteers: VolunteerOption[];
  /** Everyone already holding a place, so they aren't offered twice. */
  rosteredIds: string[];
  /** A day already gone: adding someone records that they came. */
  isPast: boolean;
  isFull: boolean;
  /** On leave that day: shown, but not addable unless the day is gone. */
  away: AwayVolunteer[];
}

/**
 * Puts one named volunteer on the shift - someone who rang in, a regular for
 * a one-off, or an offline volunteer whose attendance is being recorded.
 */
export function AddToRoster({
  shiftId,
  volunteers,
  rosteredIds,
  isPast,
  isFull,
  away,
}: AddToRosterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A day already gone is a record of who came, so leave doesn't hold it up.
  const awayById = useMemo(
    () => new Map(isPast ? [] : away.map((leave) => [leave.volunteerId, leave])),
    [away, isPast]
  );
  const available = useMemo(() => {
    const taken = new Set(rosteredIds);
    return volunteers
      .filter((volunteer) => !taken.has(volunteer.id))
      // People on leave sink to the bottom rather than vanish, so a
      // coordinator looking for them learns why they can't be added.
      .sort((a, b) => Number(awayById.has(a.id)) - Number(awayById.has(b.id)));
  }, [volunteers, rosteredIds, awayById]);
  const matches = useMemo(() => searchVolunteers(available, search), [available, search]);

  function handleAdd(volunteer: VolunteerOption) {
    setAddingId(volunteer.id);
    startTransition(async () => {
      const result = await addVolunteerToShift(shiftId, volunteer.id);
      setAddingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isPast
          ? `${volunteer.name} recorded as attended.`
          : `${volunteer.name} is on the roster.`
      );
      setOpen(false);
      setSearch("");
      router.refresh();
    });
  }

  const label = isPast ? "Record someone who came" : "Add a volunteer";

  if (isFull) {
    return (
      <Button size="sm" variant="outline" disabled title="The shift is full. Raise its capacity first.">
        <RiUserAddLine className="size-3.5" />
        Full
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <RiUserAddLine className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <RiSearchLine
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone or group"
              aria-label="Search volunteers"
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          {isPast && (
            <p className="px-1 pt-2 text-xs text-muted-foreground">
              They&apos;ll be marked as attended, so the hours count.
            </p>
          )}
        </div>

        {matches.length === 0 ? (
          <EmptyState
            bare
            size="compact"
            icon={<RiSearchLine />}
            title={
              available.length === 0
                ? "Every active volunteer is already on this shift"
                : "No one matches that search"
            }
          />
        ) : (
          <ul className="max-h-72 overflow-y-auto p-1">
            {matches.map((volunteer) => {
              const leave = awayById.get(volunteer.id);
              return (
                <li key={volunteer.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(volunteer)}
                    disabled={isPending || Boolean(leave)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none hover:bg-secondary/60 focus-visible:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{volunteer.name}</span>
                        {volunteer.isOffline && <StatusBadge status="OFFLINE" />}
                        {leave && <StatusBadge status="ON_LEAVE" />}
                      </span>
                      {leave ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          Away {formatLeaveRange(leave)}
                        </span>
                      ) : volunteer.groups.length > 0 ? (
                        <GroupBadges groups={volunteer.groups} max={2} className="mt-0.5" />
                      ) : (
                        <span className="block truncate text-xs text-muted-foreground">
                          {contactLine(volunteer)}
                        </span>
                      )}
                    </span>
                    {addingId === volunteer.id && (
                      <RiLoader4Line className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
