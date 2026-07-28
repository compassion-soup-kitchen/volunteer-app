"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/date-picker";
import { toDateOnly, todayInAppZone, toPickerDate } from "@/lib/date-only";
import { Eyebrow } from "@/components/brand/eyebrow";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";
import { StatusBadge } from "@/components/brand/status-badge";
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
  RiFileChartLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";
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
  getMonthlySummary,
  getShiftExportData,
  getVolunteerExportData,
} from "@/lib/report-actions";
import {
  buildMonthlySummaryCsv,
  monthlySummaryFileName,
} from "@/lib/report-summary";
import { HoursChart } from "./hours-chart";
import { TrendsChart } from "./trends-chart";

/** Hands the browser a generated file to save. */
function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  downloadFile(filename, csvContent);
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
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.fromDate ? toPickerDate(new Date(filters.fromDate)) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.toDate ? toPickerDate(new Date(filters.toDate)) : undefined
  );
  const [areaId, setAreaId] = useState(filters.serviceAreaId || "all");

  function applyFilters() {
    startTransition(() => {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", toDateOnly(fromDate));
      if (toDate) params.set("to", toDateOnly(toDate));
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

  /**
   * The monthly reporting figures as one file — new volunteers, inductions
   * completed, and per-area turnout and hours, matching what's on screen.
   */
  async function handleExportSummary() {
    setExporting("summary");
    try {
      const summary = await getMonthlySummary(filters);
      if (!summary) {
        toast.error("Couldn't build that summary. Please try again.");
        return;
      }
      downloadFile(
        monthlySummaryFileName(summary),
        buildMonthlySummaryCsv(summary)
      );
    } catch (err) {
      console.error("Summary export failed:", err);
      toast.error("Couldn't build that summary. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportShifts() {
    setExporting("shifts");
    try {
      const data = await getShiftExportData(filters);
      downloadCsv(
        `shifts-report-${todayInAppZone()}.csv`,
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
        `volunteers-report-${todayInAppZone()}.csv`,
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

  const hasFilters = fromDate || toDate || areaId !== "all";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent>
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
                Service area
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total hours",
              value: summary.totalHours,
              unit: "h" as string | undefined,
              sublabel: "Ngā hāora",
              icon: RiTimeLine,
              tone: "brand" as const,
            },
            {
              label: "Total shifts",
              value: summary.totalShifts,
              unit: undefined,
              sublabel: "Ngā mahi",
              icon: RiCalendarLine,
              tone: "info" as const,
            },
            {
              label: "Unique volunteers",
              value: summary.uniqueVolunteers,
              unit: undefined,
              sublabel: "Kaimahi tūao",
              icon: RiTeamLine,
              tone: "neutral" as const,
            },
            {
              label: "Attendance rate",
              value: summary.overallAttendanceRate,
              unit: "%",
              sublabel: "Attended of signed up",
              icon: RiCheckLine,
              tone: "success" as const,
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="eyebrow text-[0.62rem] text-muted-foreground">
                    {stat.label}
                  </p>
                  <StatFigure value={stat.value} unit={stat.unit} />
                  <p className="text-xs text-muted-foreground">
                    {stat.sublabel}
                  </p>
                </div>
                <IconChip tone={stat.tone} size="sm">
                  <stat.icon />
                </IconChip>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Eyebrow>Ngā hāora</Eyebrow>
            <CardTitle>Hours by service area</CardTitle>
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
            <Eyebrow>Ia marama</Eyebrow>
            <CardTitle>Monthly trends</CardTitle>
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
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Top Volunteers */}
        <Card>
          <CardHeader className={leaderboard.length > 0 ? "border-b" : undefined}>
            <Eyebrow>Toa</Eyebrow>
            <CardTitle>Top volunteers</CardTitle>
          </CardHeader>
          {leaderboard.length > 0 ? (
            <ul className="divide-y divide-border">
              {leaderboard.slice(0, 10).map((v, i) => (
                <li
                  key={v.volunteerId}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm font-medium text-secondary-foreground tnum"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {v.volunteerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.serviceAreas.join(", ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatFigure size="md" value={v.totalHours} unit="h" />
                    <p className="text-xs text-muted-foreground">
                      {v.totalShifts} {v.totalShifts === 1 ? "shift" : "shifts"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <CardContent>
              <p className="py-8 text-center text-sm text-muted-foreground">
                No attendance data for this period
              </p>
            </CardContent>
          )}
        </Card>

        {/* Onboarding Metrics */}
        {onboarding && (
          <Card>
            <CardHeader>
              <Eyebrow>Whakauru</Eyebrow>
              <CardTitle>Onboarding pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <StatFigure value={onboarding.totalApplications} />
                  <p className="eyebrow mt-1.5 text-[0.62rem] text-muted-foreground">
                    Total applications
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <StatFigure value={onboarding.activeVolunteers} />
                  <p className="eyebrow mt-1.5 text-[0.62rem] text-muted-foreground">
                    Active volunteers
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                <li className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <StatusBadge status="PENDING" label={onboarding.pending} />
                </li>
                <li className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <StatusBadge status="APPROVED" label={onboarding.approved} />
                </li>
                <li className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Declined</span>
                  <StatusBadge status="DECLINED" label={onboarding.declined} />
                </li>
                <li className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Info requested</span>
                  <StatusBadge
                    status="INFO_REQUESTED"
                    label={onboarding.infoRequested}
                  />
                </li>
                <li className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Inactive</span>
                  <StatusBadge
                    status="INACTIVE"
                    label={onboarding.inactiveVolunteers}
                  />
                </li>
              </ul>
              {onboarding.avgDaysToApproval !== null && (
                <div className="rounded-lg bg-muted p-3 text-center">
                  <StatFigure
                    size="md"
                    value={onboarding.avgDaysToApproval}
                    unit="days"
                  />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Average time to approval
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <Eyebrow>Tikiake</Eyebrow>
          <CardTitle>Export data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              onClick={handleExportSummary}
              disabled={exporting !== null}
            >
              {exporting === "summary" ? (
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RiFileChartLine className="mr-1.5 size-3.5" />
              )}
              Monthly summary
            </Button>
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
            Exports respect the current date range and service area filters.
            The monthly summary covers new volunteers, inductions completed,
            and turnout and hours per service area.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
