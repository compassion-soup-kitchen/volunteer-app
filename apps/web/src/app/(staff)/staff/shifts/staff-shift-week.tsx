"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent } from "@/components/ui/card";
import { DateBlock } from "@/components/brand/date-block";
import { CapacityMeter } from "@/components/brand/capacity-meter";
import { Illustration } from "@/components/brand/illustration";
import { WeekPager, useRosterWeekNavigation } from "@/components/brand/week-pager";
import { StatusBadge } from "@/components/brand/status-badge";
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiDoorClosedLine,
  RiEyeLine,
  RiLoader4Line,
  RiLockLine,
  RiMoreLine,
  RiPencilLine,
  RiRepeatLine,
  RiUserAddLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { deleteShift, type StaffShift } from "@/lib/shift-actions";
import { formatTimeRange, personName } from "@/lib/format";
import {
  formatDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";
import {
  attendanceDue,
  groupByDay,
  needsPeople,
  rosterWeekSummary,
  weekDays,
} from "@/lib/roster-week";
import { isHeldForOffers } from "@/lib/shift-offers";
import { cn } from "@/lib/utils";

const PATH = "/staff/shifts";

/** Names listed on a row before the rest become "+3". */
const NAMES_SHOWN = 3;

interface StaffShiftWeekProps {
  shifts: StaffShift[];
  closures: { date: DateOnly; reason: string }[];
  serviceAreas: { id: string; name: string }[];
  weekStart: DateOnly;
  today: DateOnly;
  areaId: string | null;
}

export function StaffShiftWeek({
  shifts,
  closures,
  serviceAreas,
  weekStart,
  today,
  areaId,
}: StaffShiftWeekProps) {
  const { isPending, go, refresh } = useRosterWeekNavigation(PATH, today);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffShift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filled = (shift: StaffShift) => ({
    date: shift.date,
    capacity: shift.capacity,
    filled: shift.signups.length,
  });
  const summary = rosterWeekSummary(shifts.map(filled), today);
  const closedByDate = useMemo(
    () => new Map(closures.map((closure) => [closure.date, closure.reason])),
    [closures]
  );

  const shown = gapsOnly
    ? shifts.filter((shift) => needsPeople(filled(shift), today))
    : shifts;
  const days = groupByDay(shown, weekDays(weekStart)).filter(
    // With the gaps filter on, a day with nothing to fill has nothing to say.
    (day) => !gapsOnly || day.shifts.length > 0
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteShift(deleteTarget.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Shift deleted.");
      refresh();
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      {/* Week + filters */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <WeekPager
          weekStart={weekStart}
          today={today}
          pending={isPending}
          onNavigate={(week) => go(week, areaId)}
          className="min-w-0 flex-1 sm:flex-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={areaId ?? "all"}
            onValueChange={(value) => go(weekStart, value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[200px]" aria-label="Service area">
              <SelectValue placeholder="All service areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All service areas</SelectItem>
              {serviceAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={gapsOnly ? "secondary" : "outline"}
            size="sm"
            aria-pressed={gapsOnly}
            onClick={() => setGapsOnly((on) => !on)}
            disabled={summary.needPeople === 0 && !gapsOnly}
          >
            <RiUserAddLine className="size-4" />
            Needs people
            <span
              className={cn(
                "tnum",
                summary.needPeople > 0 ? "text-primary" : "text-muted-foreground"
              )}
            >
              {summary.needPeople}
            </span>
          </Button>
        </div>
      </div>

      {/* The week in figures */}
      {summary.shifts > 0 && (
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground tnum">{summary.shifts}</strong>{" "}
            {summary.shifts === 1 ? "shift" : "shifts"}
          </span>
          <span>
            <strong className="font-semibold text-foreground tnum">
              {summary.filled} of {summary.capacity}
            </strong>{" "}
            spots filled
          </span>
          {summary.needPeople > 0 && (
            <span>
              <strong className="font-semibold text-primary tnum">
                {summary.needPeople}
              </strong>{" "}
              still {summary.needPeople === 1 ? "needs" : "need"} people
            </span>
          )}
        </p>
      )}

      {/* One card for the week, a row of days down the left */}
      {days.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Illustration name="coffee" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                Every shift this week has its people
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn off &ldquo;Needs people&rdquo; to see the whole week.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={cn(
            "gap-0 py-0 transition-opacity",
            isPending && "opacity-60"
          )}
          aria-busy={isPending}
        >
          <ul className="divide-y divide-border">
            {days.map((day) => (
              <DayRow
                key={day.date}
                date={day.date}
                today={today}
                closure={closedByDate.get(day.date) ?? null}
                shifts={day.shifts}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the shift
              {deleteTarget && (
                <>
                  {" "}
                  on <strong>{formatDateOnly(deleteTarget.date)}</strong> (
                  {deleteTarget.serviceArea.name},{" "}
                  {formatTimeRange(deleteTarget.startTime, deleteTarget.endTime)})
                </>
              )}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? (
                <RiLoader4Line data-icon="inline-start" className="size-4 animate-spin" />
              ) : (
                <RiDeleteBinLine data-icon="inline-start" className="size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── A day ──────────────────────────────────────────────

function DayRow({
  date,
  today,
  closure,
  shifts,
  onDelete,
}: {
  date: DateOnly;
  today: DateOnly;
  closure: string | null;
  shifts: StaffShift[];
  onDelete: (shift: StaffShift) => void;
}) {
  const isToday = date === today;
  const isPast = date < today;
  const label = formatDateOnly(parseDateOnly(date), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <li
      aria-label={isToday ? `Today, ${label}` : label}
      className="grid grid-cols-[4rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)]"
    >
      <div
        className={cn(
          "flex items-start justify-center border-r border-border py-3.5",
          isToday && "bg-primary-tint"
        )}
      >
        <DateBlock
          date={parseDateOnly(date)}
          className={isPast ? "opacity-55" : undefined}
        />
      </div>

      <ul className="divide-y divide-border">
        {closure && (
          <li className="flex items-center gap-2 px-4 py-3.5 text-sm text-muted-foreground sm:px-5">
            <RiDoorClosedLine aria-hidden className="size-4 shrink-0" />
            <span>
              <span className="font-medium text-foreground">Kitchen closed</span>{" "}
              &ndash; {closure}
            </span>
            <Link
              href={`/staff/calendar?month=${date.slice(0, 7)}&day=${date}`}
              className="ml-auto shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Calendar
            </Link>
          </li>
        )}

        {shifts.map((shift) => (
          <ShiftRow
            key={shift.id}
            shift={shift}
            today={today}
            onDelete={() => onDelete(shift)}
          />
        ))}

        {!closure && shifts.length === 0 && (
          <li className="flex min-h-[4.75rem] items-center gap-3 px-4 py-3.5 text-sm text-muted-foreground sm:px-5">
            <span>Nothing rostered</span>
            {!isPast && (
              <Button asChild variant="ghost" size="xs" className="ml-auto">
                <Link href={`/staff/shifts/new?date=${date}`}>
                  <RiAddLine />
                  Add shift
                </Link>
              </Button>
            )}
          </li>
        )}
      </ul>
    </li>
  );
}

// ─── A shift ────────────────────────────────────────────

function ShiftRow({
  shift,
  today,
  onDelete,
}: {
  shift: StaffShift;
  today: DateOnly;
  onDelete: () => void;
}) {
  const router = useRouter();
  const href = `/staff/shifts/${shift.id}`;
  const filled = shift.signups.length;
  const held = isHeldForOffers(shift);
  const markAttendance = attendanceDue(shift, today);
  const names = shift.signups.map((signup) => personName(signup.volunteer.user));
  const time = formatTimeRange(shift.startTime, shift.endTime);

  return (
    <li className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40 sm:gap-4 sm:px-5">
      <span className="hidden w-28 shrink-0 text-sm font-medium tnum sm:block">
        {time}
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* The whole row opens the shift; the menu sits above the link. */}
          <Link
            href={href}
            className="truncate font-serif text-base/snug font-medium tracking-tight outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring/60 focus-visible:after:ring-inset"
          >
            {shift.serviceArea.name}
          </Link>
          {shift.pattern && (
            <RiRepeatLine
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label="Repeating shift"
            />
          )}
          {held && (
            <StatusBadge
              status="HELD"
              label={
                <>
                  <RiLockLine aria-hidden />
                  First refusal
                </>
              }
            />
          )}
          {markAttendance && (
            <StatusBadge
              status="ATTENDANCE_DUE"
              label={
                <>
                  <RiCheckboxCircleLine aria-hidden />
                  Mark attendance
                </>
              }
            />
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          <span className="tnum sm:hidden">{time} · </span>
          {names.length === 0 ? (
            "No one on yet"
          ) : (
            <span title={names.join(", ")}>
              {names.slice(0, NAMES_SHOWN).join(", ")}
              {names.length > NAMES_SHOWN && ` +${names.length - NAMES_SHOWN}`}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <CapacityMeter
          filled={filled}
          capacity={shift.capacity}
          className="hidden sm:flex"
        />
        <span
          className={cn(
            "text-xs tnum",
            needsPeople({ date: shift.date, capacity: shift.capacity, filled }, today)
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {filled}/{shift.capacity}
          <span className="hidden sm:inline"> filled</span>
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${shift.serviceArea.name}, ${time}`}
            className="relative z-10"
          >
            <RiMoreLine className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(href)}>
            <RiEyeLine className="size-4" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`${href}/edit`)}>
            <RiPencilLine className="size-4" />
            Edit shift
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
          >
            <RiDeleteBinLine className="size-4" />
            Delete shift
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
