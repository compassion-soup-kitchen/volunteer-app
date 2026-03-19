"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  RiDeleteBinLine,
  RiLoader4Line,
  RiUserLine,
  RiMailLine,
  RiFileTextLine,
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

interface TrainingDetailViewProps {
  session: StaffTrainingSession;
}

const TYPE_LABELS: Record<string, string> = {
  INDUCTION: "Induction",
  DE_ESCALATION: "De-escalation",
  HEALTH_SAFETY: "Health & Safety",
  OTHER: "Other",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isPast(date: Date): boolean {
  return new Date(date) < new Date(new Date().toISOString().split("T")[0]);
}

function isToday(date: Date): boolean {
  const today = new Date().toISOString().split("T")[0];
  const sessionDate = new Date(date).toISOString().split("T")[0];
  return today === sessionDate;
}

function statusBadge(status: string) {
  switch (status) {
    case "REGISTERED":
      return <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-400">Registered</Badge>;
    case "ATTENDED":
      return <Badge className="bg-green-600/15 text-green-700 dark:text-green-400">Attended</Badge>;
    case "NO_SHOW":
      return <Badge variant="destructive">No show</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TrainingDetailView({ session }: TrainingDetailViewProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const past = isPast(session.date);
  const today = isToday(session.date);
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
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{session.title}</CardTitle>
            {past && <Badge variant="secondary">Past</Badge>}
            {today && <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-400">Today</Badge>}
          </div>
          <CardDescription>
            Created by {session.createdBy.name || "Unknown"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <RiGraduationCapLine className="size-4 text-muted-foreground" />
              <Badge variant="outline">{TYPE_LABELS[session.type] || session.type}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RiCalendarLine className="size-4 text-muted-foreground" />
              <span>{formatDate(session.date)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RiTimeLine className="size-4 text-muted-foreground" />
              <span className="font-mono">
                {session.startTime}–{session.endTime}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RiTeamLine className="size-4 text-muted-foreground" />
              <span>
                {activeRegistrations.length}/{session.capacity} spots filled
              </span>
            </div>
            {session.location && (
              <div className="flex items-center gap-3 text-sm">
                <RiMapPinLine className="size-4 text-muted-foreground" />
                <span>{session.location}</span>
              </div>
            )}
          </div>

          {session.description && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                <RiFileTextLine className="size-3.5" />
                Description
              </div>
              <p className="text-sm">{session.description}</p>
            </div>
          )}

          {/* Attendance summary */}
          {canMarkAttendance && session.attendances.length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Attendance Summary
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-green-600 font-medium">
                    {session.attendances.filter((a) => a.status === "ATTENDED").length}
                  </span>{" "}
                  attended
                </div>
                <div>
                  <span className="text-destructive font-medium">
                    {session.attendances.filter((a) => a.status === "NO_SHOW").length}
                  </span>{" "}
                  no show
                </div>
                <div>
                  <span className="text-blue-600 font-medium">
                    {unmarkedRegistrations.length}
                  </span>{" "}
                  unmarked
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">
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
              <RiDeleteBinLine className="mr-2 size-4" />
              Delete Session
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Registrations + Attendance */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RiTeamLine className="size-5 text-primary" />
                Volunteers ({session.attendances.length})
              </CardTitle>
              <CardDescription>
                {canMarkAttendance
                  ? "Mark attendance for this session"
                  : "Who\u2019s registered for this session"}
              </CardDescription>
            </div>
            {canMarkAttendance && unmarkedRegistrations.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllAttended}
                disabled={isPending}
              >
                {isPending ? (
                  <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RiCheckDoubleLine className="mr-1.5 size-3.5" />
                )}
                Mark All Attended
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {session.attendances.length === 0 ? (
            <div className="py-8 text-center">
              <RiUserLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No volunteers registered yet
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      {canMarkAttendance && (
                        <TableHead style={{ textAlign: "right" }}>
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {session.attendances.map((attendance) => (
                      <TableRow key={attendance.id}>
                        <TableCell className="font-medium">
                          {attendance.volunteer.user.name || "\u2014"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {attendance.volunteer.user.email}
                        </TableCell>
                        <TableCell>{statusBadge(attendance.status)}</TableCell>
                        {canMarkAttendance && (
                          <TableCell style={{ textAlign: "right" }}>
                            {attendance.status !== "CANCELLED" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon-sm"
                                  variant={attendance.status === "ATTENDED" ? "default" : "ghost"}
                                  className={
                                    attendance.status === "ATTENDED"
                                      ? "bg-green-600 text-white hover:bg-green-700"
                                      : "text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
                                  }
                                  disabled={isPending && markingId === attendance.id}
                                  onClick={() =>
                                    handleMarkAttendance(attendance.id, "ATTENDED")
                                  }
                                  aria-label="Mark attended"
                                >
                                  {isPending && markingId === attendance.id ? (
                                    <RiLoader4Line className="size-4 animate-spin" />
                                  ) : (
                                    <RiCheckLine className="size-4" />
                                  )}
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant={attendance.status === "NO_SHOW" ? "default" : "ghost"}
                                  className={
                                    attendance.status === "NO_SHOW"
                                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      : "text-destructive hover:bg-destructive/10"
                                  }
                                  disabled={isPending && markingId === attendance.id}
                                  onClick={() =>
                                    handleMarkAttendance(attendance.id, "NO_SHOW")
                                  }
                                  aria-label="Mark no show"
                                >
                                  <RiCloseLine className="size-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list */}
              <div className="space-y-3 sm:hidden">
                {session.attendances.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="rounded-md border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {attendance.volunteer.user.name || "\u2014"}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RiMailLine className="size-3" />
                          {attendance.volunteer.user.email}
                        </p>
                      </div>
                      {statusBadge(attendance.status)}
                    </div>
                    {canMarkAttendance && attendance.status !== "CANCELLED" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={attendance.status === "ATTENDED" ? "default" : "outline"}
                          className={
                            attendance.status === "ATTENDED"
                              ? "flex-1 bg-green-600 text-white hover:bg-green-700"
                              : "flex-1 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
                          }
                          disabled={isPending && markingId === attendance.id}
                          onClick={() =>
                            handleMarkAttendance(attendance.id, "ATTENDED")
                          }
                        >
                          {isPending && markingId === attendance.id ? (
                            <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <RiCheckLine className="mr-1.5 size-3.5" />
                          )}
                          Attended
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance.status === "NO_SHOW" ? "default" : "outline"}
                          className={
                            attendance.status === "NO_SHOW"
                              ? "flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              : "flex-1 text-destructive hover:bg-destructive/10"
                          }
                          disabled={isPending && markingId === attendance.id}
                          onClick={() =>
                            handleMarkAttendance(attendance.id, "NO_SHOW")
                          }
                        >
                          <RiCloseLine className="mr-1.5 size-3.5" />
                          No Show
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
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
