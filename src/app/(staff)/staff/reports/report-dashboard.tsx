"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiTimeLine,
  RiCalendarLine,
  RiTeamLine,
  RiCheckLine,
  RiFilterLine,
  RiDownloadLine,
  RiLoader4Line,
  RiBarChartLine,
  RiUserAddLine,
} from "@remixicon/react";
import type {
  ReportSummary,
  HoursByServiceArea,
  MonthlyTrend,
  VolunteerLeaderboard,
  OnboardingMetrics,
  ServiceAreaOption,
  ReportFilters,
} from "@/lib/report-actions";
import {
  getShiftExportData,
  getVolunteerExportData,
} from "@/lib/report-actions";
import { HoursChart } from "./hours-chart";
import { TrendsChart } from "./trends-chart";

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportDashboard({
  summary,
  byArea,
  trends,
  leaderboard,
  onboarding,
  serviceAreas,
  filters,
}: {
  summary: ReportSummary | null;
  byArea: HoursByServiceArea[];
  trends: MonthlyTrend[];
  leaderboard: VolunteerLeaderboard[];
  onboarding: OnboardingMetrics | null;
  serviceAreas: ServiceAreaOption[];
  filters: ReportFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.fromDate ? new Date(filters.fromDate) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.toDate ? new Date(filters.toDate) : undefined
  );
  const [areaId, setAreaId] = useState(filters.serviceAreaId || "all");

  function applyFilters() {
    startTransition(() => {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate.toISOString().split("T")[0]);
      if (toDate) params.set("to", toDate.toISOString().split("T")[0]);
      if (areaId && areaId !== "all") params.set("area", areaId);
      const qs = params.toString();
      router.push(`/staff/reports${qs ? `?${qs}` : ""}`);
    });
  }

  function clearFilters() {
    setFromDate(undefined);
    setToDate(undefined);
    setAreaId("all");
    startTransition(() => {
      router.push("/staff/reports");
    });
  }

  async function handleExportShifts() {
    setExporting("shifts");
    try {
      const data = await getShiftExportData(filters);
      downloadCsv(
        `shifts-report-${new Date().toISOString().split("T")[0]}.csv`,
        [
          "Date",
          "Service Area",
          "Start",
          "End",
          "Capacity",
          "Signed Up",
          "Attended",
          "No Show",
          "Hours",
        ],
        data.map((r) => [
          r.date,
          r.serviceArea,
          r.startTime,
          r.endTime,
          String(r.capacity),
          String(r.signedUp),
          String(r.attended),
          String(r.noShow),
          String(r.hours),
        ])
      );
    } finally {
      setExporting(null);
    }
  }

  async function handleExportVolunteers() {
    setExporting("volunteers");
    try {
      const data = await getVolunteerExportData(filters);
      downloadCsv(
        `volunteers-report-${new Date().toISOString().split("T")[0]}.csv`,
        [
          "Name",
          "Email",
          "Status",
          "MOJ Status",
          "Total Shifts",
          "Total Hours",
          "Joined",
        ],
        data.map((r) => [
          r.name,
          r.email,
          r.status,
          r.mojStatus,
          String(r.totalShifts),
          String(r.totalHours),
          r.joinedDate,
        ])
      );
    } finally {
      setExporting(null);
    }
  }

  const hasFilters = fromDate || toDate || (areaId !== "all");

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-1.5 sm:w-auto sm:min-w-40">
              <Label htmlFor="from-date" className="text-xs">
                From
              </Label>
              <DatePicker
                id="from-date"
                value={fromDate}
                onChange={setFromDate}
                placeholder="Start date"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-auto sm:min-w-40">
              <Label htmlFor="to-date" className="text-xs">
                To
              </Label>
              <DatePicker
                id="to-date"
                value={toDate}
                onChange={setToDate}
                placeholder="End date"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-auto sm:min-w-44">
              <Label htmlFor="area-filter" className="text-xs">
                Service Area
              </Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger id="area-filter" className="h-9">
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {serviceAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={applyFilters}
                disabled={isPending}
                size="sm"
                className="h-9"
              >
                {isPending ? (
                  <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RiFilterLine className="mr-1.5 size-3.5" />
                )}
                Apply
              </Button>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={clearFilters}
                  disabled={isPending}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Hours
                  </p>
                  <p className="text-2xl font-bold">{summary.totalHours}</p>
                </div>
                <RiTimeLine className="size-5 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Shifts
                  </p>
                  <p className="text-2xl font-bold">{summary.totalShifts}</p>
                </div>
                <RiCalendarLine className="size-5 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Unique Volunteers
                  </p>
                  <p className="text-2xl font-bold">
                    {summary.uniqueVolunteers}
                  </p>
                </div>
                <RiTeamLine className="size-5 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Attendance Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {summary.overallAttendanceRate}%
                  </p>
                </div>
                <RiCheckLine className="size-5 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RiBarChartLine className="size-4" />
              Hours by Service Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byArea.length > 0 ? (
              <HoursChart data={byArea} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No shift data for this period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RiCalendarLine className="size-4" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 ? (
              <TrendsChart data={trends} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No trend data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard + Onboarding */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Volunteers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RiTeamLine className="size-4" />
              Toa — Top Volunteers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((v, i) => (
                  <div
                    key={v.volunteerId}
                    className="flex items-center justify-between rounded-md border border-border p-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {v.volunteerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.serviceAreas.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <p className="text-sm font-semibold">{v.totalHours}h</p>
                        <p className="text-xs text-muted-foreground">
                          {v.totalShifts} shifts
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No attendance data for this period
              </p>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Metrics */}
        {onboarding && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RiUserAddLine className="size-4" />
                Onboarding Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {onboarding.totalApplications}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Applications
                  </p>
                </div>
                <div className="rounded-md border border-border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {onboarding.activeVolunteers}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active Volunteers
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200"
                  >
                    {onboarding.pending}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-200"
                  >
                    {onboarding.approved}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Declined</span>
                  <Badge
                    variant="outline"
                    className="text-red-600 border-red-200"
                  >
                    {onboarding.declined}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Info Requested</span>
                  <Badge variant="outline">{onboarding.infoRequested}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Inactive</span>
                  <Badge variant="outline">{onboarding.inactiveVolunteers}</Badge>
                </div>
                {onboarding.avgDaysToApproval !== null && (
                  <div className="mt-3 rounded-md bg-muted/50 p-3 text-center">
                    <p className="text-lg font-semibold">
                      {onboarding.avgDaysToApproval} days
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Average time to approval
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RiDownloadLine className="size-4" />
            Tikiake — Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportShifts}
              disabled={exporting !== null}
            >
              {exporting === "shifts" ? (
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RiDownloadLine className="mr-1.5 size-3.5" />
              )}
              Shifts CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportVolunteers}
              disabled={exporting !== null}
            >
              {exporting === "volunteers" ? (
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RiDownloadLine className="mr-1.5 size-3.5" />
              )}
              Volunteers CSV
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Exports respect the current date range and service area filters
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
