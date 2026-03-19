"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RiTimeLine,
  RiCalendarCheckLine,
  RiTrophyLine,
  RiMapPinLine,
  RiBarChartLine,
  RiStarLine,
  RiStarFill,
} from "@remixicon/react";
import type { VolunteerHoursData } from "@/lib/dashboard-actions";
import type { Milestone } from "@/lib/milestones";

interface HoursDetailProps {
  data: VolunteerHoursData;
}

function MilestoneIcon({ reached }: { reached: boolean }) {
  return reached ? (
    <RiStarFill className="size-5 text-yellow-500" />
  ) : (
    <RiStarLine className="size-5 text-muted-foreground/40" />
  );
}

export function HoursDetail({ data }: HoursDetailProps) {
  const nextMilestone = data.milestones.find((m) => !m.reached);
  const progressToNext = nextMilestone
    ? Math.min((data.totalHours / nextMilestone.hours) * 100, 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                <RiTimeLine className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="font-mono text-2xl font-bold">
                  {data.hoursThisMonth}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-green-600/10">
                <RiBarChartLine className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="font-mono text-2xl font-bold">
                  {data.totalHours}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-blue-600/10">
                <RiCalendarCheckLine className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Shifts</p>
                <p className="font-mono text-2xl font-bold">
                  {data.totalShifts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-yellow-500/10">
                <RiTrophyLine className="size-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Milestones</p>
                <p className="font-mono text-2xl font-bold">
                  {data.milestones.filter((m) => m.reached).length}/
                  {data.milestones.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hours by service area */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <RiMapPinLine className="size-5 text-primary" />
              <div>
                <CardTitle>By Service Area</CardTitle>
                <CardDescription>
                  Hours across different mahi
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.byServiceArea.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hours recorded yet
              </p>
            ) : (
              <div className="space-y-4">
                {data.byServiceArea.map((area) => {
                  const percentage =
                    data.totalHours > 0
                      ? (area.hours / data.totalHours) * 100
                      : 0;
                  return (
                    <div key={area.serviceAreaId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {area.serviceAreaName}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {area.hours}h
                          <span className="ml-1.5 text-xs">
                            ({area.shifts} shift
                            {area.shifts !== 1 ? "s" : ""})
                          </span>
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <RiBarChartLine className="size-5 text-primary" />
              <div>
                <CardTitle>Monthly Breakdown</CardTitle>
                <CardDescription>
                  Your hours month by month
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hours recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.byMonth.map((month) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{month.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {month.shifts} shift{month.shifts !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="font-mono text-lg font-semibold">
                      {month.hours}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <RiTrophyLine className="size-5 text-primary" />
            <div>
              <CardTitle>Tohu Mahi — Milestones</CardTitle>
              <CardDescription>
                Recognition for your dedication to our whānau
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress to next milestone */}
          {nextMilestone && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progress to {nextMilestone.label}
                </span>
                <span className="font-mono font-medium">
                  {data.totalHours}h / {nextMilestone.hours}h
                </span>
              </div>
              <Progress value={progressToNext} className="h-3" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.milestones.map((milestone) => (
              <div
                key={milestone.hours}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                  milestone.reached
                    ? "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10"
                    : "border-border bg-muted/20 opacity-60"
                }`}
              >
                <MilestoneIcon reached={milestone.reached} />
                <div className="text-center">
                  <p className="font-mono text-sm font-bold">
                    {milestone.label}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {milestone.emoji}
                  </p>
                </div>
                {milestone.reached && (
                  <Badge variant="warning">Achieved</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
