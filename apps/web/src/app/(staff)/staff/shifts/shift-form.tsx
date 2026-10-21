"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldControl,
  FieldControlGroup,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/date-picker";
import { RiLoader4Line } from "@remixicon/react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  createShift,
  updateShift,
  type ShiftFormData,
  type VolunteerOption,
} from "@/lib/shift-actions";
import { createShiftPattern } from "@/lib/shift-pattern-actions";
import {
  patternDatesBetween,
  PATTERN_HORIZON_DAYS,
  WEEKDAYS_FROM_MONDAY,
} from "@/lib/shift-patterns";
import {
  addDaysToDateOnly,
  formatDateOnly,
  isDateOnly,
  parseDateOnly,
  toDateOnly,
  todayInAppZone,
  toPickerDate,
} from "@/lib/date-only";
import type { OfferStatus } from "@/lib/shift-offers";
import { VolunteerPicker } from "./volunteer-picker";

/** The shift being edited, already flattened for the form. */
export type ShiftFormValues = {
  id: string;
  serviceAreaId: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string | null;
  offersCloseOn: Date | null;
  offers: { volunteerId: string; status: OfferStatus }[];
  signupCount: number;
};

interface ShiftFormProps {
  serviceAreas: { id: string; name: string }[];
  volunteers: VolunteerOption[];
  /** Present when editing an existing shift. */
  shift?: ShiftFormValues;
  /** A day to start a new shift on, e.g. from the calendar. */
  initialDate?: string;
}

/**
 * Today as the picker wants it, but on the kitchen's calendar rather than
 * this device's. The server validates the same bounds against
 * `todayInAppZone()`, so a coordinator working from another timezone must
 * not be offered a hold date the server will then refuse.
 */
function startOfToday(): Date {
  return toPickerDate(parseDateOnly(todayInAppZone()));
}

function addDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

/** How long before a shift its regulars get first refusal, by default. */
const DEFAULT_HOLD_LEAD_DAYS = 3;

/** How many dates the repeat preview names before trailing off into a count. */
const PREVIEW_DATE_LIMIT = 4;

/** "Mon 3 Aug, Mon 10 Aug, Mon 17 Aug and 2 more" */
function formatPreviewDates(dates: string[]): string {
  const shown = dates
    .slice(0, PREVIEW_DATE_LIMIT)
    // "Thu 15 Oct" - en-NZ would put a comma after the weekday, which reads
    // as a list separator in a list of dates.
    .map((date) => {
      const day = parseDateOnly(date);
      return `${formatDateOnly(day, { weekday: "short" })} ${formatDateOnly(day, { day: "numeric", month: "short" })}`;
    })
    .join(", ");

  const rest = dates.length - PREVIEW_DATE_LIMIT;
  return rest > 0 ? `${shown} and ${rest} more` : shown;
}

