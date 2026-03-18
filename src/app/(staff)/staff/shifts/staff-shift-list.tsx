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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  RiCalendarLine,
  RiMoreLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFilterLine,
  RiLoader4Line,
  RiTeamLine,
  RiTimeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  getStaffShifts,
  deleteShift,
  type StaffShift,
  type ShiftFilters,
} from "@/lib/shift-actions";

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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <RiFilterLine className="size-4 text-muted-foreground" />
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

      {/* Desktop table */}
      <div className="hidden md:block">
        {shifts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RiCalendarLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No shifts found
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try adjusting filters or create a new shift
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Service Area</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Signups</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => {
                  const past = isPast(shift.date);
                  return (
                    <TableRow
                      key={shift.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/staff/shifts/${shift.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={past ? "text-muted-foreground" : ""}>
                            {formatDate(shift.date)}
                          </span>
                          {past && (
                            <Badge variant="secondary" className="text-[10px]">
                              Past
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{shift.serviceArea.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {shift.startTime}–{shift.endTime}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <RiTeamLine className="size-3.5 text-muted-foreground" />
                          <span>
                            {shift.signups.length}/{shift.capacity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {shifts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RiCalendarLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No shifts found
              </p>
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => {
            const past = isPast(shift.date);
            return (
              <Card
                key={shift.id}
                className="cursor-pointer active:bg-accent/50 transition-colors"
                onClick={() => router.push(`/staff/shifts/${shift.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {shift.serviceArea.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiCalendarLine className="size-3.5" />
                          {formatDate(shift.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="size-3.5" />
                          {shift.startTime}–{shift.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <RiTeamLine className="size-3.5" />
                        {shift.signups.length}/{shift.capacity} signed up
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {past && (
                        <Badge variant="secondary" className="text-[10px]">
                          Past
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RiMoreLine className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
                  {deleteTarget.startTime}–{deleteTarget.endTime})
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
