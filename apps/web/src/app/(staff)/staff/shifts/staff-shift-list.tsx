"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import {
  RiMoreLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFilterLine,
  RiLoader4Line,
  RiTimeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  getStaffShifts,
  deleteShift,
  type StaffShift,
  type ShiftFilters,
} from "@/lib/shift-actions";
import { formatTimeRange } from "@/lib/format";

interface StaffShiftListProps {
  initialShifts: StaffShift[];
  serviceAreas: { id: string; name: string }[];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isPast(date: Date): boolean {
  return new Date(date) < new Date(new Date().toISOString().split("T")[0]);
}

function isToday(date: Date): boolean {
  const today = new Date().toISOString().split("T")[0];
  const shiftDate = new Date(date).toISOString().split("T")[0];
  return today === shiftDate;
}

export function StaffShiftList({
  initialShifts,
  serviceAreas,
}: StaffShiftListProps) {
  const router = useRouter();
  const [shifts, setShifts] = useState(initialShifts);
  const [serviceAreaFilter, setServiceAreaFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("upcoming");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<StaffShift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function applyFilters(areaId: string, time: string) {
    startTransition(async () => {
      const filters: ShiftFilters = {};
      if (areaId !== "all") filters.serviceAreaId = areaId;
      if (time === "upcoming") {
        filters.fromDate = new Date().toISOString();
      } else if (time === "past") {
        filters.toDate = new Date().toISOString();
      }
      const result = await getStaffShifts(filters);
      setShifts(result);
    });
  }

  function handleAreaChange(value: string) {
    setServiceAreaFilter(value);
    applyFilters(value, timeFilter);
  }

  function handleTimeChange(value: string) {
    setTimeFilter(value);
    applyFilters(serviceAreaFilter, value);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteShift(deleteTarget.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Shift deleted.");
      applyFilters(serviceAreaFilter, timeFilter);
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <RiFilterLine aria-hidden className="size-4 text-muted-foreground" />
        <Select value={serviceAreaFilter} onValueChange={handleAreaChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All areas" />
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

        <Select value={timeFilter} onValueChange={handleTimeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        {isPending && (
          <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Hairline roster list */}
      {shifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Illustration name="coffee" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No shifts found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the filters or create a new shift.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {shifts.map((shift) => {
              const past = isPast(shift.date);
              const today = isToday(shift.date);
              const shiftYear = new Date(shift.date).getFullYear();
              return (
                <li key={shift.id}>
                  <div
                    className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/40"
                    onClick={() => router.push(`/staff/shifts/${shift.id}`)}
                  >
                    <DateBlock
                      date={new Date(shift.date)}
                      className={past ? "opacity-55" : undefined}
                    />
                    <span
                      aria-hidden
                      className="self-stretch border-l border-border"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate font-serif text-base/snug font-medium tracking-tight">
                          {shift.serviceArea.name}
                        </p>
                        {today && <Badge>Today</Badge>}
                        {past && <Badge variant="neutral">Past</Badge>}
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <RiTimeLine aria-hidden className="size-3.5 shrink-0" />
                          <span className="tnum">
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </span>
                        </span>
                        {shiftYear !== currentYear && (
                          <span className="tnum">{shiftYear}</span>
                        )}
                        <span className="tnum sm:hidden">
                          {shift.signups.length}/{shift.capacity} filled
                        </span>
                      </p>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                      <CapacityMeter
                        filled={shift.signups.length}
                        capacity={shift.capacity}
                      />
                      <span className="text-xs text-muted-foreground tnum">
                        {shift.signups.length}/{shift.capacity} filled
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Shift actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RiMoreLine className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/staff/shifts/${shift.id}`);
                          }}
                        >
                          <RiEyeLine className="mr-2 size-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(shift);
                          }}
                        >
                          <RiDeleteBinLine className="mr-2 size-4" />
                          Delete shift
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
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
                  on{" "}
                  <strong>{formatDate(deleteTarget.date)}</strong> (
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <RiLoader4Line className="mr-2 size-4 animate-spin" />
              ) : (
                <RiDeleteBinLine className="mr-2 size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
