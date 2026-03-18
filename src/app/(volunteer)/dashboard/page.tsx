import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RiCalendarLine,
  RiTimeLine,
  RiArrowRightLine,
  RiCheckLine,
  RiTimerLine,
  RiInformationLine,
  RiTrophyLine,
  RiStarFill,
  RiGraduationCapLine,
  RiFileTextLine,
} from "@remixicon/react";
import Link from "next/link";
import { getUserApplicationStatus } from "@/lib/application-actions";
import { getDashboardData } from "@/lib/dashboard-actions";
import { getAvailableTraining } from "@/lib/training-actions";
import { getPendingResignCount } from "@/lib/document-actions";

export const metadata: Metadata = {
  title: "Dashboard | Te Pūaroha",
};

export default async function VolunteerDashboard() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const [appStatus, dashboardData, trainingSessions, pendingResigns] = await Promise.all([
    getUserApplicationStatus(),
    getDashboardData(),
    getAvailableTraining(),
    getPendingResignCount(),
  ]);
  const registeredTraining = trainingSessions.filter(
    (s) => s.userAttendanceStatus === "REGISTERED"
  );

  const reachedMilestones = dashboardData?.milestones?.filter((m) => m.reached) ?? [];
  const nextMilestone = dashboardData?.milestones?.find((m) => !m.reached);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Kia ora, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Welcome to your volunteer dashboard
        </p>
      </div>

      {/* No application yet */}
      {!appStatus && session?.user?.role === "PUBLIC" && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle>Complete Your Application</CardTitle>
            <CardDescription>
              To start volunteering, please complete your application form. We
              can&apos;t wait to have you on board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/application">
                Start Application
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Application pending */}
      {appStatus?.applicationStatus === "PENDING" && (
        <Card className="border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <RiTimerLine className="size-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Application Under Review</CardTitle>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <CardDescription>
                  Ngā mihi for applying — our team is reviewing your application
                  and will be in touch soon
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Application approved */}
      {appStatus?.applicationStatus === "APPROVED" && (
        <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <RiCheckLine className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Welcome to the Whānau!</CardTitle>
                  <Badge className="bg-green-600">Approved</Badge>
                </div>
                <CardDescription>
                  Your application has been approved. You can now sign up for
                  shifts and start volunteering.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/shifts">
                Browse Available Shifts
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* More info requested */}
      {appStatus?.applicationStatus === "INFO_REQUESTED" && (
        <Card className="border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <RiInformationLine className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>More Information Needed</CardTitle>
                  <Badge variant="outline">Action Required</Badge>
                </div>
                <CardDescription>
                  We need a bit more info to process your application. Please
                  check your application page for details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/application">
                View Details
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agreements needing re-sign */}
      {pendingResigns > 0 && (
        <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <RiFileTextLine className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Agreement Updates</CardTitle>
                <CardDescription>
                  {pendingResigns} agreement{pendingResigns !== 1 ? "s" : ""} need
                  your signature
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/documents">
                Review & Sign
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Training */}
      {registeredTraining.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                  <RiGraduationCapLine className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Upcoming Training</CardTitle>
                  <CardDescription>Sessions you&apos;re registered for</CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/training">
                  View all
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {registeredTraining.slice(0, 3).map((ts) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{ts.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ts.date).toLocaleDateString("en-NZ", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      &middot; {ts.startTime}–{ts.endTime}
                      {ts.location && ` · ${ts.location}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Registered
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Upcoming Shifts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                <RiCalendarLine className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Upcoming Shifts</CardTitle>
                <CardDescription>Your next scheduled mahi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData && dashboardData.upcomingShifts.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcomingShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{shift.serviceArea}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(shift.date).toLocaleDateString("en-NZ", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        &middot; {shift.startTime}–{shift.endTime}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Signed up
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming shifts. Browse available shifts to sign up.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                  <RiTimeLine className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Your Hours</CardTitle>
                  <CardDescription>Volunteer time this month</CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/hours">
                  View all
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData && dashboardData.totalHours > 0 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="font-mono text-2xl font-bold">
                    {dashboardData.hoursThisMonth}h
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData.totalHours}h total across{" "}
                    {dashboardData.totalShifts} shift
                    {dashboardData.totalShifts !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Milestones preview */}
                {reachedMilestones.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <RiTrophyLine className="size-4 text-yellow-600" />
                    <div className="flex gap-1">
                      {reachedMilestones.map((m) => (
                        <RiStarFill
                          key={m.hours}
                          className="size-4 text-yellow-500"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {reachedMilestones.length} milestone
                      {reachedMilestones.length !== 1 ? "s" : ""} reached
                    </span>
                  </div>
                )}

                {/* Next milestone progress */}
                {nextMilestone && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(nextMilestone.hours - dashboardData.totalHours)}h
                    to{" "}
                    <span className="font-medium">{nextMilestone.label}</span>{" "}
                    milestone
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="font-mono text-2xl font-bold">0h</p>
                <p className="text-sm text-muted-foreground">
                  Hours will appear here once you start volunteering
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
