import Link from "next/link";
import { RiArrowRightLine, RiSuitcaseLine } from "@remixicon/react";

import { IconChip } from "@/components/brand/icon-chip";
import type { DateOnly } from "@/lib/date-only";
import {
  describeLeaveStatus,
  formatLeaveRange,
  type LeaveRange,
} from "@/lib/leave";

/**
 * A quiet line on home about the volunteer's leave - so someone away isn't
 * left wondering where their shifts went, and someone about to go can see the
 * kitchen knows. Renders nothing when there's no leave ahead.
 */
export function LeaveNotice({
  leave,
  today,
}: {
  leave: { current: LeaveRange | null; next: LeaveRange | null };
  today: DateOnly;
}) {
  const range = leave.current ?? leave.next;
  if (!range) return null;
  const away = leave.current !== null;

  return (
    <Link
      href="/profile/leave"
      className="group flex items-center gap-3 rounded-xl bg-warning-tint px-4 py-3 text-warning-tint-foreground transition-colors outline-none hover:bg-warning-tint/80 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <IconChip size="sm" tone="warning" className="bg-background/50">
        <RiSuitcaseLine />
      </IconChip>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {away ? describeLeaveStatus(range, today) : `Leave coming up · ${formatLeaveRange(range, today)}`}
        </span>
        <span className="block text-xs opacity-80">
          {away
            ? "You're off the roster while you're away. Back sooner? Let us know."
            : "Shifts on those days are off your roster."}
        </span>
      </span>
      <RiArrowRightLine
        aria-hidden
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
