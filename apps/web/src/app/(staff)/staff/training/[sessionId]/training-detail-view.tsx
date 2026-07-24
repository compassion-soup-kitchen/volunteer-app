"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { StatusBadge } from "@/components/brand/status-badge";
import { CapacityMeter } from "@/components/brand/capacity-meter";
import { IconChip } from "@/components/brand/icon-chip";
import {
  RiTimeLine,
  RiTeamLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiUserLine,
  RiCheckLine,
  RiCloseLine,
  RiCheckDoubleLine,
  RiMapPinLine,
  RiGraduationCapLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  deleteTrainingSession,
  markTrainingAttendance,
  markBulkTrainingAttendance,
  type StaffTrainingSession,
} from "@/lib/training-actions";
import { formatTimeRange } from "@/lib/format";
import {
  formatDateOnly,
  isPastInAppZone,
  isTodayInAppZone,
} from "@/lib/date-only";

interface TrainingDetailViewProps {
  session: StaffTrainingSession;
}

const TYPE_LABELS: Record<string, string> = {
  INDUCTION: "Induction",
  DE_ESCALATION: "De-escalation",
  HEALTH_SAFETY: "Health & Safety",
  OTHER: "Other",
};

const TYPE_VARIANTS: Record<string, "info" | "amber" | "success" | "neutral"> = {
  INDUCTION: "info",
  DE_ESCALATION: "amber",
  HEALTH_SAFETY: "success",
  OTHER: "neutral",
};

const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

