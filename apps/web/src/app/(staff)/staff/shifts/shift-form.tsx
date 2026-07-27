"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createShiftSeries,
  updateShift,
  type ShiftFormData,
  type VolunteerOption,
} from "@/lib/shift-actions";
import {
  expandRecurrence,
  summariseSeriesResult,
  WEEKDAYS,
} from "@/lib/shift-series";
import {
  formatDateOnly,
  parseDateOnly,
  toDateOnly,
  todayInAppZone,
  toPickerDate,
} from "@/lib/date-only";
import type { OfferStatus } from "@/lib/shift-offers";
import { VolunteerOfferPicker } from "./volunteer-offer-picker";

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
    .map((date) =>
      formatDateOnly(parseDateOnly(date), {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    )
    .join(", ");

  const rest = dates.length - PREVIEW_DATE_LIMIT;
  return rest > 0 ? `${shown} and ${rest} more` : shown;
}

export function ShiftForm({ serviceAreas, volunteers, shift }: ShiftFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(shift);

  const [serviceAreaId, setServiceAreaId] = useState(shift?.serviceAreaId ?? "");
  const [date, setDate] = useState<Date | undefined>(
    shift ? toPickerDate(shift.date) : undefined
  );
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

  // Repeat is a create-only affordance: editing one shift of a series edits
  // that shift, and re-expanding a pattern over existing rows is a different
  // (and much more surprising) operation.
  const [repeats, setRepeats] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [interval, setInterval] = useState("1");
  const [repeatUntil, setRepeatUntil] = useState<Date | undefined>(undefined);

  /**
   * The days the current pattern would create, recomputed as the form changes
   * so the count under the picker is always what the action will do.
   */
  const preview =
    repeats && date && repeatUntil
      ? expandRecurrence({
          startDate: toDateOnly(date),
          endDate: toDateOnly(repeatUntil),
          weekdays,
          interval: parseInt(interval, 10) || 1,
        })
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
    // A series carries no offers, so clear any that were picked rather than
    // silently dropping them at submit.
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
      newErrors.capacity = `${shift.signupCount} already signed up — capacity can't go below that.`;
    }
    if (offeredIds.length > 0 && !offersCloseOn) {
      newErrors.offersCloseOn = "Choose the day the offer is held until.";
    }
    if (offersCloseOn && date && offersCloseOn > date) {
      newErrors.offersCloseOn = "The offer must close on or before the shift.";
    }
    if (repeats) {
      if (!repeatUntil) {
        newErrors.repeatUntil = "Choose the day the repeat stops.";
      } else if (date && repeatUntil < date) {
        newErrors.repeatUntil = "The last date must be on or after the first.";
      } else if (preview && !preview.ok) {
        newErrors.repeatUntil = preview.error;
      }
      if (weekdays.length === 0) {
        newErrors.weekdays = "Pick at least one day of the week.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    if (repeats && !isEdit) {
      startTransition(async () => {
        const result = await createShiftSeries({
          serviceAreaId,
          startTime,
          endTime,
          capacity: parseInt(capacity, 10),
          notes: notes.trim() || undefined,
          recurrence: {
            startDate: toDateOnly(date!),
            endDate: toDateOnly(repeatUntil!),
            weekdays,
            interval: parseInt(interval, 10) || 1,
          },
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(
          summariseSeriesResult(result.created ?? 0, result.skipped?.length ?? 0)
        );
        router.push("/staff/shifts");
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
      <CardContent className="space-y-6">
        <section className="space-y-5">
          <h2 className="font-serif text-lg font-medium tracking-tight">
            When and where
          </h2>

          {/* Service area */}
          <div className="space-y-2">
            <Label htmlFor="serviceArea">Service area</Label>
            <Select value={serviceAreaId} onValueChange={setServiceAreaId}>
              <SelectTrigger id="serviceArea">
                <SelectValue placeholder="Select a service area" />
              </SelectTrigger>
              <SelectContent>
                {serviceAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceAreaId && (
              <p className="text-sm text-destructive">{errors.serviceAreaId}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="shiftDate">Date</Label>
            <DatePicker
              id="shiftDate"
              value={date}
              onChange={setDate}
              placeholder="Select a date"
              fromDate={earliestDate}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime}</p>
              )}
            </div>
          </div>
        </section>

        {!isEdit && (
          <section className="space-y-5 border-t border-border pt-5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="repeats"
                checked={repeats}
                onCheckedChange={(checked) =>
                  handleRepeatsChange(checked === true)
                }
                disabled={isPending}
              />
              <div className="space-y-1">
                <Label htmlFor="repeats" className="font-serif text-lg tracking-tight">
                  Repeat this shift
                </Label>
                <p className="text-sm text-muted-foreground">
                  Roster a run of the same shift in one go — a month of
                  breakfasts, say.
                </p>
              </div>
            </div>

            {repeats && (
              <div className="space-y-5 border-l-2 border-border pl-4">
                <div className="space-y-2">
                  <Label>On these days</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWeekday(day.value)}
                          disabled={isPending}
                          aria-pressed={selected}
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
                  </div>
                  {errors.weekdays && (
                    <p className="text-sm text-destructive">{errors.weekdays}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="repeatInterval">How often</Label>
                    <Select
                      value={interval}
                      onValueChange={setInterval}
                      disabled={isPending}
                    >
                      <SelectTrigger id="repeatInterval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Every week</SelectItem>
                        <SelectItem value="2">Every 2 weeks</SelectItem>
                        <SelectItem value="3">Every 3 weeks</SelectItem>
                        <SelectItem value="4">Every 4 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repeatUntil">Until</Label>
                    <DatePicker
                      id="repeatUntil"
                      value={repeatUntil}
                      onChange={setRepeatUntil}
                      placeholder="Last date"
                      fromDate={date ?? earliestDate}
                    />
                  </div>
                </div>

                {errors.repeatUntil ? (
                  <p className="text-sm text-destructive">
                    {errors.repeatUntil}
                  </p>
                ) : preview?.ok ? (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-semibold">
                      {preview.dates.length}{" "}
                      {preview.dates.length === 1 ? "shift" : "shifts"} will be
                      created
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPreviewDates(preview.dates)}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Days that already have this shift are skipped.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        )}

        <section className="space-y-5 border-t border-border pt-5">
          <h2 className="font-serif text-lg font-medium tracking-tight">
            Capacity and notes
          </h2>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="50"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-24"
            />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum number of volunteers for this shift
              {shift && shift.signupCount > 0
                ? ` — ${shift.signupCount} signed up so far`
                : ""}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details volunteers should know..."
              rows={3}
            />
          </div>
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
              take it until the day you choose — then it opens to everyone.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Offer first to</Label>
            <VolunteerOfferPicker
              volunteers={volunteers}
              selectedIds={offeredIds}
              onChange={handleOfferedChange}
              statuses={offerStatuses}
              disabled={isPending}
            />
          </div>

          {offeredIds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="offersCloseOn">Held for them until</Label>
              <DatePicker
                id="offersCloseOn"
                value={offersCloseOn}
                onChange={setOffersCloseOn}
                placeholder="Select the last day"
                fromDate={today}
                toDate={date}
              />
              {errors.offersCloseOn ? (
                <p className="text-sm text-destructive">
                  {errors.offersCloseOn}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Opens to all volunteers the day after — or sooner, once
                  everyone offered has answered.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex gap-3 border-t border-border pt-5">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <RiLoader4Line className="size-4 animate-spin" />}
            {isEdit
              ? "Save changes"
              : repeats && preview?.ok
                ? `Create ${preview.dates.length} ${preview.dates.length === 1 ? "shift" : "shifts"}`
                : "Create shift"}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(shift ? `/staff/shifts/${shift.id}` : "/staff/shifts")
            }
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
