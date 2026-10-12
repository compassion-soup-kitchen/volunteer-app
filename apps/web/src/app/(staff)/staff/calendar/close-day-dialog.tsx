"use client";

import { useEffect, useState, useTransition } from "react";
import { RiAlertLine, RiLoader4Line } from "@remixicon/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  closeDays,
  getClosureImpact,
  type ClosureImpact,
} from "@/lib/closed-day-actions";
import { CLOSURE_REASON_MAX } from "@/lib/closed-days";
import { formatDateOnly, parseDateOnly, type DateOnly } from "@/lib/date-only";
import { formatTimeRange } from "@/lib/format";

const LONG_DAY: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

/** "2 shifts cancelled, 5 volunteers told." - the outcome, in one line. */
export function describeClosureOutcome(result: {
  cancelledShifts?: number;
  notifiedVolunteers?: number;
}): string {
  const shifts = result.cancelledShifts ?? 0;
  const people = result.notifiedVolunteers ?? 0;
  if (shifts === 0) return "Nothing was rostered.";
  const cancelled = `${shifts} ${shifts === 1 ? "shift" : "shifts"} cancelled`;
  if (people === 0) return `${cancelled}.`;
  return `${cancelled}, ${people} ${people === 1 ? "volunteer" : "volunteers"} told.`;
}

interface CloseDayDialogProps {
  /** The day to close, or null when the dialog is shut. */
  date: DateOnly | null;
  /** A public holiday's name, so the usual case is one click. */
  defaultReason: string;
  onClose: () => void;
  onClosed: () => void;
}

/**
 * Closing the kitchen for a day. Shows exactly what will be cancelled and who
 * will be told before anything happens - closing is not undoable for the
 * one-off shifts it removes.
 */
export function CloseDayDialog({
  date,
  defaultReason,
  onClose,
  onClosed,
}: CloseDayDialogProps) {
  const [reason, setReason] = useState(defaultReason);
  const [impact, setImpact] = useState<{ date: DateOnly; value: ClosureImpact | null } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Reset the reason each time a new day is opened.
  const [openedFor, setOpenedFor] = useState<DateOnly | null>(null);
  if (date !== openedFor) {
    setOpenedFor(date);
    setReason(defaultReason);
  }

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getClosureImpact(date).then((value) => {
      if (!cancelled) setImpact({ date, value });
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const current = impact?.date === date ? impact.value : undefined;
  const loading = current === undefined;
  const everyone = current?.shifts.flatMap((shift) => shift.signedUp) ?? [];
  const people = new Set(
    everyone.filter((person) => !person.isOffline).map((person) => person.name)
  ).size;
  const toRing = everyone.filter((person) => person.isOffline);
  const trimmed = reason.trim();

  function handleConfirm() {
    if (!date || !trimmed) return;
    startTransition(async () => {
      const result = await closeDays([{ date, reason: trimmed }]);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Kitchen closed on ${formatDateOnly(parseDateOnly(date), LONG_DAY)}. ${describeClosureOutcome(result)}`
      );
      onClosed();
    });
  }

  return (
    <AlertDialog
      open={date !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-xl tracking-tight">
            Close the kitchen on{" "}
            {date ? formatDateOnly(parseDateOnly(date), LONG_DAY) : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Nothing can be rostered that day, and repeating shifts skip it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="closure-reason">Why it&apos;s closed</Label>
          <Input
            id="closure-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={CLOSURE_REASON_MAX}
            placeholder="Labour Day"
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Volunteers who were rostered see this in their notification.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : current === null ? (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t check that day. Refresh and try again.
          </p>
        ) : current.blocker ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-warning-tint px-4 py-3 text-sm text-warning-tint-foreground"
          >
            <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden />
            {current.blocker}
          </p>
        ) : current.shifts.length === 0 ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            Nothing is rostered that day yet.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {current.shifts.length === 1
                ? "This shift will be cancelled"
                : `These ${current.shifts.length} shifts will be cancelled`}
              {people > 0
                ? `, and ${people} ${people === 1 ? "volunteer" : "volunteers"} told in the app`
                : ""}
              :
            </p>
            <ul className="divide-y divide-border rounded-lg ring-1 ring-border">
              {current.shifts.map((shift) => (
                <li key={shift.id} className="px-3 py-2 text-sm">
                  <p className="font-semibold">
                    {shift.serviceAreaName}{" "}
                    <span className="font-normal text-muted-foreground tnum">
                      {formatTimeRange(shift.startTime, shift.endTime)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shift.signedUp.length > 0
                      ? shift.signedUp.map((person) => person.name).join(", ")
                      : "No one signed up"}
                  </p>
                </li>
              ))}
            </ul>
            {toRing.length > 0 && (
              <div className="rounded-lg bg-warning-tint px-3 py-2 text-sm text-warning-tint-foreground">
                <p className="font-semibold">
                  Give {toRing.length === 1 ? "them" : "these people"} a ring -
                  they don&apos;t use the app:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {toRing.map((person) => (
                    <li key={person.name}>
                      {person.name}
                      {person.phone ? (
                        <>
                          {", "}
                          <a href={`tel:${person.phone}`} className="font-semibold underline-offset-2 hover:underline tnum">
                            {person.phone}
                          </a>
                        </>
                      ) : (
                        ", no phone on file"
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep it open</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || loading || !current || Boolean(current.blocker) || !trimmed}
          >
            {isPending && <RiLoader4Line className="size-4 animate-spin" />}
            Close the kitchen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
