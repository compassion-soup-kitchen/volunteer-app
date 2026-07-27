"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrainingTypeBadge } from "@/components/brand/training-type-badge";
import { DateBlock } from "@/components/brand/date-block";
import { CapacityMeter } from "@/components/brand/capacity-meter";
import { SectionHeader } from "@/components/brand/section-header";
import { Illustration } from "@/components/brand/illustration";
import {
  RiArrowRightSLine,
  RiMapPinLine,
  RiTimeLine,
} from "@remixicon/react";
import type { StaffTrainingSession } from "@/lib/training-actions";
import { formatTimeRange } from "@/lib/format";
import { isPastInAppZone, isTodayInAppZone } from "@/lib/date-only";

interface TrainingListProps {
  sessions: StaffTrainingSession[];
}

export function TrainingList({ sessions }: TrainingListProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Illustration name="book" size={96} />
          <div>
            <p className="font-serif text-lg font-medium tracking-tight">
              No training sessions yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcoming = sessions.filter((s) => !isPastInAppZone(s.date));
  const past = sessions.filter((s) => isPastInAppZone(s.date));

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Kei te heke mai"
            title={`Upcoming (${upcoming.length})`}
          />
          <Card>
            <ul className="divide-y divide-border">
              {upcoming.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            divider={upcoming.length > 0}
            eyebrow="Kua hipa"
            title={`Past (${past.length})`}
          />
          <Card>
            <ul className="divide-y divide-border">
              {past.map((session) => (
                <SessionRow key={session.id} session={session} isPast />
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

function SessionRow({
  session,
  isPast: past,
}: {
  session: StaffTrainingSession;
  isPast?: boolean;
}) {
  const activeCount = session.attendances.length;
  const today = isTodayInAppZone(session.date);
  const sessionYear = session.date.getUTCFullYear();
  const currentYear = new Date().getFullYear();

  return (
    <li>
      <Link
        href={`/staff/training/${session.id}`}
        className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <DateBlock
          date={session.date}
          className={past ? "opacity-55" : undefined}
        />
        <span aria-hidden className="self-stretch border-l border-border" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-serif text-base/snug font-medium tracking-tight">
              {session.title}
            </p>
            <TrainingTypeBadge type={session.type} />
            {today && <Badge>Today</Badge>}
            {past && <Badge variant="neutral">Past</Badge>}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <RiTimeLine aria-hidden className="size-3.5 shrink-0" />
              <span className="tnum">
                {formatTimeRange(session.startTime, session.endTime)}
              </span>
            </span>
            {sessionYear !== currentYear && (
              <span className="tnum">{sessionYear}</span>
            )}
            {session.location && (
              <span className="flex min-w-0 items-center gap-1.5">
                <RiMapPinLine aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{session.location}</span>
              </span>
            )}
            <span className="tnum sm:hidden">
              {activeCount}/{session.capacity} filled
            </span>
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
          <CapacityMeter filled={activeCount} capacity={session.capacity} />
          <span className="text-xs text-muted-foreground tnum">
            {activeCount}/{session.capacity} filled
          </span>
        </div>
        <RiArrowRightSLine
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}
