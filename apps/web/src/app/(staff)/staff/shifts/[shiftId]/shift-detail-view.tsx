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
  RiLockLine,
  RiLockUnlockLine,
  RiPencilLine,
  RiUserLine,
  RiCheckLine,
  RiCloseLine,
  RiCheckDoubleLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  deleteShift,
  markAttendance,
  markBulkAttendance,
  type StaffShift,
} from "@/lib/shift-actions";
import { RecordMealsCard } from "./record-meals-card";
import { formatTimeRange } from "@/lib/format";
import {
  formatDateOnly,
  isPastInAppZone,
  isTodayInAppZone,
} from "@/lib/date-only";
import { formatHoldUntil, isHeldForOffers } from "@/lib/shift-offers";

interface ShiftDetailViewProps {
  shift: StaffShift;
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/** How each answer to an offer reads: passing on a shift is not a failure. */
const OFFER_BADGES = {
  PENDING: { label: "Yet to answer", variant: "warning" },
  ACCEPTED: { label: "Taking it", variant: "success" },
  DECLINED: { label: "Passed", variant: "neutral" },
} as const;

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function ShiftDetailView({ shift }: ShiftDetailViewProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const past = isPastInAppZone(shift.date);
  const today = isTodayInAppZone(shift.date);
  const canMarkAttendance = past || today;
  const held = isHeldForOffers(shift);
  const activeSignups = shift.signups.filter(
    (s) => s.status === "SIGNED_UP" || s.status === "ATTENDED"
  );
  const unmarkedSignups = shift.signups.filter(
    (s) => s.status === "SIGNED_UP"
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

  function handleMarkAttendance(signupId: string, status: "ATTENDED" | "NO_SHOW") {
    setMarkingId(signupId);
    startTransition(async () => {
      const result = await markAttendance(signupId, status);
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
      for (const signup of unmarkedSignups) {
        attendanceMap[signup.id] = "ATTENDED";
      }
      const result = await markBulkAttendance(shift.id, attendanceMap);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Marked ${unmarkedSignups.length} volunteer${unmarkedSignups.length > 1 ? "s" : ""} as attended`);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Shift info + kai count */}
      <div className="space-y-6 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{formatDateOnly(shift.date, LONG_DATE)}</CardTitle>
            <CardDescription>
              Created by {shift.createdBy.name || "Unknown"}
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
                <RiTimeLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="tnum">
                  {formatTimeRange(shift.startTime, shift.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <RiTeamLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="tnum">
                  {activeSignups.length}/{shift.capacity} filled
                </span>
                <CapacityMeter
                  filled={activeSignups.length}
                  capacity={shift.capacity}
                />
              </div>
            </div>

            {shift.notes && (
              <div className="rounded-lg bg-muted p-3">
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 text-sm">{shift.notes}</p>
              </div>
            )}

            {/* Attendance summary for past/today shifts */}
            {canMarkAttendance && shift.signups.length > 0 && (
              <div className="rounded-lg bg-muted p-3">
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Attendance summary
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-success tnum">
                      {shift.signups.filter((s) => s.status === "ATTENDED").length}
                    </span>{" "}
                    attended
                  </div>
                  <div>
                    <span className="font-semibold text-destructive tnum">
                      {shift.signups.filter((s) => s.status === "NO_SHOW").length}
                    </span>{" "}
                    no show
                  </div>
                  <div>
                    <span className="font-semibold text-info tnum">
                      {unmarkedSignups.length}
                    </span>{" "}
                    unmarked
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground tnum">
                      {shift.signups.filter((s) => s.status === "CANCELLED").length}
                    </span>{" "}
                    cancelled
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/staff/shifts/${shift.id}/edit`}>
                  <RiPencilLine className="size-4" />
                  Edit shift
                </Link>
              </Button>
              {!past && !today && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <RiDeleteBinLine className="size-4" />
                  Delete shift
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right of first refusal */}
        {shift.offers.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>First refusal</CardTitle>
              <CardDescription>
                {held && shift.offersCloseOn
                  ? `Held for these volunteers until ${formatHoldUntil(shift.offersCloseOn)}`
                  : "Open to all volunteers — the offer has run its course"}
              </CardDescription>
              <CardAction>
                {held ? (
                  <Badge variant="warning" className="gap-1">
                    <RiLockLine aria-hidden className="size-3" />
                    Held
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="gap-1">
                    <RiLockUnlockLine aria-hidden className="size-3" />
                    Open
                  </Badge>
                )}
              </CardAction>
            </CardHeader>
            <ul className="divide-y divide-border">
              {shift.offers.map((offer) => (
                <li
                  key={offer.id}
                  className="flex items-center gap-3 px-5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {offer.volunteer.user.name || offer.volunteer.user.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {offer.volunteer.user.email}
                    </p>
                  </div>
                  <Badge
                    variant={OFFER_BADGES[offer.status].variant}
                    className="shrink-0"
                  >
                    {OFFER_BADGES[offer.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Kai served - recordable once the shift day arrives */}
        {(past || today) && (
          <RecordMealsCard
            shiftId={shift.id}
            mealsServed={shift.mealsServed}
            mealsRecordedAt={shift.mealsRecordedAt}
            mealsRecordedByName={shift.mealsRecordedBy?.name ?? null}
          />
        )}
      </div>

      {/* Signups + Attendance */}
      <Card className="lg:col-span-2">
        <CardHeader className={shift.signups.length > 0 ? "border-b" : undefined}>
          <CardTitle>Volunteers ({shift.signups.length})</CardTitle>
          <CardDescription>
            {canMarkAttendance
              ? "Mark attendance for this shift"
              : "Who’s signed up for this shift"}
          </CardDescription>
          {canMarkAttendance && unmarkedSignups.length > 1 && (
            <CardAction>
              <Button
                size="sm"
                variant="outline"
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
        {shift.signups.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <IconChip size="lg">
              <RiUserLine />
            </IconChip>
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No one signed up yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Volunteers will appear here as they join this shift.
              </p>
            </div>
          </CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {shift.signups.map((signup) => (
              <li
                key={signup.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3"
              >
                <Avatar>
                  <AvatarFallback>
                    {initials(signup.volunteer.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {signup.volunteer.user.name || "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {signup.volunteer.user.email}
                  </p>
                </div>
                <StatusBadge status={signup.status} className="shrink-0" />
                {canMarkAttendance && signup.status !== "CANCELLED" && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={signup.status === "ATTENDED" ? "secondary" : "outline"}
                      className={
                        signup.status === "ATTENDED"
                          ? "bg-success-tint text-success-tint-foreground hover:bg-success-tint/80"
                          : undefined
                      }
                      aria-pressed={signup.status === "ATTENDED"}
                      disabled={isPending && markingId === signup.id}
                      onClick={() =>
                        handleMarkAttendance(signup.id, "ATTENDED")
                      }
                    >
                      {isPending && markingId === signup.id ? (
                        <RiLoader4Line className="size-3.5 animate-spin" />
                      ) : (
                        <RiCheckLine className="size-3.5" />
                      )}
                      Attended
                    </Button>
                    <Button
                      size="sm"
                      variant={signup.status === "NO_SHOW" ? "secondary" : "outline"}
                      className={
                        signup.status === "NO_SHOW"
                          ? "bg-destructive-tint text-destructive-tint-foreground hover:bg-destructive-tint/80"
                          : undefined
                      }
                      aria-pressed={signup.status === "NO_SHOW"}
                      disabled={isPending && markingId === signup.id}
                      onClick={() =>
                        handleMarkAttendance(signup.id, "NO_SHOW")
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
            <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the shift on{" "}
              <strong>{formatDateOnly(shift.date, LONG_DATE)}</strong> (
              {shift.serviceArea.name}, {formatTimeRange(shift.startTime, shift.endTime)}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
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
