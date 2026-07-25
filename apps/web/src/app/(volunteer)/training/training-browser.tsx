"use client";

import { useTransition, useState } from "react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RiCalendarLine,
  RiMapPinLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CapacityMeter } from "@/components/brand/capacity-meter";
import { Illustration } from "@/components/brand/illustration";
import {
  registerForTraining,
  cancelTrainingRegistration,
  type VolunteerTrainingSession,
} from "@/lib/training-actions";
import { formatTimeRange } from "@/lib/format";
import { formatDateOnly } from "@/lib/date-only";

interface TrainingBrowserProps {
  sessions: VolunteerTrainingSession[];
}

const TYPE_LABELS: Record<string, string> = {
  INDUCTION: "Induction",
  DE_ESCALATION: "De-escalation",
  HEALTH_SAFETY: "Health & Safety",
  OTHER: "Other",
};

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
  INDUCTION: "info",
  DE_ESCALATION: "warning",
  HEALTH_SAFETY: "success",
  OTHER: "neutral",
};

function formatDate(date: Date): string {
  return formatDateOnly(date, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function TrainingBrowser({ sessions }: TrainingBrowserProps) {
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  function handleRegister(sessionId: string) {
    setActionId(sessionId);
    startTransition(async () => {
      const result = await registerForTraining(sessionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Registered for training session.");
      }
      setActionId(null);
    });
  }

  function handleCancel(sessionId: string) {
    setActionId(sessionId);
    setCancelId(null);
    startTransition(async () => {
      const result = await cancelTrainingRegistration(sessionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Registration cancelled.");
      }
      setActionId(null);
    });
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Illustration name="book" size={96} />
          <div>
            <p className="font-serif text-lg font-medium tracking-tight">
              No training scheduled right now
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              New sessions are added regularly, check back soon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => {
          const isFull = session.registeredCount >= session.capacity;
          const isRegistered = session.userAttendanceStatus === "REGISTERED";
          const loading = isPending && actionId === session.id;
          const spotsLeft = session.capacity - session.registeredCount;

          return (
            <Card key={session.id}>
              {isRegistered && (
                // The red mission rail marks the volunteer's own commitment
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1 bg-primary"
                />
              )}
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg/snug font-medium tracking-tight">
                        {session.title}
                      </h3>
                      <Badge
                        variant={TYPE_VARIANTS[session.type] ?? "neutral"}
                      >
                        {TYPE_LABELS[session.type] || session.type}
                      </Badge>
                    </div>
                    {session.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {session.description}
                      </p>
                    )}
                  </div>
                  {isRegistered ? (
                    <Badge variant="info" className="shrink-0">
                      Booked
                    </Badge>
                  ) : isFull ? (
                    <Badge variant="neutral" className="shrink-0">
                      Full
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <RiCalendarLine className="size-3.5 shrink-0" aria-hidden />
                    <span>
                      {formatDate(session.date)} &middot;{" "}
                      <span className="tabular-nums">
                        {formatTimeRange(session.startTime, session.endTime)}
                      </span>
                    </span>
                  </p>
                  {session.location && (
                    <p className="flex items-center gap-2">
                      <RiMapPinLine className="size-3.5 shrink-0" aria-hidden />
                      <span>{session.location}</span>
                    </p>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <CapacityMeter
                      filled={session.registeredCount}
                      capacity={session.capacity}
                    />
                    {isRegistered ? (
                      <span className="text-xs font-semibold text-success">
                        You&apos;re in
                      </span>
                    ) : isFull ? (
                      <span className="text-xs text-muted-foreground">
                        Session full
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-xs tabular-nums whitespace-nowrap",
                          spotsLeft <= 2
                            ? "font-semibold text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                      </span>
                    )}
                  </div>

                  {isRegistered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => setCancelId(session.id)}
                    >
                      {loading && (
                        <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={loading || isFull}
                      onClick={() => handleRegister(session.id)}
                    >
                      {loading && (
                        <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      {isFull ? "Session full" : "Register"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel confirmation */}
      <AlertDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
            <AlertDialogDescription>
              You can re-register later if spots are still available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep registration</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && handleCancel(cancelId)}
              variant="destructive"
            >
              Cancel registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
