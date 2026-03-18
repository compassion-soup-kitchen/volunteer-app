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
  RiMapPinLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiUserLine,
  RiMailLine,
  RiFileTextLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { deleteShift, type StaffShift } from "@/lib/shift-actions";

interface ShiftDetailViewProps {
  shift: StaffShift;
}

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

function statusBadge(status: string) {
  switch (status) {
    case "SIGNED_UP":
      return <Badge className="bg-blue-600">Signed up</Badge>;
    case "ATTENDED":
      return <Badge className="bg-green-600">Attended</Badge>;
    case "NO_SHOW":
      return <Badge variant="destructive">No show</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ShiftDetailView({ shift }: ShiftDetailViewProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const past = isPast(shift.date);
  const activeSignups = shift.signups.filter(
    (s) => s.status === "SIGNED_UP" || s.status === "ATTENDED"
  );

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteShift(shift.id);
    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      setShowDelete(false);
    } else {
      toast.success("Shift deleted.");
      router.push("/staff/shifts");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Shift info */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">
              {shift.serviceArea.name}
            </CardTitle>
            {past && (
              <Badge variant="secondary">Past</Badge>
            )}
          </div>
          <CardDescription>
            Created by {shift.createdBy.name || "Unknown"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <RiCalendarLine className="size-4 text-muted-foreground" />
              <span>{formatDate(shift.date)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RiTimeLine className="size-4 text-muted-foreground" />
              <span className="font-mono">
                {shift.startTime}–{shift.endTime}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RiTeamLine className="size-4 text-muted-foreground" />
              <span>
                {activeSignups.length}/{shift.capacity} spots filled
              </span>
            </div>
          </div>

          {shift.notes && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                <RiFileTextLine className="size-3.5" />
                Notes
              </div>
              <p className="text-sm">{shift.notes}</p>
            </div>
          )}

          {!past && (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setShowDelete(true)}
            >
              <RiDeleteBinLine className="mr-2 size-4" />
              Delete Shift
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Signups */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RiTeamLine className="size-5 text-primary" />
            Volunteers ({shift.signups.length})
          </CardTitle>
          <CardDescription>
            Who&apos;s signed up for this shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shift.signups.length === 0 ? (
            <div className="py-8 text-center">
              <RiUserLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No volunteers signed up yet
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shift.signups.map((signup) => (
                      <TableRow key={signup.id}>
                        <TableCell className="font-medium">
                          {signup.volunteer.user.name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {signup.volunteer.user.email}
                        </TableCell>
                        <TableCell>{statusBadge(signup.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list */}
              <div className="space-y-3 sm:hidden">
                {shift.signups.map((signup) => (
                  <div
                    key={signup.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {signup.volunteer.user.name || "—"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RiMailLine className="size-3" />
                        {signup.volunteer.user.email}
                      </p>
                    </div>
                    {statusBadge(signup.status)}
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
            <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the shift on{" "}
              <strong>{formatDate(shift.date)}</strong> (
              {shift.serviceArea.name}, {shift.startTime}–{shift.endTime}).
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
