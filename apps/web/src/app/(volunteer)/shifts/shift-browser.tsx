"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  RiTimeLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiLockLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/brand/eyebrow";
import { CapacityMeter } from "@/components/brand/capacity-meter";
import { Illustration } from "@/components/brand/illustration";
import {
  signUpForShift,
  cancelShiftSignup,
  getAvailableShifts,
  respondToShiftOffer,
  type ShiftWithDetails,
  type ShiftFilters,
} from "@/lib/shift-actions";
import { formatTimeRange } from "@/lib/format";
import {
  addDaysToDateOnly,
  dateOnlyOf,
  formatDateOnly,
  parseDateOnly,
  todayInAppZone,
} from "@/lib/date-only";
import { formatHoldUntil } from "@/lib/shift-offers";

interface ShiftBrowserProps {
  initialShifts: ShiftWithDetails[];
  serviceAreas: { id: string; name: string }[];
  canSignUp: boolean;
}

function groupShiftsByDate(
  shifts: ShiftWithDetails[]
): Map<string, ShiftWithDetails[]> {
  const map = new Map<string, ShiftWithDetails[]>();
  for (const shift of shifts) {
    const key = dateOnlyOf(shift.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(shift);
  }
  return map;
}

/** Red overline above the day heading: "Today", "Tomorrow", or the weekday. */
function dayOverline(dateStr: string): string {
  const today = todayInAppZone();
  if (dateStr === today) return "Today";
  if (dateStr === addDaysToDateOnly(today, 1)) return "Tomorrow";
  return formatDateOnly(parseDateOnly(dateStr), { weekday: "long" });
}

/** Serif day heading: "23 July". */
function dayHeading(dateStr: string): string {
  return formatDateOnly(parseDateOnly(dateStr), {
    day: "numeric",
    month: "long",
  });
}

export function ShiftBrowser({
  initialShifts,
  serviceAreas,
  canSignUp,
}: ShiftBrowserProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [serviceAreaFilter, setServiceAreaFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [loadingShiftId, setLoadingShiftId] = useState<string | null>(null);

  function handleFilterChange(areaId: string) {
    setServiceAreaFilter(areaId);
    startTransition(async () => {
      const filters: ShiftFilters = {};
      if (areaId !== "all") filters.serviceAreaId = areaId;
      const result = await getAvailableShifts(filters);
      setShifts(result);
    });
  }

  function refresh() {
    startTransition(async () => {
      const filters: ShiftFilters = {};
      if (serviceAreaFilter !== "all") filters.serviceAreaId = serviceAreaFilter;
      const refreshed = await getAvailableShifts(filters);
      setShifts(refreshed);
    });
  }

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

  const grouped = groupShiftsByDate(shifts);

  const filterOptions = [
    { id: "all", name: "All areas" },
    ...serviceAreas,
  ];

  return (
    <div className="space-y-8">
      {/* Service-area filter pills */}
      <div
        role="group"
        aria-label="Filter by service area"
        className="flex flex-wrap items-center gap-2"
      >
        {filterOptions.map((area) => {
          const selected = serviceAreaFilter === area.id;
          return (
            <button
              key={area.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleFilterChange(area.id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-md px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
              )}
            >
              {area.name}
            </button>
          );
        })}
        {isPending && (
          <RiLoader4Line
            aria-hidden
            className="size-4 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {/* Shift list grouped by date */}
      {grouped.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Illustration name="cafe" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No shifts open right now
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back soon, e hoa. New mahi is added regularly.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([dateKey, dateShifts]) => (
          <section key={dateKey} className="space-y-3">
            <div className="space-y-0.5">
              <Eyebrow>{dayOverline(dateKey)}</Eyebrow>
              <h2 className="font-serif text-xl font-medium tracking-tight">
                {dayHeading(dateKey)}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dateShifts.map((shift) => {
                const spotsLeft = shift.capacity - shift.signupCount;
                const isFull = spotsLeft <= 0;
                const isSignedUp = shift.userSignupStatus === "SIGNED_UP";
                const isLoading = loadingShiftId === shift.id;
                // Held for its regulars: theirs to take, everyone else waits.
                const offeredToMe =
                  shift.heldForOffers && shift.userOfferStatus === "PENDING";
                const heldForOthers = shift.heldForOffers && !offeredToMe;

                return (
                  <Card key={shift.id}>
                    {(isSignedUp || offeredToMe) && (
                      // The red mission rail marks the volunteer's own commitment
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1 bg-primary"
                      />
                    )}
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-serif text-lg/snug font-medium tracking-tight">
                            {shift.serviceArea.name}
                          </h3>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <RiTimeLine
                              className="size-3.5 shrink-0"
                              aria-hidden
                            />
                            <span className="tabular-nums">
                              {formatTimeRange(shift.startTime, shift.endTime)}
                            </span>
                          </p>
                        </div>
                        {isSignedUp ? (
                          <Badge className="shrink-0">Signed up</Badge>
                        ) : offeredToMe ? (
                          <Badge variant="warning" className="shrink-0">
                            Yours first
                          </Badge>
                        ) : heldForOthers ? (
                          <Badge variant="neutral" className="shrink-0 gap-1">
                            <RiLockLine aria-hidden className="size-3" />
                            Held
                          </Badge>
                        ) : null}
                      </div>

                      {shift.notes && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {shift.notes}
                        </p>
                      )}

                      {offeredToMe && shift.offersCloseOn && (
                        <p className="rounded-md bg-warning-tint px-3 py-2 text-sm text-warning-tint-foreground">
                          Held for you until{" "}
                          {formatHoldUntil(shift.offersCloseOn)}. Let us know
                          either way and we&apos;ll offer it on if you can&apos;t
                          make it.
                        </p>
                      )}

                      {heldForOthers && shift.offersCloseOn && (
                        <p className="text-sm text-muted-foreground">
                          Offered to the regular crew until{" "}
                          {formatHoldUntil(shift.offersCloseOn)} — open to
                          everyone after that.
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <CapacityMeter
                            filled={shift.signupCount}
                            capacity={shift.capacity}
                          />
                          {isSignedUp ? (
                            <span className="text-xs font-semibold text-success">
                              You&apos;re in
                            </span>
                          ) : isFull ? (
                            <span className="text-xs text-muted-foreground">
                              Shift full
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "text-xs tabular-nums whitespace-nowrap",
                                spotsLeft <= 2
                                  ? "font-semibold text-primary"
                                  : "text-muted-foreground"
                              )}
                            >
                              {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"}{" "}
                              left
                            </span>
                          )}
                        </div>

                        {canSignUp && (
                          <div className="flex shrink-0 items-center gap-2">
                            {isSignedUp ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(shift.id)}
                                disabled={isLoading}
                              >
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
                                    onClick={() =>
                                      handleDeclineOffer(shift.id)
                                    }
                                    disabled={isLoading}
                                  >
                                    Not this time
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleSignUp(shift.id)}
                                  disabled={
                                    isFull || isLoading || heldForOthers
                                  }
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
