"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiCalendarLine,
  RiTimeLine,
  RiTeamLine,
  RiCheckLine,
  RiCloseLine,
  RiFilterLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  signUpForShift,
  cancelShiftSignup,
  getAvailableShifts,
  type ShiftWithDetails,
  type ShiftFilters,
} from "@/lib/shift-actions";

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
    const key = new Date(shift.date).toISOString().split("T")[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(shift);
  }
  return map;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === tomorrow.toISOString().split("T")[0];
}

function dateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Today";
  if (isTomorrow(dateStr)) return "Tomorrow";
  return formatDate(dateStr);
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

  async function handleSignUp(shiftId: string) {
    setLoadingShiftId(shiftId);
    const result = await signUpForShift(shiftId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Kia ora! You're signed up for this shift.");
      // Refresh shifts
      startTransition(async () => {
        const filters: ShiftFilters = {};
        if (serviceAreaFilter !== "all")
          filters.serviceAreaId = serviceAreaFilter;
        const refreshed = await getAvailableShifts(filters);
        setShifts(refreshed);
      });
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
      startTransition(async () => {
        const filters: ShiftFilters = {};
        if (serviceAreaFilter !== "all")
          filters.serviceAreaId = serviceAreaFilter;
        const refreshed = await getAvailableShifts(filters);
        setShifts(refreshed);
      });
    }
    setLoadingShiftId(null);
  }

  const grouped = groupShiftsByDate(shifts);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <RiFilterLine className="size-4 text-muted-foreground" />
        <Select value={serviceAreaFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[220px]">
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
        {isPending && (
          <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Shift list grouped by date */}
      {grouped.size === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiCalendarLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No upcoming shifts available
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Check back soon — new shifts are added regularly
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([dateKey, dateShifts]) => (
          <div key={dateKey} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <RiCalendarLine className="size-4 text-primary" />
              {dateLabel(dateKey)}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {dateShifts.map((shift) => {
                const spotsLeft = shift.capacity - shift.signupCount;
                const isFull = spotsLeft <= 0;
                const isSignedUp = shift.userSignupStatus === "SIGNED_UP";
                const isLoading = loadingShiftId === shift.id;

                return (
                  <Card
                    key={shift.id}
                    className={
                      isSignedUp
                        ? "border-primary/30 bg-primary/[0.03]"
                        : undefined
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">
                            {shift.serviceArea.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1.5 mt-1">
                            <RiTimeLine className="size-3.5" />
                            {shift.startTime}–{shift.endTime}
                          </CardDescription>
                        </div>
                        {isSignedUp && (
                          <Badge className="shrink-0">
                            <RiCheckLine className="mr-1 size-3" />
                            Signed up
                          </Badge>
                        )}
                        {isFull && !isSignedUp && (
                          <Badge variant="secondary" className="shrink-0">
                            Full
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {shift.notes && (
                        <p className="text-sm text-muted-foreground">
                          {shift.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <RiTeamLine className="size-3.5" />
                          <span>
                            {shift.signupCount}/{shift.capacity} spots filled
                          </span>
                          {!isFull && (
                            <span className="text-green-600 dark:text-green-400">
                              · {spotsLeft} left
                            </span>
                          )}
                        </div>

                        {canSignUp && (
                          <>
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
                              <Button
                                size="sm"
                                onClick={() => handleSignUp(shift.id)}
                                disabled={isFull || isLoading}
                              >
                                {isLoading ? (
                                  <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                                ) : (
                                  <RiCheckLine className="mr-1 size-3.5" />
                                )}
                                Sign up
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
