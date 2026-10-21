"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleChip } from "@/components/ui/toggle-chip";
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
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiDoorClosedLine,
  RiLoader4Line,
  RiLockLine,
  RiSuitcaseLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/brand/eyebrow";
import { CapacityMeter } from "@/components/brand/capacity-meter";
import { Illustration } from "@/components/brand/illustration";
import { WeekPager, useRosterWeekNavigation } from "@/components/brand/week-pager";
import { StatusBadge } from "@/components/brand/status-badge";
import {
  signUpForShift,
  cancelShiftSignup,
  respondToShiftOffer,
  type ShiftWithDetails,
} from "@/lib/shift-actions";
import { formatTime } from "@/lib/format";
import {
  addDaysToDateOnly,
  formatDateOnly,
  parseDateOnly,
  startOfWeekOf,
  type DateOnly,
} from "@/lib/date-only";
import { groupByDay, weekDays } from "@/lib/roster-week";
import { formatHoldUntil } from "@/lib/shift-offers";

const PATH = "/shifts";

interface ShiftBrowserProps {
  shifts: ShiftWithDetails[];
  closures: { date: DateOnly; reason: string }[];
  serviceAreas: { id: string; name: string }[];
  canSignUp: boolean;
  weekStart: DateOnly;
  today: DateOnly;
  areaId: string | null;
  /** `?day=` - a link to one shift opens its week scrolled to that day. */
  focusDay: DateOnly | null;
}

/** Red overline above the day heading: "Today", "Tomorrow", or the weekday. */
function dayOverline(date: DateOnly, today: DateOnly): string {
  if (date === today) return "Today";
  if (date === addDaysToDateOnly(today, 1)) return "Tomorrow";
  return formatDateOnly(parseDateOnly(date), { weekday: "long" });
}

/** Serif day heading: "23 July". */
function dayHeading(date: DateOnly): string {
  return formatDateOnly(parseDateOnly(date), { day: "numeric", month: "long" });
}

const isMine = (shift: ShiftWithDetails) => shift.userSignupStatus === "SIGNED_UP";

/**
 * Bring a day's shifts into view. Looked up inside this view rather than by
 * id: Next keeps the previous week mounted (hidden), so a day can be in the
 * document twice.
 */
function scrollToDay(root: HTMLElement | null, date: DateOnly, smooth = true) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root
    ?.querySelector(`[data-day="${date}"]`)
    ?.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
}

