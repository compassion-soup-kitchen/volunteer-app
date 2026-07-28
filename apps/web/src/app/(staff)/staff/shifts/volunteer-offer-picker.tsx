"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBadge } from "@/components/brand/status-badge";
import { GroupBadge, GroupBadges } from "@/components/brand/group-badge";
import { RiCloseLine, RiSearchLine, RiUserAddLine } from "@remixicon/react";
import type { OfferStatus } from "@/lib/shift-offers";
import type { VolunteerOption } from "@/lib/shift-actions";
import { sortGroups, type GroupChip } from "@/lib/volunteer-groups";

interface VolunteerOfferPickerProps {
  volunteers: VolunteerOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Where each volunteer got to with the offer, once they've answered. */
  statuses?: Record<string, OfferStatus>;
}

/**
 * Picks the volunteers a shift is offered to first. Selected people stay
 * visible as chips so the list reads as a crew rather than a form value, and
 * anyone who has already answered carries their answer with them.
 */
export function VolunteerOfferPicker({
  volunteers,
  selectedIds,
  onChange,
  disabled,
  statuses,
}: VolunteerOfferPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const byId = useMemo(
    () => new Map(volunteers.map((volunteer) => [volunteer.id, volunteer])),
    [volunteers]
  );

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return volunteers;
    return volunteers.filter(
      (volunteer) =>
        volunteer.name.toLowerCase().includes(needle) ||
        volunteer.email.toLowerCase().includes(needle) ||
        volunteer.groups.some((group) =>
          group.name.toLowerCase().includes(needle)
        )
    );
  }, [volunteers, search]);

  // The crews on offer here, each with who's in it - offering a shift to "the
  // team leaders" is one tap rather than six.
  const groups = useMemo(() => {
    const byId = new Map<string, { group: GroupChip; memberIds: string[] }>();
    for (const volunteer of volunteers) {
      for (const group of volunteer.groups) {
        const entry = byId.get(group.id);
        if (entry) entry.memberIds.push(volunteer.id);
        else byId.set(group.id, { group, memberIds: [volunteer.id] });
      }
    }
    return sortGroups(
      [...byId.values()].map((entry) => ({ ...entry.group, ...entry }))
    );
  }, [volunteers]);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id]
    );
  }

  function toggleGroup(memberIds: string[], allSelected: boolean) {
    onChange(
      allSelected
        ? selectedIds.filter((id) => !memberIds.includes(id))
        : [...new Set([...selectedIds, ...memberIds])]
    );
  }

  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((volunteer): volunteer is VolunteerOption => Boolean(volunteer));

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((volunteer) => {
            const status = statuses?.[volunteer.id];
            return (
              <li key={volunteer.id}>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary py-1 pr-1 pl-2.5 text-sm">
                  <span className="max-w-45 truncate">{volunteer.name}</span>
                  {status && status !== "PENDING" && (
                    <StatusBadge
                      status={status}
                      className="px-1.5 py-0 text-[0.65rem]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(volunteer.id)}
                    disabled={disabled}
                    aria-label={`Remove ${volunteer.name} from the offer`}
                    className="rounded-sm p-0.5 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    <RiCloseLine aria-hidden className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <RiUserAddLine aria-hidden className="size-4" />
            {selected.length > 0 ? "Add or remove" : "Choose volunteers"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="border-b border-border p-2">
            <div className="relative">
              <RiSearchLine
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email or group"
                aria-label="Search volunteers"
                className="h-9 pl-8"
              />
            </div>
          </div>

          {groups.length > 0 && (
            <div className="border-b border-border px-2 py-2">
              <p className="eyebrow mb-1.5 px-1 text-[0.62rem] text-muted-foreground">
                Whole group
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {groups.map((entry) => {
                  const allSelected = entry.memberIds.every((id) =>
                    selectedIds.includes(id)
                  );
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={allSelected}
                        onClick={() =>
                          toggleGroup(entry.memberIds, allSelected)
                        }
                        className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                      >
                        <GroupBadge
                          group={entry}
                          className={
                            allSelected
                              ? "ring-2 ring-ring/50"
                              : "opacity-80 hover:opacity-100"
                          }
                        >
                          {entry.name}
                          <span className="tnum opacity-70">
                            {entry.memberIds.length}
                          </span>
                        </GroupBadge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {volunteers.length === 0
                ? "No active volunteers yet."
                : "No one matches that search."}
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto p-1">
              {matches.map((volunteer) => {
                const checked = selectedIds.includes(volunteer.id);
                return (
                  <li key={volunteer.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary/60 has-focus-visible:bg-secondary/60">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(volunteer.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {volunteer.name}
                        </span>
                        {volunteer.groups.length > 0 ? (
                          <GroupBadges
                            groups={volunteer.groups}
                            max={2}
                            className="mt-0.5"
                          />
                        ) : (
                          <span className="block truncate text-xs text-muted-foreground">
                            {volunteer.email}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <Badge variant="neutral">
              {selectedIds.length} selected
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