export function ShiftForm({
  serviceAreas,
  volunteers,
  shift,
  initialDate,
}: ShiftFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(shift);

  const [serviceAreaId, setServiceAreaId] = useState(shift?.serviceAreaId ?? "");
  const [date, setDate] = useState<Date | undefined>(() => {
    if (shift) return toPickerDate(shift.date);
    // A day handed over from the calendar, as long as it's still to come.
    if (initialDate && isDateOnly(initialDate) && initialDate >= todayInAppZone()) {
      return toPickerDate(parseDateOnly(initialDate));
    }
    return undefined;
  });
  const [startTime, setStartTime] = useState(shift?.startTime ?? "");
  const [endTime, setEndTime] = useState(shift?.endTime ?? "");
  const [capacity, setCapacity] = useState(String(shift?.capacity ?? 6));
  const [notes, setNotes] = useState(shift?.notes ?? "");
  const [offeredIds, setOfferedIds] = useState<string[]>(
    shift?.offers.map((offer) => offer.volunteerId) ?? []
  );
  const [offersCloseOn, setOffersCloseOn] = useState<Date | undefined>(
    shift?.offersCloseOn ? toPickerDate(shift.offersCloseOn) : undefined
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Repeat is a create-only affordance: editing one shift of a repeating
  // shift edits that day, and the repeating shift itself is managed from its
  // own page (Shifts → Repeating).
  const [repeats, setRepeats] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [interval, setInterval] = useState("1");
  const [repeatEnd, setRepeatEnd] = useState<"never" | "on">("never");
  const [repeatUntil, setRepeatUntil] = useState<Date | undefined>(undefined);
  const [regularIds, setRegularIds] = useState<string[]>([]);

  /**
   * The days the first top-up will put on the roster, recomputed as the form
   * changes so the preview is always what the action will do. Closed days are
   * skipped by the server, which the copy under the preview says.
   */
  const horizonEnd = addDaysToDateOnly(todayInAppZone(), PATTERN_HORIZON_DAYS);
  const startsOn = date ? toDateOnly(date) : null;
  const endsOn = repeatEnd === "on" && repeatUntil ? toDateOnly(repeatUntil) : null;
  const rollsOn = repeatEnd === "never" || (endsOn !== null && endsOn > horizonEnd);
  const preview =
    repeats && startsOn && weekdays.length > 0 && (repeatEnd === "never" || endsOn)
      ? patternDatesBetween(
          { weekdays, interval: parseInt(interval, 10) || 1, startsOn, endsOn },
          startsOn,
          endsOn && endsOn < horizonEnd ? endsOn : horizonEnd
        )
      : null;

  /** Ticking the first weekday defaults the pattern to the shift's own day. */
  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  }

  function handleRepeatsChange(next: boolean) {
    setRepeats(next);
    if (!next) return;

    // Default the pattern to the day the shift itself falls on.
    if (weekdays.length === 0 && date) {
      setWeekdays([parseDateOnly(toDateOnly(date)).getUTCDay()]);
    }
    // A repeating shift has regulars rather than first refusal, so clear any
    // offers that were picked rather than silently dropping them at submit.
    setOfferedIds([]);
    setOffersCloseOn(undefined);
  }

  const offerStatuses = Object.fromEntries(
    (shift?.offers ?? []).map((offer) => [offer.volunteerId, offer.status])
  );

  const today = startOfToday();
  // A shift already in the past stays editable — you can still fix its time.
  const earliestDate =
    shift && toPickerDate(shift.date) < today
      ? toPickerDate(shift.date)
      : isEdit
        ? today
        : addDays(today, 1);

  /** Naming the first volunteer sets a sensible hold date if none is chosen. */
  function handleOfferedChange(ids: string[]) {
    setOfferedIds(ids);
    if (ids.length > 0 && !offersCloseOn && date) {
      const lead = addDays(date, -DEFAULT_HOLD_LEAD_DAYS);
      setOffersCloseOn(lead < today ? date : lead);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!serviceAreaId) newErrors.serviceAreaId = "Please select a service area.";
    if (!date) newErrors.date = "Please select a date.";
    if (!startTime) newErrors.startTime = "Start time is required.";
    if (!endTime) newErrors.endTime = "End time is required.";
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = "End time must be after start time.";
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      newErrors.capacity = "Capacity must be at least 1.";
    } else if (shift && cap < shift.signupCount) {
      newErrors.capacity = `${shift.signupCount} already signed up - capacity can't go below that.`;
    }
    if (offeredIds.length > 0 && !offersCloseOn) {
      newErrors.offersCloseOn = "Choose the day the offer is held until.";
    }
    if (offersCloseOn && date && offersCloseOn > date) {
      newErrors.offersCloseOn = "The offer must close on or before the shift.";
    }
    if (repeats) {
      if (weekdays.length === 0) {
        newErrors.weekdays = "Pick at least one day of the week.";
      }
      if (repeatEnd === "on") {
        if (!repeatUntil) {
          newErrors.repeatUntil = "Choose the last day.";
        } else if (date && repeatUntil < date) {
          newErrors.repeatUntil = "The last day must be on or after the first.";
        }
      }
      if (!isNaN(cap) && regularIds.length > cap) {
        newErrors.regulars = "There are more regulars than places - raise the capacity.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    if (repeats && !isEdit) {
      startTransition(async () => {
        const result = await createShiftPattern({
          serviceAreaId,
          weekdays,
          interval: parseInt(interval, 10) || 1,
          startTime,
          endTime,
          capacity: parseInt(capacity, 10),
          notes: notes.trim() || undefined,
          startsOn: toDateOnly(date!),
          endsOn: repeatEnd === "on" ? toDateOnly(repeatUntil!) : null,
          regularIds,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        const placed = result.placed ?? 0;
        toast.success(
          `Repeating shift set up. ${placed} ${placed === 1 ? "shift is" : "shifts are"} on the roster so far.`
        );
        router.push(`/staff/shifts/repeating/${result.id}`);
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      const data: ShiftFormData = {
        serviceAreaId,
        date: toDateOnly(date!),
        startTime,
        endTime,
        capacity: parseInt(capacity, 10),
        notes: notes.trim() || undefined,
        offeredVolunteerIds: offeredIds,
        offersCloseOn:
          offeredIds.length > 0 && offersCloseOn
            ? toDateOnly(offersCloseOn)
            : null,
      };

      const result = shift
        ? await updateShift(shift.id, data)
        : await createShift(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Shift updated." : "Shift created successfully.");
      router.push(shift ? `/staff/shifts/${shift.id}` : "/staff/shifts");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <section className="space-y-5">
            <h2 className="font-serif text-lg font-medium tracking-tight">
              When and where
            </h2>

            {/* Service area */}
            <Field id="serviceArea" error={errors.serviceAreaId}>
              <FieldLabel>Service area</FieldLabel>
              <Select value={serviceAreaId} onValueChange={setServiceAreaId}>
                <FieldControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service area" />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  {serviceAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError />
            </Field>

            {/* Date */}
            <Field id="shiftDate" error={errors.date}>
              <FieldLabel>{repeats ? "First day" : "Date"}</FieldLabel>
              <FieldControl>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Select a date"
                  fromDate={earliestDate}
                />
              </FieldControl>
              <FieldError />
            </Field>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <Field id="startTime" error={errors.startTime}>
                <FieldLabel>Start time</FieldLabel>
                <FieldControl>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </FieldControl>
                <FieldError />
              </Field>
              <Field id="endTime" error={errors.endTime}>
                <FieldLabel>End time</FieldLabel>
                <FieldControl>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </FieldControl>
                <FieldError />
              </Field>
            </div>
          </section>

          {!isEdit && (
            <section className="space-y-5 border-t border-border pt-5">
              <Field id="repeats" className="flex items-start gap-3 space-y-0">
                <FieldControl>
                  <Checkbox
                    checked={repeats}
                    onCheckedChange={(checked) =>
                      handleRepeatsChange(checked === true)
                    }
                    disabled={isPending}
                  />
                </FieldControl>
                <div className="space-y-1">
                  <FieldLabel className="font-serif text-lg tracking-tight">
                    Repeat this shift
                  </FieldLabel>
                  <FieldDescription className="text-sm">
                    Breakfast every Monday, say - for a season, or for as long
                    as it runs.
                  </FieldDescription>
                </div>
              </Field>

              {repeats && (
                <div className="space-y-5 border-l-2 border-border pl-4">
                  <Field error={errors.weekdays}>
                    <FieldLabel>On these days</FieldLabel>
                    <FieldControlGroup className="flex flex-wrap gap-2">
                      {WEEKDAYS_FROM_MONDAY.map((day) => {
                        const selected = weekdays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekday(day.value)}
                            disabled={isPending}
                            aria-pressed={selected}
                            aria-label={day.label}
                            className={cn(
                              "min-w-12 rounded-md px-3 py-1.5 text-sm font-semibold ring-1 transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground ring-primary"
                                : "bg-card text-muted-foreground ring-border hover:text-foreground"
                            )}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </FieldControlGroup>
                    <FieldError />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="repeatInterval">
                      <FieldLabel>How often</FieldLabel>
                      <Select
                        value={interval}
                        onValueChange={setInterval}
                        disabled={isPending}
                      >
                        <FieldControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FieldControl>
                        <SelectContent>
                          <SelectItem value="1">Every week</SelectItem>
                          <SelectItem value="2">Every 2 weeks</SelectItem>
                          <SelectItem value="3">Every 3 weeks</SelectItem>
                          <SelectItem value="4">Every 4 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="repeatEnd">
                      <FieldLabel>Ends</FieldLabel>
                      <Select
                        value={repeatEnd}
                        onValueChange={(value) => setRepeatEnd(value as "never" | "on")}
                        disabled={isPending}
                      >
                        <FieldControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FieldControl>
                        <SelectContent>
                          <SelectItem value="never">Keeps going</SelectItem>
                          <SelectItem value="on">On a set day</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {repeatEnd === "on" && (
                    <Field id="repeatUntil" error={errors.repeatUntil}>
                      <FieldLabel>Last day</FieldLabel>
                      <FieldControl>
                        <DatePicker
                          value={repeatUntil}
                          onChange={setRepeatUntil}
                          placeholder="Select the last day"
                          fromDate={date ?? earliestDate}
                        />
                      </FieldControl>
                      <FieldError />
                    </Field>
                  )}

                  <Field error={errors.regulars}>
                    <FieldLabel>Regulars (optional)</FieldLabel>
                    <FieldDescription className="text-sm">
                      The whānau who always work this shift. They&apos;re put on
                      every one automatically, and can still cancel a week they
                      can&apos;t make.
                    </FieldDescription>
                    <FieldControlGroup>
                      <VolunteerPicker
                        volunteers={volunteers}
                        selectedIds={regularIds}
                        onChange={setRegularIds}
                        disabled={isPending}
                      />
                    </FieldControlGroup>
                    <FieldError />
                  </Field>

                  {preview && (
                    <div className="rounded-lg bg-muted p-3">
                      {preview.length === 0 ? (
                        <p className="text-sm font-semibold">
                          No days match yet. Check the days of the week and the
                          dates.
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">
                            {rollsOn
                              ? `The first ${preview.length} ${preview.length === 1 ? "shift goes" : "shifts go"} on the roster now`
                              : `${preview.length} ${preview.length === 1 ? "shift" : "shifts"} will go on the roster`}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatPreviewDates(preview)}
                          </p>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {rollsOn
                              ? "More are added by themselves as the weeks go by, always twelve weeks ahead. "
                              : ""}
                            Days the kitchen is closed are skipped, and a
                            matching shift already rostered is kept rather than
                            doubled.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="space-y-5 border-t border-border pt-5">
            <h2 className="font-serif text-lg font-medium tracking-tight">
              Capacity and notes
            </h2>

            {/* Capacity */}
            <Field id="capacity" error={errors.capacity}>
              <FieldLabel>Capacity</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-24"
                />
              </FieldControl>
              <FieldError />
              <FieldDescription>
                Maximum number of volunteers for this shift
                {shift && shift.signupCount > 0
                  ? ` - ${shift.signupCount} signed up so far`
                  : ""}
              </FieldDescription>
            </Field>

            {/* Notes */}
            <Field id="notes">
              <FieldLabel>Notes (optional)</FieldLabel>
              <FieldControl>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details volunteers should know..."
                  rows={3}
                />
              </FieldControl>
            </Field>
          </section>

          {/* Holding a shift for named regulars is a per-shift call, so it isn't
              offered while creating a whole series. */}
          <section
            className={cn(
              "space-y-5 border-t border-border pt-5",
              repeats && "hidden"
            )}
          >
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-medium tracking-tight">
                First refusal (optional)
              </h2>
              <p className="text-sm text-muted-foreground">
                Hold this shift for the whānau who usually work it. Only they can
                take it until the day you choose - then it opens to everyone.
              </p>
            </div>

            <Field>
              <FieldLabel>Offer first to</FieldLabel>
              <FieldControlGroup>
                <VolunteerPicker
                  volunteers={volunteers}
                  selectedIds={offeredIds}
                  onChange={handleOfferedChange}
                  statuses={offerStatuses}
                  disabled={isPending}
                />
              </FieldControlGroup>
            </Field>

            {offeredIds.length > 0 && (
              <Field id="offersCloseOn" error={errors.offersCloseOn}>
                <FieldLabel>Held for them until</FieldLabel>
                <FieldControl>
                  <DatePicker
                    value={offersCloseOn}
                    onChange={setOffersCloseOn}
                    placeholder="Select the last day"
                    fromDate={today}
                    toDate={date}
                  />
                </FieldControl>
                <FieldError />
                {!errors.offersCloseOn && (
                  <FieldDescription>
                    Opens to all volunteers the day after - or sooner, once
                    everyone offered has answered.
                  </FieldDescription>
                )}
              </Field>
            )}
          </section>

          {/* Submit */}
          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={isPending}>
              {isPending && <RiLoader4Line className="size-4 animate-spin" />}
              {isEdit
                ? "Save changes"
                : repeats
                  ? "Set up repeating shift"
                  : "Create shift"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(shift ? `/staff/shifts/${shift.id}` : "/staff/shifts")
              }
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
