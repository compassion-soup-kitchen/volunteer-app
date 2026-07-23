"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";
import { SectionHeader } from "@/components/brand/section-header";
import { cn } from "@/lib/utils";
import {
  RiTimeLine,
  RiCalendarCheckLine,
  RiMapPinLine,
  RiStarLine,
  RiStarFill,
  RiHeartFill,
} from "@remixicon/react";
import type { VolunteerHoursData } from "@/lib/dashboard-actions";

interface HoursDetailProps {
  data: VolunteerHoursData;
}

/** Row accent rotation for the area ledger: icon tone + matching bar colour. */
const AREA_ACCENTS = [
  { tone: "brand", bar: "bg-chart-1" },
  { tone: "info", bar: "bg-chart-2" },
  { tone: "warning", bar: "bg-chart-3" },
  { tone: "success", bar: "bg-chart-4" },
  { tone: "neutral", bar: "bg-chart-5" },
] as const;

export function HoursDetail({ data }: HoursDetailProps) {
  const nextMilestone = data.milestones.find((m) => !m.reached);
  const progressToNext = nextMilestone
    ? Math.min((data.totalHours / nextMilestone.hours) * 100, 100)
    : 100;
  const hoursToNext = nextMilestone
    ? Math.max(0, Math.round(nextMilestone.hours - data.totalHours))
    : 0;

  const outcomeTiles = [
    {
      label: "This month",
      value: data.hoursThisMonth,
      unit: "h" as string | undefined,
      sublabel: `${data.shiftsThisMonth} shift${data.shiftsThisMonth !== 1 ? "s" : ""}`,
      icon: RiTimeLine,
      tone: "brand" as const,
    },
    {
      label: "Total shifts",
      value: data.totalShifts,
      unit: undefined,
      sublabel: "All your mahi",
      icon: RiCalendarCheckLine,
      tone: "info" as const,
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
      {/* Main column — the headline figure and where the time went */}
      <div className="min-w-0 space-y-6">
        {/* Ink hero — time given */}
        <Card variant="ink">
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow text-ink-muted-foreground">
                Tō wā · Time given
              </p>
              {data.hoursThisMonth > 0 && (
                <span className="shrink-0 rounded-sm bg-ink-foreground/15 px-2.5 py-1 text-xs font-semibold text-ink-foreground">
                  +{data.hoursThisMonth}h this month
                </span>
              )}
            </div>
            <StatFigure size="xl" value={data.totalHours} unit="hrs" />
            <p className="text-sm text-ink-muted-foreground">
              Across {data.totalShifts} shift
              {data.totalShifts !== 1 ? "s" : ""} since you joined
            </p>
          </CardContent>
        </Card>

        {/* Outcome tiles */}
        <div className="grid gap-3 sm:grid-cols-2">
          {outcomeTiles.map((tile) => (
            <Card key={tile.label}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="eyebrow text-[0.62rem] text-muted-foreground">
                    {tile.label}
                  </p>
                  <StatFigure value={tile.value} unit={tile.unit} />
                  <p className="text-xs text-muted-foreground">{tile.sublabel}</p>
                </div>
                <IconChip tone={tile.tone} size="sm">
                  <tile.icon />
                </IconChip>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Area ledger — where your time goes */}
        <section className="space-y-4">
          <SectionHeader eyebrow="Ngā wāhanga" title="Where your time goes" />
          <Card>
            {data.byServiceArea.length === 0 ? (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No hours recorded yet
                </p>
              </CardContent>
            ) : (
              <ul className="divide-y divide-border">
                {data.byServiceArea.map((area, i) => {
                  const accent = AREA_ACCENTS[i % AREA_ACCENTS.length];
                  const share =
                    data.totalHours > 0
                      ? (area.hours / data.totalHours) * 100
                      : 0;
                  return (
                    <li key={area.serviceAreaId} className="space-y-2.5 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <IconChip tone={accent.tone} size="sm">
                          <RiMapPinLine />
                        </IconChip>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {area.serviceAreaName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {area.shifts} shift{area.shifts !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <StatFigure size="md" value={area.hours} unit="h" />
                          <p className="tnum mt-0.5 text-xs text-muted-foreground">
                            {Math.round(share)}%
                          </p>
                        </div>
                      </div>
                      <div
                        aria-hidden
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={cn("h-full rounded-full", accent.bar)}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>
      </div>

      {/* Quiet rail — milestones, month by month, and a thank-you */}
      <div className="min-w-0 space-y-6">
        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Tohu mahi · Milestones</CardTitle>
            <CardDescription>
              Recognition for your dedication to our whānau
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextMilestone ? (
              <div className="space-y-2">
                <Progress
                  value={progressToNext}
                  aria-label={`Progress to ${nextMilestone.label}`}
                />
                <p className="text-xs text-muted-foreground">
                  <span className="tnum font-semibold text-foreground">
                    {hoursToNext}h
                  </span>{" "}
                  of mahi until{" "}
                  <span className="font-semibold text-foreground">
                    {nextMilestone.term}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Every milestone reached - ka rawe!
              </p>
            )}
            <ul className="flex flex-wrap gap-2">
              {data.milestones.map((milestone) => (
                <li
                  key={milestone.hours}
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm px-2.5 py-1",
                    milestone.reached
                      ? "bg-warning-tint text-warning-tint-foreground"
                      : "bg-muted text-muted-foreground opacity-70"
                  )}
                >
                  {milestone.reached ? (
                    <RiStarFill className="size-3.5" aria-hidden />
                  ) : (
                    <RiStarLine className="size-3.5" aria-hidden />
                  )}
                  <span className="font-serif text-sm font-medium tracking-tight">
                    {milestone.term}
                  </span>
                  <span className="tnum text-xs">{milestone.hours}h</span>
                  <span className="sr-only">
                    {milestone.reached ? "reached" : "not yet reached"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Monthly breakdown */}
        <Card className="gap-0 pb-2">
          <CardHeader className="pb-3">
            <CardTitle>Month by month</CardTitle>
          </CardHeader>
          {data.byMonth.length === 0 ? (
            <CardContent className="border-t border-border pt-3 pb-2">
              <p className="text-sm text-muted-foreground">
                No hours recorded yet
              </p>
            </CardContent>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {data.byMonth.map((month) => (
                <li
                  key={month.month}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {month.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {month.shifts} shift{month.shifts !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <StatFigure
                    size="md"
                    value={month.hours}
                    unit="h"
                    className="shrink-0"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Gratitude banner */}
        <Card className="bg-primary text-primary-foreground ring-0">
          <CardContent className="flex items-center gap-3">
            <RiHeartFill className="size-5 shrink-0" aria-hidden />
            <p className="font-serif text-lg/snug font-medium tracking-tight">
              Ngā mihi - your time keeps the kitchen warm.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
