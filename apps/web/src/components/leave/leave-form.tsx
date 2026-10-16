"use client";

import { useEffect, useState, useTransition } from "react";
import { RiAlertLine, RiCalendarCheckLine, RiLoader4Line } from "@remixicon/react";
import { toast } from "sonner";

import { DatePicker } from "@/components/date-picker";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  previewLeaveChange,
  saveLeaveChange,
  type LeavePreview,
  type LeaveRecord,
} from "@/lib/leave-actions";
import {
  addDaysToDateOnly,
  formatDateOnly,
  parseDateOnly,
  toDateOnly,
  toPickerDate,
  type DateOnly,
} from "@/lib/date-only";
import { formatTimeRange } from "@/lib/format";
import {
  LEAVE_REASON_MAX,
  MAX_LEAVE_LEAD_DAYS,
  formatLeaveLength,
  leaveStage,
} from "@/lib/leave";

const pickerDate = (date: DateOnly) => toPickerDate(parseDateOnly(date));

interface LeaveFormProps {
  /**
   * Whose leave it reads as - "self" for your own, "staff" for someone else's.
   * Decides the wording, not the rules.
   */
  audience: "self" | "staff";
  today: DateOnly;
  /** The leave being changed, or nothing for new leave. */
  leave?: LeaveRecord | null;
  /**
   * Staff logging new leave name the person - themselves included. Null until
   * they've chosen, which holds the preview and the save back. Volunteers
   * logging their own leave leave it out.
   */
  userId?: string | null;
  /** Their first name, so staff read "Aroha comes off…". */
  personName?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

/**
 * Logging or changing a stretch of leave. Before anything is saved it shows
 * exactly which shifts they will come off - leave changes the roster, and
 * nobody should find that out afterwards.
 */
export function LeaveForm({
  audience,
  today,
  leave = null,
  userId = null,
  personName,
  onSaved,
  onCancel,
}: LeaveFormProps) {
  const [startsOn, setStartsOn] = useState<DateOnly | null>(leave?.startsOn ?? null);
  const [endsOn, setEndsOn] = useState<DateOnly | null>(leave?.endsOn ?? null);
  const [reason, setReason] = useState(leave?.reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; value: LeavePreview | { error: string } } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Under way: the first day already happened, so it stays put.
  const started = leave ? leaveStage(leave, today) === "current" : false;
  const needsPerson = audience === "staff" && !leave && !userId;
  const self = audience === "self";
  const who = self ? "you" : (personName ?? "This person");

  const ready = Boolean(startsOn && endsOn && !needsPerson);
  const key = `${userId}|${leave?.id}|${startsOn}|${endsOn}`;

  useEffect(() => {
    if (!startsOn || !endsOn || needsPerson) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      previewLeaveChange({ userId, leaveId: leave?.id, startsOn, endsOn })
        .then((value) => {
          if (!cancelled) setPreview({ key, value });
        })
        .catch(() => {
          if (!cancelled) setPreview({ key, value: { error: "We couldn't check the roster. Try again." } });
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, startsOn, endsOn, needsPerson, userId, leave?.id]);

  const current = preview?.key === key ? preview.value : null;
  const checking = ready && current === null;
  const blocker = current ? ("error" in current ? current.error : current.blocker) : null;

  function chooseStart(date: Date | undefined) {
    const day = date ? toDateOnly(date) : null;
    setStartsOn(day);
    setError(null);
    // A start after the end would leave an impossible range on screen.
    if (day && endsOn && endsOn < day) setEndsOn(day);
  }

  function chooseEnd(date: Date | undefined) {
    setEndsOn(date ? toDateOnly(date) : null);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!startsOn || !endsOn) {
      setError("Choose the first and last day away.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveLeaveChange({
        userId,
        leaveId: leave?.id,
        data: { startsOn, endsOn, reason },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(savedMessage({ isNew: !leave, self, ...result }));
      onSaved?.();
    });
  }

  // The earliest day the end can be: not before the start, and - for leave
  // under way - not before today, since coming back early is its own action.
  const endFloor = started ? today : (startsOn ?? today);
  const shifts = current && !("error" in current) ? current.shifts : [];
  const range = startsOn && endsOn && endsOn >= startsOn ? { startsOn, endsOn } : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={isPending}>
        <legend className="sr-only">Dates away</legend>
        <div className="space-y-2">
          <Label htmlFor="leave-starts">First day away</Label>
          <DatePicker
            id="leave-starts"
            value={startsOn ? pickerDate(startsOn) : undefined}
            onChange={chooseStart}
            placeholder="Choose a day"
            disabled={started || isPending}
            fromDate={leave ? undefined : pickerDate(addDaysToDateOnly(today, -30))}
            toDate={pickerDate(addDaysToDateOnly(today, MAX_LEAVE_LEAD_DAYS))}
          />
          {started && (
            <p className="text-xs text-muted-foreground">
              Already under way, so the first day stays as it is.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-ends">Last day away</Label>
          <DatePicker
            id="leave-ends"
            value={endsOn ? pickerDate(endsOn) : undefined}
            onChange={chooseEnd}
            placeholder="Choose a day"
            disabled={isPending}
            fromDate={pickerDate(endFloor)}
            toDate={pickerDate(addDaysToDateOnly(endFloor, 365))}
          />
          {range && (
            <p className="text-xs text-muted-foreground">
              {formatLeaveLength(range)} · back on{" "}
              {formatDateOnly(parseDateOnly(addDaysToDateOnly(range.endsOn, 1)), {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          )}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="leave-reason">
          Reason <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="leave-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={LEAVE_REASON_MAX}
          placeholder="Overseas, surgery, exams…"
          disabled={isPending}
          aria-describedby="leave-reason-help"
        />
        <p id="leave-reason-help" className="text-xs text-muted-foreground">
          {self
            ? "Only you and the kitchen team see this."
            : `Only ${personName ?? "they"} and the kitchen team see this.`}
        </p>
      </div>

      {/* What saving will do to the roster, before it happens. */}
      <div aria-live="polite">
        {needsPerson ? null : !ready ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            Choose the dates to see which shifts this affects.
          </p>
        ) : checking ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : blocker ? (
          <p className="flex items-start gap-2 rounded-lg bg-warning-tint px-4 py-3 text-sm text-warning-tint-foreground">
            <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden />
            {blocker}
          </p>
        ) : shifts.length === 0 ? (
          <p className="flex items-start gap-2 rounded-lg bg-success-tint px-4 py-3 text-sm text-success-tint-foreground">
            <RiCalendarCheckLine className="mt-0.5 size-4 shrink-0" aria-hidden />
            {leave
              ? "No more shifts come off the roster."
              : self
                ? "You're not on any shifts then - nothing to change on the roster."
                : `${who} isn't on any shifts then - nothing to change on the roster.`}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {self ? "You'll come off" : `${who} comes off`}{" "}
              {shifts.length === 1 ? "this shift" : `these ${shifts.length} shifts`}:
            </p>
            <ul className="divide-y divide-border rounded-lg ring-1 ring-border">
              {shifts.map((shift) => (
                <li key={shift.shiftId} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold">{shift.serviceAreaName}</span>
                    {shift.isRegular && (
                      <span className="text-xs text-muted-foreground"> · regular</span>
                    )}
                  </span>
                  <span className="tnum shrink-0 text-xs text-muted-foreground">
                    {formatDateOnly(parseDateOnly(shift.date), {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {", "}
                    {formatTimeRange(shift.startTime, shift.endTime)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {afterLeaveNote(shifts, self ? "You" : "They")}
            </p>
          </div>
        )}
      </div>

      {error && <FormAlert>{error}</FormAlert>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || !ready || checking || Boolean(blocker)}
        >
          {isPending && <RiLoader4Line className="size-4 animate-spin" aria-hidden />}
          {leave ? "Save changes" : "Log leave"}
        </Button>
      </div>
    </form>
  );
}

/** What happens to the shifts given up if plans change - regular seats come back, chosen ones don't. */
function afterLeaveNote(shifts: { isRegular: boolean }[], subject: "You" | "They"): string {
  const regular = shifts.some((shift) => shift.isRegular);
  const chosen = shifts.some((shift) => !shift.isRegular);
  const back = "Regular spots come back if the leave is shortened or cancelled.";
  if (regular && !chosen) return back;
  const again = `${subject} can sign up again${regular ? " for the others" : ""} if plans change and there's still room.`;
  return regular ? `${back} ${again}` : again;
}

/** "Leave logged. You're off 2 shifts." */
function savedMessage(input: {
  isNew: boolean;
  self: boolean;
  removedShifts?: number;
  restoredShifts?: number;
}): string {
  const lead = input.isNew ? "Leave logged." : "Leave updated.";
  const parts = [lead];
  const off = input.removedShifts ?? 0;
  const back = input.restoredShifts ?? 0;
  const subject = input.self ? "You're" : "They're";
  if (off > 0) parts.push(`${subject} off ${off} ${off === 1 ? "shift" : "shifts"}.`);
  if (back > 0) parts.push(`${subject} back on ${back} regular ${back === 1 ? "shift" : "shifts"}.`);
  return parts.join(" ");
}
