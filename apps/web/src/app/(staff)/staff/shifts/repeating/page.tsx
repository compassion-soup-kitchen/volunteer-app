import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiArrowRightSLine, RiRepeatLine } from "@remixicon/react";

import { PageHeader } from "@/components/brand/page-header";
import { IconChip } from "@/components/brand/icon-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getShiftPatterns,
  type ShiftPatternSummary,
} from "@/lib/shift-pattern-actions";
import {
  describePatternSpan,
  describeRecurrence,
  isPatternRunning,
} from "@/lib/shift-patterns";
import { formatTimeRange, personName } from "@/lib/format";
import { formatDateOnly, parseDateOnly, todayInAppZone } from "@/lib/date-only";
import { cn } from "@/lib/utils";
import { BleedList } from "@/components/brand/detail-list";
import { EmptyState } from "@/components/brand/empty-state";

export const metadata: Metadata = {
  title: "Repeating shifts | Te Pūaroha",
};

/** How many regulars a row names before trailing off into a count. */
const REGULARS_SHOWN = 3;

function regularsLine(pattern: ShiftPatternSummary): string {
  if (pattern.regulars.length === 0) return "No regulars yet";
  const names = pattern.regulars.slice(0, REGULARS_SHOWN).map(personName);
  const rest = pattern.regulars.length - names.length;
  return rest > 0 ? `${names.join(", ")} and ${rest} more` : names.join(", ");
}

function PatternRow({ pattern, today }: { pattern: ShiftPatternSummary; today: string }) {
  const running = isPatternRunning(pattern, today);
  return (
    <li>
      <Link
        href={`/staff/shifts/repeating/${pattern.id}`}
        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-none"
      >
        <IconChip tone={running ? "brand" : "neutral"}>
          <RiRepeatLine />
        </IconChip>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-serif text-base/snug font-medium tracking-tight">
              {pattern.serviceArea.name}
            </p>
            <Badge variant={running ? (pattern.endsOn ? "info" : "success") : "neutral"}>
              {describePatternSpan(pattern.endsOn, today)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {describeRecurrence(pattern.weekdays, pattern.interval)},{" "}
            <span className="tnum">{formatTimeRange(pattern.startTime, pattern.endTime)}</span>
          </p>
          <p className={cn("truncate text-sm", pattern.regulars.length === 0 && "text-muted-foreground")}>
            {regularsLine(pattern)}
          </p>
        </div>
        {running && pattern.nextShift && (
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-xs text-muted-foreground">Next</p>
            <p className="text-sm font-semibold tnum">
              {formatDateOnly(parseDateOnly(pattern.nextShift.date), {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        )}
        <RiArrowRightSLine aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export default async function RepeatingShiftsPage() {
  const patterns = await getShiftPatterns();
  const today = todayInAppZone();
  const running = patterns.filter((pattern) => isPatternRunning(pattern, today));
  const finished = patterns.filter((pattern) => !isPatternRunning(pattern, today));

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/shifts"
        eyebrow="Mahi auau · Repeating"
        title="Repeating shifts"
        description="Shifts that run every week, and the regulars who work them"
        actions={
          <Button asChild>
            <Link href="/staff/shifts/new">
              <RiAddLine className="size-4" />
              Create shift
            </Link>
          </Button>
        }
      />

      {patterns.length === 0 ? (
        <EmptyState
          illustration="coffee"
          title="No repeating shifts yet"
          description="Create a shift and tick “Repeat this shift” to put it on the roster every week, with its regulars."
        />
      ) : (
        <>
          {running.length > 0 && (
            <Card>
              <BleedList>
                {running.map((pattern) => (
                  <PatternRow key={pattern.id} pattern={pattern} today={today} />
                ))}
              </BleedList>
            </Card>
          )}

          {finished.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-serif text-lg font-medium tracking-tight text-muted-foreground">
                Finished
              </h2>
              <Card>
                <BleedList>
                  {finished.map((pattern) => (
                    <PatternRow key={pattern.id} pattern={pattern} today={today} />
                  ))}
                </BleedList>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
