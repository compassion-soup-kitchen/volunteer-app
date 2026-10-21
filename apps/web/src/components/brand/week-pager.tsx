"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiLoader4Line,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  addDaysToDateOnly,
  startOfWeekOf,
  type DateOnly,
} from "@/lib/date-only";
import {
  relativeWeekName,
  rosterWeekHref,
  weekDistance,
  weekRangeLabel,
} from "@/lib/roster-week";
import { cn } from "@/lib/utils";

/**
 * Moving a shift page to another week or service area. The view lives in the
 * URL, so the back button and a shared link both land where you were; the
 * transition keeps the current week on screen until the next one is ready.
 */
export function useRosterWeekNavigation(path: string, today: DateOnly) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function go(weekStart: DateOnly, areaId: string | null) {
    startTransition(() => {
      router.push(rosterWeekHref(path, weekStart, today, areaId), {
        scroll: false,
      });
    });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return { isPending, go, refresh };
}

interface WeekPagerProps {
  weekStart: DateOnly;
  today: DateOnly;
  onNavigate: (weekStart: DateOnly) => void;
  /** Volunteers can't go back before this week - nothing there is theirs to take. */
  canGoBack?: boolean;
  pending?: boolean;
  className?: string;
}

/**
 * WeekPager - previous / next week either side of a serif week heading
 * ("This week", or "3 – 9 November" once it's further out), with the dates
 * or the distance underneath and a way back to the current week.
 */
export function WeekPager({
  weekStart,
  today,
  onNavigate,
  canGoBack = true,
  pending = false,
  className,
}: WeekPagerProps) {
  const name = relativeWeekName(weekStart, today);
  const range = weekRangeLabel(weekStart, today);
  const thisWeek = startOfWeekOf(today);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous week"
          disabled={!canGoBack}
          onClick={() => onNavigate(addDaysToDateOnly(weekStart, -7))}
        >
          <RiArrowLeftSLine />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next week"
          onClick={() => onNavigate(addDaysToDateOnly(weekStart, 7))}
        >
          <RiArrowRightSLine />
        </Button>
      </div>

      <div className="min-w-0" aria-live="polite">
        <h2 className="flex items-center gap-2 font-serif text-xl/tight font-medium tracking-tight">
          <span className="truncate">{name ?? range}</span>
          <RiLoader4Line
            aria-hidden
            className={cn(
              "size-4 shrink-0 animate-spin text-muted-foreground transition-opacity",
              pending ? "opacity-100" : "opacity-0"
            )}
          />
        </h2>
        <p className="truncate text-sm text-muted-foreground tnum">
          {name ? range : weekDistance(weekStart, today)}
        </p>
      </div>

      {weekStart !== thisWeek && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0"
          onClick={() => onNavigate(thisWeek)}
        >
          This week
        </Button>
      )}
    </div>
  );
}
