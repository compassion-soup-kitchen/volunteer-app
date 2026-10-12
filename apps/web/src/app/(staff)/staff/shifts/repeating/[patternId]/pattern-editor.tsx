"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiCalendarCheckLine,
  RiLoader4Line,
  RiStopCircleLine,
} from "@remixicon/react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { DetailList } from "@/components/brand/detail-list";
import type { VolunteerOption } from "@/lib/shift-actions";
import {
  stopShiftPattern,
  updateShiftPattern,
  type ShiftPatternSummary,
} from "@/lib/shift-pattern-actions";
import {
  describePatternSpan,
  describeRecurrence,
  isPatternRunning,
} from "@/lib/shift-patterns";
import {
  formatDateOnly,
  parseDateOnly,
  toDateOnly,
  todayInAppZone,
  toPickerDate,
} from "@/lib/date-only";
import { formatTimeRange, personName } from "@/lib/format";
import { VolunteerPicker } from "../../volunteer-picker";

const SHORT_DAY: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

function day(date: string): string {
  return formatDateOnly(parseDateOnly(date), SHORT_DAY);
}

interface PatternEditorProps {
  pattern: ShiftPatternSummary;
  volunteers: VolunteerOption[];
}

export function PatternEditor({ pattern, volunteers }: PatternEditorProps) {
  const router = useRouter();
  const today = todayInAppZone();
  const running = isPatternRunning(pattern, today);

  const [capacity, setCapacity] = useState(String(pattern.capacity));
  const [notes, setNotes] = useState(pattern.notes ?? "");
  const [ends, setEnds] = useState<"never" | "on">(pattern.endsOn ? "on" : "never");
  const [endsOn, setEndsOn] = useState<Date | undefined>(
    pattern.endsOn ? toPickerDate(parseDateOnly(pattern.endsOn)) : undefined
  );
  const [regularIds, setRegularIds] = useState(pattern.regulars.map((r) => r.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [confirmStop, setConfirmStop] = useState(false);

  // Regulars who are paused or archived aren't in the active-volunteer list,
  // but they're still on the pattern - keep them pickable so saving doesn't
  // quietly drop them.
  const options: VolunteerOption[] = [
    ...volunteers,
    ...pattern.regulars
      .filter((regular) => !volunteers.some((v) => v.id === regular.id))
      .map((regular) => ({
        id: regular.id,
        name: personName(regular),
        email: regular.email,
        phone: null,
        isOffline: regular.isOffline,
        groups: regular.groups,
      })),
  ];

  const earliestEnd = toPickerDate(
    parseDateOnly(pattern.startsOn > today ? pattern.startsOn : today)
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) next.capacity = "Capacity must be at least 1.";
    else if (cap > 50) next.capacity = "Capacity can't be more than 50.";
    else if (regularIds.length > cap) {
      next.capacity = "There are more regulars than places - raise the capacity.";
    }
    if (ends === "on" && !endsOn) next.endsOn = "Choose the last day.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await updateShiftPattern(pattern.id, {
        capacity: parseInt(capacity, 10),
        notes: notes.trim() || undefined,
        endsOn: ends === "on" && endsOn ? toDateOnly(endsOn) : null,
        regularIds,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const skipped = result.capacitySkipped ?? 0;
      toast.success(
        skipped > 0
          ? `Saved. ${skipped} ${skipped === 1 ? "day keeps its" : "days keep their"} own capacity - more people are already on ${skipped === 1 ? "it" : "them"}.`
          : "Saved, and carried onto the shifts already rostered."
      );
      router.refresh();
    });
  }

  function handleStop() {
    startTransition(async () => {
      const result = await stopShiftPattern(pattern.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const removed = result.removedShifts ?? 0;
      toast.success(
        removed > 0
          ? `Stopped. ${removed} upcoming ${removed === 1 ? "shift was" : "shifts were"} taken off the roster.`
          : "Stopped."
      );
      setConfirmStop(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-serif text-lg font-medium tracking-tight">
            How it runs
          </CardTitle>
          <CardAction>
            <Badge variant={running ? (pattern.endsOn ? "info" : "success") : "neutral"}>
              {describePatternSpan(pattern.endsOn, today)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5">
          <DetailList
            facts={[
              {
                label: "Repeats",
                value: describeRecurrence(pattern.weekdays, pattern.interval),
              },
              {
                label: "Time",
                value: formatTimeRange(pattern.startTime, pattern.endTime),
              },
              { label: "First day", value: day(pattern.startsOn) },
              {
                label: "On the roster",
                value:
                  pattern.upcomingShiftCount === 0
                    ? "Nothing upcoming"
                    : `${pattern.upcomingShiftCount} upcoming ${pattern.upcomingShiftCount === 1 ? "shift" : "shifts"}`,
              },
            ]}
          />

          <p className="text-xs text-muted-foreground">
            Shifts are added by themselves twelve weeks ahead. To change the
            day, time or service area, stop this one and set up a new one.
          </p>

          <div className="flex flex-col gap-2">
            {pattern.nextShift && (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/staff/shifts/${pattern.nextShift.id}`}>
                  <RiCalendarCheckLine />
                  Next shift, {formatDateOnly(parseDateOnly(pattern.nextShift.date), { weekday: "short", day: "numeric", month: "short" })}
                </Link>
              </Button>
            )}
            {running && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setConfirmStop(true)}
              >
                <RiStopCircleLine />
                Stop repeating
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-serif text-lg font-medium tracking-tight">
            Regulars and details
          </CardTitle>
          <CardDescription>
            Changes carry onto the shifts already rostered from today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <Label>Regulars</Label>
            <p className="text-sm text-muted-foreground">
              Put on every shift automatically. Someone added now joins the
              upcoming ones; someone taken off gives up their places.
            </p>
            <VolunteerPicker
              volunteers={options}
              selectedIds={regularIds}
              onChange={setRegularIds}
              disabled={isPending || !running}
            />
          </section>

          <section className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patternCapacity">Capacity</Label>
              <Input
                id="patternCapacity"
                type="number"
                min="1"
                max="50"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-24"
                disabled={isPending || !running}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive">{errors.capacity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patternEnds">Ends</Label>
              <Select
                value={ends}
                onValueChange={(value) => setEnds(value as "never" | "on")}
                disabled={isPending || !running}
              >
                <SelectTrigger id="patternEnds">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Keeps going</SelectItem>
                  <SelectItem value="on">On a set day</SelectItem>
                </SelectContent>
              </Select>
              {ends === "on" && (
                <DatePicker
                  id="patternEndsOn"
                  value={endsOn}
                  onChange={setEndsOn}
                  placeholder="Select the last day"
                  fromDate={earliestEnd}
                />
              )}
              {errors.endsOn && (
                <p className="text-sm text-destructive">{errors.endsOn}</p>
              )}
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <Label htmlFor="patternNotes">Notes (optional)</Label>
            <Textarea
              id="patternNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details volunteers should know..."
              rows={3}
              disabled={isPending || !running}
            />
          </section>

          {running && (
            <div className="border-t border-border pt-5">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending && <RiLoader4Line className="size-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmStop}
        onOpenChange={(open) => !isPending && setConfirmStop(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop {pattern.serviceArea.name} repeating?</AlertDialogTitle>
            <AlertDialogDescription>
              {pattern.upcomingShiftCount > 0
                ? "Today's shift still goes ahead. Every one after it comes off the roster, and anyone signed up is told."
                : "No more shifts will be added to the roster."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep it running</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleStop();
              }}
              disabled={isPending}
            >
              {isPending && <RiLoader4Line className="size-4 animate-spin" />}
              Stop repeating
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
