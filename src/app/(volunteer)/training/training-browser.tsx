"use client";

import { useTransition, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  RiTimeLine,
  RiTeamLine,
  RiMapPinLine,
  RiLoader4Line,
  RiGraduationCapLine,
  RiCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  registerForTraining,
  cancelTrainingRegistration,
  type VolunteerTrainingSession,
} from "@/lib/training-actions";

interface TrainingBrowserProps {
  sessions: VolunteerTrainingSession[];
}

const TYPE_LABELS: Record<string, string> = {
  INDUCTION: "Induction",
  DE_ESCALATION: "De-escalation",
  HEALTH_SAFETY: "Health & Safety",
  OTHER: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  INDUCTION: "bg-blue-600",
  DE_ESCALATION: "bg-amber-600",
  HEALTH_SAFETY: "bg-green-600",
  OTHER: "bg-gray-600",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
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
      <div className="py-12 text-center">
        <RiGraduationCapLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">
          No upcoming training sessions at the moment. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((session) => {
          const isFull = session.registeredCount >= session.capacity;
          const isRegistered = session.userAttendanceStatus === "REGISTERED";
          const loading = isPending && actionId === session.id;

          return (
            <Card key={session.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{session.title}</h3>
                      <Badge
                        className={`text-xs text-white ${TYPE_COLORS[session.type] || "bg-gray-600"}`}
                      >
                        {TYPE_LABELS[session.type] || session.type}
                      </Badge>
                    </div>
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                  {isRegistered && (
                    <Badge variant="success" className="shrink-0">
                      <RiCheckLine className="mr-1 size-3" />
                      Registered
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <RiCalendarLine className="size-3.5 shrink-0" />
                    <span>
                      {formatDate(session.date)} &middot;{" "}
                      <span className="font-mono">{session.startTime}–{session.endTime}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiTeamLine className="size-3.5 shrink-0" />
                    <span>
                      {session.registeredCount}/{session.capacity} spots filled
                      {isFull && !isRegistered && (
                        <span className="text-destructive font-medium ml-1">· Full</span>
                      )}
                    </span>
                  </div>
                  {session.location && (
                    <div className="flex items-center gap-2">
                      <RiMapPinLine className="size-3.5 shrink-0" />
                      <span>{session.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  {isRegistered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={loading}
                      onClick={() => setCancelId(session.id)}
                    >
                      {loading && (
                        <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      Cancel Registration
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
                      {isFull ? "Session Full" : "Register"}
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
            <AlertDialogCancel>Keep Registration</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && handleCancel(cancelId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