function formatDate(date: Date): string {
  return formatDateOnly(date, LONG_DATE);
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function TrainingDetailView({ session }: TrainingDetailViewProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const past = isPastInAppZone(session.date);
  const today = isTodayInAppZone(session.date);
  const canMarkAttendance = past || today;
  const activeRegistrations = session.attendances.filter(
    (a) => a.status === "REGISTERED" || a.status === "ATTENDED"
  );
  const unmarkedRegistrations = session.attendances.filter(
    (a) => a.status === "REGISTERED"
  );

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteTrainingSession(session.id);
    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      setShowDelete(false);
    } else {
      toast.success("Training session deleted.");
      router.push("/staff/training");
    }
  }

  function handleMarkAttendance(attendanceId: string, status: "ATTENDED" | "NO_SHOW") {
    setMarkingId(attendanceId);
    startTransition(async () => {
      const result = await markTrainingAttendance(attendanceId, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(status === "ATTENDED" ? "Marked as attended" : "Marked as no show");
      }
      setMarkingId(null);
    });
  }

  function handleMarkAllAttended() {
    startTransition(async () => {
      const attendanceMap: Record<string, "ATTENDED" | "NO_SHOW"> = {};
      for (const a of unmarkedRegistrations) {
        attendanceMap[a.id] = "ATTENDED";
      }
      const result = await markBulkTrainingAttendance(session.id, attendanceMap);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Marked ${unmarkedRegistrations.length} volunteer${unmarkedRegistrations.length > 1 ? "s" : ""} as attended`
        );
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Session info */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>{formatDate(session.date)}</CardTitle>
          <CardDescription>
            Created by {session.createdBy.name || "Unknown"}
          </CardDescription>
          {(past || today) && (
            <CardAction>
              {today ? (
                <Badge>Today</Badge>
              ) : (
                <Badge variant="neutral">Past</Badge>
              )}
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <RiGraduationCapLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <Badge variant={TYPE_VARIANTS[session.type] || "neutral"}>
                {TYPE_LABELS[session.type] || session.type}
              </Badge>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <RiTimeLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="tnum">
                {formatTimeRange(session.startTime, session.endTime)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <RiTeamLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="tnum">
                {activeRegistrations.length}/{session.capacity} filled
              </span>
              <CapacityMeter
                filled={activeRegistrations.length}
                capacity={session.capacity}
              />
            </div>
            {session.location && (
              <div className="flex items-center gap-2.5 text-sm">
                <RiMapPinLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span>{session.location}</span>
              </div>
            )}
          </div>

          {session.description && (
            <div className="rounded-lg bg-muted p-3">
              <p className="eyebrow text-[0.62rem] text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm">{session.description}</p>
            </div>
          )}

          {/* Attendance summary */}
          {canMarkAttendance && session.attendances.length > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <p className="eyebrow text-[0.62rem] text-muted-foreground">
                Attendance summary
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-semibold text-success tnum">
                    {session.attendances.filter((a) => a.status === "ATTENDED").length}
                  </span>{" "}
                  attended
                </div>
                <div>
                  <span className="font-semibold text-destructive tnum">
                    {session.attendances.filter((a) => a.status === "NO_SHOW").length}
                  </span>{" "}
                  no show
                </div>
                <div>
                  <span className="font-semibold text-info tnum">
                    {unmarkedRegistrations.length}
                  </span>{" "}
                  unmarked
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground tnum">
                    {session.attendances.filter((a) => a.status === "CANCELLED").length}
                  </span>{" "}
                  cancelled
                </div>
              </div>
            </div>
          )}

          {!past && !today && (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setShowDelete(true)}
            >
              <RiDeleteBinLine className="size-4" />
              Delete session
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Registrations + Attendance */}
      <Card className="lg:col-span-2">
        <CardHeader className={session.attendances.length > 0 ? "border-b" : undefined}>
          <CardTitle>Volunteers ({session.attendances.length})</CardTitle>
          <CardDescription>
            {canMarkAttendance
              ? "Mark attendance for this session"
              : "Who’s registered for this session"}
          </CardDescription>
          {canMarkAttendance && unmarkedRegistrations.length > 1 && (
            <CardAction>
              <Button
                size="sm"
                onClick={handleMarkAllAttended}
                disabled={isPending}
              >
                {isPending ? (
                  <RiLoader4Line className="size-3.5 animate-spin" />
                ) : (
                  <RiCheckDoubleLine className="size-3.5" />
                )}
                Mark all attended
              </Button>
            </CardAction>
          )}
        </CardHeader>
        {session.attendances.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <IconChip size="lg">
              <RiUserLine />
            </IconChip>
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No one registered yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Volunteers will appear here as they book this session.
              </p>
            </div>
          </CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {session.attendances.map((attendance) => (
              <li
                key={attendance.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3"
              >
                <Avatar>
                  <AvatarFallback>
                    {initials(attendance.volunteer.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {attendance.volunteer.user.name || "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {attendance.volunteer.user.email}
                  </p>
                </div>
                <StatusBadge status={attendance.status} className="shrink-0" />
                {canMarkAttendance && attendance.status !== "CANCELLED" && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={attendance.status === "ATTENDED" ? "secondary" : "outline"}
                      className={
                        attendance.status === "ATTENDED"
                          ? "bg-success-tint text-success-tint-foreground hover:bg-success-tint/80"
                          : undefined
                      }
                      aria-pressed={attendance.status === "ATTENDED"}
                      disabled={isPending && markingId === attendance.id}
                      onClick={() =>
                        handleMarkAttendance(attendance.id, "ATTENDED")
                      }
                    >
                      {isPending && markingId === attendance.id ? (
                        <RiLoader4Line className="size-3.5 animate-spin" />
                      ) : (
                        <RiCheckLine className="size-3.5" />
                      )}
                      Attended
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance.status === "NO_SHOW" ? "secondary" : "outline"}
                      className={
                        attendance.status === "NO_SHOW"
                          ? "bg-destructive-tint text-destructive-tint-foreground hover:bg-destructive-tint/80"
                          : undefined
                      }
                      aria-pressed={attendance.status === "NO_SHOW"}
                      disabled={isPending && markingId === attendance.id}
                      onClick={() =>
                        handleMarkAttendance(attendance.id, "NO_SHOW")
                      }
                    >
                      <RiCloseLine className="size-3.5" />
                      No show
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this training session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the session{" "}
              <strong>{session.title}</strong> on{" "}
              <strong>{formatDate(session.date)}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <RiLoader4Line className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
