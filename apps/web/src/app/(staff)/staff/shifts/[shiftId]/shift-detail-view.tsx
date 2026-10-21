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
import { GroupBadges } from "@/components/brand/group-badge";
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
  RiRepeatLine,
  RiUserUnfollowLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  deleteShift,
  markAttendance,
  markBulkAttendance,
  removeVolunteerFromShift,
  type RosterVolunteer,
  type StaffShift,
  type VolunteerOption,
} from "@/lib/shift-actions";
import { RecordMealsCard } from "./record-meals-card";
import { AddToRoster, type AwayVolunteer } from "./add-to-roster";
import { contactLine, formatTimeRange, personName } from "@/lib/format";
import { describeRecurrence } from "@/lib/shift-patterns";
import {
  formatDateOnly,
  isPastInAppZone,
  isTodayInAppZone,
} from "@/lib/date-only";
import { formatHoldUntil, isHeldForOffers } from "@/lib/shift-offers";

interface ShiftDetailViewProps {
  shift: StaffShift;
  /** Active volunteers staff can put on the roster. */
  volunteers: VolunteerOption[];
  /** Volunteers on leave on this shift's day. */
  away: AwayVolunteer[];
}

/** The line under a volunteer's name, with offline volunteers flagged. */
function VolunteerContact({ volunteer }: { volunteer: RosterVolunteer }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      {volunteer.user.isOffline && <Badge variant="neutral">Offline</Badge>}
      <span className="truncate">
        {contactLine({ email: volunteer.user.email, phone: volunteer.phone })}
      </span>
    </p>
  );
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

export function ShiftDetailView({ shift, volunteers, away }: ShiftDetailViewProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
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
  const [removeTarget, setRemoveTarget] = useState<
    StaffShift["signups"][number] | null
  >(null);

  async function handleRemove(
    target: StaffShift["signups"][number]
  ): Promise<boolean> {
    const result = await removeVolunteerFromShift(target.id);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    toast.success(`${personName(target.volunteer.user)} is off this shift.`);
    router.refresh();
    return true;
  }

  async function handleDelete(): Promise<boolean> {
    const result = await deleteShift(shift.id);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    toast.success("Shift deleted.");
    router.push("/staff/shifts");
    return true;
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
              Created by {shift.createdBy?.name || "Unknown"}
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
              {shift.pattern && (
                <div className="flex items-center gap-2.5 text-sm">
                  <RiRepeatLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <Link
                    href={`/staff/shifts/repeating/${shift.pattern.id}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {describeRecurrence(shift.pattern.weekdays, shift.pattern.interval)}
                  </Link>
                </div>
              )}
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
                      {personName(offer.volunteer.user)}
                    </p>
                    <VolunteerContact volunteer={offer.volunteer} />
                    <GroupBadges
                      groups={offer.volunteer.groups}
                      max={2}
                      className="mt-1"
                    />
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
          <CardDescription className="col-start-1">
            {canMarkAttendance
              ? "Mark attendance for this shift"
              : "Who’s signed up for this shift"}
          </CardDescription>
          {/* On a narrow card the buttons drop below the title rather than
              squeezing it into a sliver. */}
          <CardAction className="flex flex-wrap justify-end gap-2 @max-md/card-header:col-span-2 @max-md/card-header:col-start-1 @max-md/card-header:row-start-3 @max-md/card-header:mt-2 @max-md/card-header:justify-self-start @max-md/card-header:justify-start">
            {canMarkAttendance && unmarkedSignups.length > 1 && (
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
            )}
            <AddToRoster
              shiftId={shift.id}
              volunteers={volunteers}
              rosteredIds={activeSignups.map((s) => s.volunteer.id)}
              isPast={past}
              isFull={activeSignups.length >= shift.capacity}
              away={away}
            />
          </CardAction>
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
                {past
                  ? "Record anyone who came, so their hours count."
                  : "Volunteers appear here as they sign up, or add someone yourself."}
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold">
                      {personName(signup.volunteer.user)}
                    </p>
                    <GroupBadges groups={signup.volunteer.groups} max={2} />
                  </div>
                  <VolunteerContact volunteer={signup.volunteer} />
                </div>
                <StatusBadge status={signup.status} className="shrink-0" />
                {!canMarkAttendance && signup.status === "SIGNED_UP" && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Take ${personName(signup.volunteer.user)} off this shift`}
                    title="Take off this shift"
                    onClick={() => setRemoveTarget(signup)}
                    disabled={isPending}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <RiUserUnfollowLine className="size-4" />
                  </Button>
                )}
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

      {/* Take someone off the roster */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Take {removeTarget ? personName(removeTarget.volunteer.user) : ""} off this shift?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their place opens up for someone else, and they get a
              notification if they use the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them on</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onConfirm={() => (removeTarget ? handleRemove(removeTarget) : false)}
            >
              Take them off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onConfirm={handleDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
