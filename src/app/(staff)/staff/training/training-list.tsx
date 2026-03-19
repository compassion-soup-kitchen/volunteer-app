"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  RiCalendarLine,
  RiTimeLine,
  RiTeamLine,
  RiMapPinLine,
  RiGraduationCapLine,
} from "@remixicon/react";
import type { StaffTrainingSession } from "@/lib/training-actions";

interface TrainingListProps {
  sessions: StaffTrainingSession[];
}

const TYPE_LABELS: Record<string, string> = {
  INDUCTION: "Induction",
  DE_ESCALATION: "De-escalation",
  HEALTH_SAFETY: "Health & Safety",
  OTHER: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  INDUCTION: "bg-blue-600/15 text-blue-700 dark:text-blue-400",
  DE_ESCALATION: "bg-amber-600/15 text-amber-700 dark:text-amber-400",
  HEALTH_SAFETY: "bg-green-600/15 text-green-700 dark:text-green-400",
  OTHER: "bg-gray-600/15 text-gray-700 dark:text-gray-400",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isPast(date: Date): boolean {
  return new Date(date) < new Date(new Date().toISOString().split("T")[0]);
}

export function TrainingList({ sessions }: TrainingListProps) {
  if (sessions.length === 0) {
    return (
      <div className="py-12 text-center">
        <RiGraduationCapLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">
          No training sessions yet. Create one to get started.
        </p>
      </div>
    );
  }

  const upcoming = sessions.filter((s) => !isPast(s.date));
  const past = sessions.filter((s) => isPast(s.date));

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Past ({past.length})
          </h2>
          {past.map((session) => (
            <SessionCard key={session.id} session={session} isPast />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  isPast: past,
}: {
  session: StaffTrainingSession;
  isPast?: boolean;
}) {
  const activeCount = session.attendances.length;

  return (
    <Link href={`/staff/training/${session.id}`}>
      <Card className={`transition-colors hover:border-primary/30 ${past ? "opacity-70" : ""}`}>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{session.title}</h3>
              <Badge className={TYPE_COLORS[session.type] || "bg-gray-600/15 text-gray-700 dark:text-gray-400"}>
                {TYPE_LABELS[session.type] || session.type}
              </Badge>
              {past && <Badge variant="secondary">Past</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RiCalendarLine className="size-3.5" />
                {formatDate(session.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <RiTimeLine className="size-3.5" />
                <span className="font-mono">{session.startTime}–{session.endTime}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <RiTeamLine className="size-3.5" />
                {activeCount}/{session.capacity}
              </span>
              {session.location && (
                <span className="flex items-center gap-1.5">
                  <RiMapPinLine className="size-3.5" />
                  {session.location}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