export function ShiftBrowser({
  shifts,
  closures,
  serviceAreas,
  canSignUp,
  weekStart,
  today,
  areaId,
  focusDay,
}: ShiftBrowserProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isPending, go, refresh } = useRosterWeekNavigation(PATH, today);
  const [loadingShiftId, setLoadingShiftId] = useState<string | null>(null);
  // The shift whose cancellation is waiting on the volunteer's confirmation.
  const [cancelId, setCancelId] = useState<string | null>(null);

  const closedByDate = new Map(closures.map((closure) => [closure.date, closure.reason]));
  const week = groupByDay(shifts, weekDays(weekStart));
  // Volunteers only need the days there's something on - or a closure to explain.
  const days = week.filter(
    (day) => day.shifts.length > 0 || (closedByDate.has(day.date) && day.date >= today)
  );

  async function handleSignUp(shiftId: string) {
    setLoadingShiftId(shiftId);
    const result = await signUpForShift(shiftId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Kia ora! You're signed up for this shift.");
      refresh();
    }
    setLoadingShiftId(null);
  }

  async function handleCancel(shiftId: string) {
    setCancelId(null);
    setLoadingShiftId(shiftId);
    const result = await cancelShiftSignup(shiftId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Signup cancelled.");
      refresh();
    }
    setLoadingShiftId(null);
  }

  /** Passing on an offer hands the shift to whoever wants it next. */
  async function handleDeclineOffer(shiftId: string) {
    setLoadingShiftId(shiftId);
    const result = await respondToShiftOffer(shiftId, "DECLINE");
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("No worries — we've passed it on.");
      refresh();
    }
    setLoadingShiftId(null);
  }

  // A passive effect runs after Next's own scroll-to-top for the navigation,
  // so this lands last.
  useEffect(() => {
    if (focusDay) scrollToDay(rootRef.current, focusDay, false);
  }, [focusDay]);

  const filterOptions = [{ id: null, name: "All areas" }, ...serviceAreas];

  return (
    <div ref={rootRef} className="space-y-8">
      <div className="space-y-4">
        <WeekPager
          weekStart={weekStart}
          today={today}
          pending={isPending}
          canGoBack={weekStart > startOfWeekOf(today)}
          onNavigate={(next) => go(next, areaId)}
        />

        {/* The week at a glance - a tap brings that day up */}
        <div role="group" aria-label="Days this week" className="grid grid-cols-7 gap-1.5 sm:max-w-lg">
          {week.map((day) => {
            const closed = closedByDate.get(day.date);
            const open = day.shifts.length > 0 && day.date >= today;
            const mine = day.shifts.some(isMine);
            const weekday = formatDateOnly(parseDateOnly(day.date), { weekday: "short" });
            const numeral = formatDateOnly(parseDateOnly(day.date), { day: "numeric" });
            const summary = closed
              ? "kitchen closed"
              : mine
                ? "you're on"
                : open
                  ? `${day.shifts.length} ${day.shifts.length === 1 ? "shift" : "shifts"}`
                  : "nothing on";
            return (
              <button
                key={day.date}
                type="button"
                disabled={!open && !(closed && day.date >= today)}
                onClick={() => scrollToDay(rootRef.current, day.date)}
                aria-label={`${formatDateOnly(parseDateOnly(day.date), {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}, ${summary}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg bg-card py-2 ring-1 ring-border transition-colors outline-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:bg-transparent disabled:opacity-45",
                  mine && "ring-primary/40"
                )}
              >
                <span
                  className={cn(
                    "text-2xs font-semibold",
                    day.date === today ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {weekday}
                </span>
                <span
                  className={cn(
                    "font-serif text-lg/none font-medium tnum",
                    closed && "text-muted-foreground line-through"
                  )}
                >
                  {numeral}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 size-1.5 rounded-full",
                    mine ? "bg-primary" : open ? "bg-muted-foreground/60" : "bg-transparent"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Service-area filter pills - one swipeable row on a phone, bleeding to the screen edge */}
        <div
          role="group"
          aria-label="Filter by service area"
          className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {filterOptions.map((area) => {
            const selected = areaId === area.id;
            return (
              <ToggleChip
                key={area.id ?? "all"}
                pressed={selected}
                onClick={() => go(weekStart, area.id)}
              >
                {area.name}
              </ToggleChip>
            );
          })}
        </div>
      </div>

      {days.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Illustration name="cafe" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                Nothing open this week
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {areaId
                  ? "Try another area, or have a look at the week after."
                  : "New mahi is added regularly - have a look at the week after."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => go(addDaysToDateOnly(weekStart, 7), areaId)}
            >
              Next week
              <RiArrowRightSLine />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn("space-y-8 transition-opacity", isPending && "opacity-60")}
          aria-busy={isPending}
        >
          {days.map((day) => {
            const closed = closedByDate.get(day.date);
            return (
              <section
                key={day.date}
                data-day={day.date}
                className="scroll-mt-24 space-y-3"
              >
                <div className="space-y-0.5">
                  <Eyebrow>{dayOverline(day.date, today)}</Eyebrow>
                  <h2 className="font-serif text-xl font-medium tracking-tight">
                    {dayHeading(day.date)}
                  </h2>
                </div>

                <Card className="gap-0 py-0">
                  <ul className="divide-y divide-border">
                    {closed && (
                      <li className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground sm:px-5">
                        <RiDoorClosedLine aria-hidden className="size-4 shrink-0" />
                        <span>
                          <span className="font-medium text-foreground">
                            The kitchen is closed
                          </span>{" "}
                          &ndash; {closed}
                        </span>
                      </li>
                    )}
                    {day.shifts.map((shift) => (
                      <ShiftRow
                        key={shift.id}
                        shift={shift}
                        canSignUp={canSignUp}
                        isLoading={loadingShiftId === shift.id}
                        onSignUp={() => handleSignUp(shift.id)}
                        onCancel={() => setCancelId(shift.id)}
                        onDecline={() => handleDeclineOffer(shift.id)}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}

      {/* Cancel confirmation - one tap shouldn't drop a shift by accident */}
      <AlertDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Your spot will open up for another volunteer. You can sign up
              again later if it&apos;s still free.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my spot</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && handleCancel(cancelId)}
              variant="destructive"
            >
              Cancel shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── A shift ────────────────────────────────────────────

function ShiftRow({
  shift,
  canSignUp,
  isLoading,
  onSignUp,
  onCancel,
  onDecline,
}: {
  shift: ShiftWithDetails;
  canSignUp: boolean;
  isLoading: boolean;
  onSignUp: () => void;
  onCancel: () => void;
  onDecline: () => void;
}) {
  const spotsLeft = shift.capacity - shift.signupCount;
  const isFull = spotsLeft <= 0;
  const isSignedUp = isMine(shift);
  // Held for its regulars: theirs to take, everyone else waits.
  const offeredToMe = shift.heldForOffers && shift.userOfferStatus === "PENDING";
  const heldForOthers = shift.heldForOffers && !offeredToMe;
  // Their own leave covers the day - it's theirs to change, not ours to sign them up.
  const onLeave = shift.userOnLeave && !isSignedUp;

  return (
    <li className="relative flex gap-4 px-4 py-4 sm:px-5">
      {(isSignedUp || offeredToMe) && (
        // The red mission rail marks the volunteer's own commitment
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      )}

      {/* Start over finish, so a day reads down like a timetable */}
      <p className="w-12 shrink-0 pt-0.5 tnum">
        <span className="block text-sm font-semibold">{formatTime(shift.startTime)}</span>
        <span className="sr-only"> to </span>
        <span className="block text-sm text-muted-foreground">
          {formatTime(shift.endTime)}
        </span>
      </p>

      {/* Below sm the seats and buttons sit under the details; from sm they take a column on the right */}
      <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-8">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2 sm:justify-start sm:gap-3">
            <h3 className="font-serif text-lg/snug font-medium tracking-tight">
              {shift.serviceArea.name}
            </h3>
            {isSignedUp ? (
              <StatusBadge status="SIGNED_UP" className="shrink-0" />
            ) : onLeave ? (
              <StatusBadge
                status="ON_LEAVE"
                className="shrink-0"
                label={
                  <>
                    <RiSuitcaseLine aria-hidden />
                    On leave
                  </>
                }
              />
            ) : offeredToMe ? (
              <StatusBadge status="OFFER_PENDING" label="Yours first" className="shrink-0" />
            ) : heldForOthers ? (
              <StatusBadge
                status="HELD_FOR_OTHERS"
                className="shrink-0"
                label={
                  <>
                    <RiLockLine aria-hidden />
                    Held
                  </>
                }
              />
            ) : null}
          </div>

          {shift.notes && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{shift.notes}</p>
          )}

          {offeredToMe && shift.offersCloseOn && (
            <p className="rounded-md bg-warning-tint px-3 py-2 text-sm text-warning-tint-foreground">
              Held for you until {formatHoldUntil(shift.offersCloseOn)}. Let us know
              either way and we&apos;ll offer it on if you can&apos;t make it.
            </p>
          )}

          {heldForOthers && shift.offersCloseOn && (
            <p className="text-sm text-muted-foreground">
              Offered to the regular crew until {formatHoldUntil(shift.offersCloseOn)} —
              open to everyone after that.
            </p>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:mt-0 sm:min-w-40 sm:shrink-0 sm:flex-col sm:items-end sm:justify-start sm:pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <CapacityMeter filled={shift.signupCount} capacity={shift.capacity} />
            {isSignedUp ? (
              <span className="text-xs font-semibold text-success">You&apos;re in</span>
            ) : isFull ? (
              <span className="text-xs text-muted-foreground">Shift full</span>
            ) : (
              <span
                className={cn(
                  "text-xs whitespace-nowrap tabular-nums",
                  spotsLeft <= 2 ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
              </span>
            )}
          </div>

          {canSignUp && (
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
              {onLeave ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/profile/leave">Your leave</Link>
                </Button>
              ) : isSignedUp ? (
                <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
                  {isLoading ? (
                    <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <RiCloseLine className="mr-1 size-3.5" />
                  )}
                  Cancel
                </Button>
              ) : (
                <>
                  {offeredToMe && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDecline}
                      disabled={isLoading}
                    >
                      Not this time
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSignUp}
                    disabled={isFull || isLoading || heldForOthers}
                  >
                    {isLoading ? (
                      <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <RiCheckLine className="mr-1 size-3.5" />
                    )}
                    {offeredToMe ? "Take it" : "Sign up"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
