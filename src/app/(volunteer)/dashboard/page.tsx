import type { Metadata } from "next";
import { connection } from "next/server";
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
  RiRestaurantLine,
  RiMegaphoneLine,
  RiHandHeartLine,
  RiAlertLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import Link from "next/link";
import { getUserApplicationStatus } from "@/lib/application-actions";
import { getDashboardData } from "@/lib/dashboard-actions";
import { getAvailableTraining } from "@/lib/training-actions";
import { getPendingResignCount } from "@/lib/document-actions";
import { getRecentAnnouncements } from "@/lib/announcement-actions";

export const metadata: Metadata = {
  title: "Dashboard | Te Pūaroha",
};

const SUPPORT_LINK = "https://www.compassion.org.nz/donate";

function formatToday() {
  return new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShiftDate(date: Date) {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(time: string) {
  // "09:00" -> "9am", "13:30" -> "1:30pm"
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "pm" : "am";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${displayH}${displayM}${period}`;
}

function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function SectionEyebrow({ maori, english }: { maori: string; english: string }) {
  return (
    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <span className="h-px w-6 bg-primary" aria-hidden />
      <span className="text-primary">{maori}</span>
      <span aria-hidden>·</span>
      <span>{english}</span>
    </p>
  );
}

export default async function VolunteerDashboard() {
  await connection();
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  const [appStatus, dashboardData, trainingSessions, pendingResigns, announcements] =
    await Promise.all([
      getUserApplicationStatus(),
      getDashboardData(),
      getAvailableTraining(),
      getPendingResignCount(),
      getRecentAnnouncements(3),
    ]);

  const registeredTraining = trainingSessions.filter(
    (s) => s.userAttendanceStatus === "REGISTERED"
  );

  const reachedMilestones = dashboardData?.milestones?.filter((m) => m.reached) ?? [];
  const nextMilestone = dashboardData?.milestones?.find((m) => !m.reached);

  const nextShift = dashboardData?.nextShift;
  const nextShiftDate = nextShift ? new Date(nextShift.date) : null;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Kia ora, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{formatToday()}</p>
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
                  <Badge variant="success">Approved</Badge>
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

      {/* Agreements needing re-ack */}
      {pendingResigns > 0 && (
        <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <RiFileTextLine className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Action required: review &amp; confirm</CardTitle>
                <CardDescription>
                  {pendingResigns} {pendingResigns === 1 ? "policy" : "policies"} need
                  your acknowledgment before your next shift
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/documents">
                Review &amp; sign
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My Roster — hero next shift */}
      {dashboardData && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SectionEyebrow maori="Tō Rōhita" english="My Roster" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/shifts">
                All my shifts
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </div>

          {nextShift && nextShiftDate ? (
            <Card className="overflow-hidden border-primary/20">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Calendar block */}
                  <div className="flex w-24 flex-col items-center justify-center border-r border-primary/15 bg-primary/[0.06] py-5 sm:w-28">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {nextShiftDate.toLocaleDateString("en-NZ", { month: "short" })}
                    </span>
                    <span className="font-mono text-4xl font-bold leading-none text-foreground">
                      {nextShiftDate.getDate()}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {nextShiftDate.toLocaleDateString("en-NZ", { weekday: "short" })}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your next mahi
                      </p>
                      <p className="text-lg font-semibold leading-tight">
                        {nextShift.serviceArea}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimeRange(nextShift.startTime, nextShift.endTime)}
                      </p>
                      {nextShift.notes && (
                        <p className="pt-1 text-sm text-muted-foreground">
                          {nextShift.notes}
                        </p>
                      )}
                    </div>
                    <Button asChild size="sm">
                      <Link href="/shifts">
                        View shift
                        <RiArrowRightLine className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {dashboardData.upcomingShifts.length > 1 && (
                  <div className="border-t border-border bg-muted/20 px-4 py-3 sm:px-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Also coming up
                    </p>
                    <ul className="space-y-1.5">
                      {dashboardData.upcomingShifts.slice(1, 4).map((shift) => (
                        <li
                          key={shift.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="font-medium">{shift.serviceArea}</span>
                          <span className="text-muted-foreground">
                            {formatShiftDate(shift.date)}
                            {" · "}
                            {formatTimeRange(shift.startTime, shift.endTime)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <RiCalendarLine className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">No shift on the horizon yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ready when you are — pick your next mahi from the roster.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/shifts">
                    Browse the roster
                    <RiArrowRightLine className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Open shifts you can fill */}
      {dashboardData && dashboardData.openShiftsForYou.length > 0 && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <RiAlertLine className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Spots open in your areas
                  </CardTitle>
                  <CardDescription>
                    A few shifts could use your hands
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/shifts">
                  Browse all
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dashboardData.openShiftsForYou.slice(0, 3).map((shift) => (
                <li key={shift.id}>
                  <Link
                    href="/shifts"
                    className="group flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:border-primary/60 focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {shift.serviceArea}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatShiftDate(shift.date)}
                        {" · "}
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-medium text-primary">
                        {shift.spotsLeft}{" "}
                        {shift.spotsLeft === 1 ? "spot" : "spots"} left
                      </span>
                      <RiArrowRightLine className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* My Mahi — Impact */}
      {dashboardData && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SectionEyebrow maori="Tō Mahi" english="My Impact" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/hours">
                Full breakdown
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </div>

          {dashboardData.totalShifts > 0 ? (
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {/* Headline meals stat — the soup kitchen's purpose */}
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <RiRestaurantLine className="size-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Meals shared
                        </p>
                        <p className="font-mono text-3xl font-bold leading-tight text-foreground">
                          {dashboardData.totalMeals.toLocaleString("en-NZ")}
                        </p>
                      </div>
                    </div>
                    {dashboardData.mealsThisMonth > 0 && (
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          This month
                        </p>
                        <p className="font-mono text-lg font-semibold">
                          +{dashboardData.mealsThisMonth.toLocaleString("en-NZ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RiTimeLine className="size-4" />
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Hours
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-2xl font-bold">
                      {dashboardData.totalHours}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData.hoursThisMonth}h this month
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RiCalendarLine className="size-4" />
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Shifts
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-2xl font-bold">
                      {dashboardData.totalShifts}
                    </p>
                    <p className="text-xs text-muted-foreground">attended</p>
                  </div>
                </div>

                {/* Milestones */}
                {(reachedMilestones.length > 0 || nextMilestone) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="flex items-center gap-2">
                      <RiTrophyLine className="size-5 text-yellow-600" />
                      {reachedMilestones.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex">
                            {reachedMilestones.map((m) => (
                              <RiStarFill
                                key={m.hours}
                                className="size-4 text-yellow-500"
                              />
                            ))}
                          </div>
                          <span className="text-sm">
                            {reachedMilestones.length} milestone
                            {reachedMilestones.length !== 1 ? "s" : ""} reached
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Working toward your first milestone
                        </span>
                      )}
                    </div>
                    {nextMilestone && (
                      <p className="text-xs text-muted-foreground">
                        {Math.max(
                          0,
                          Math.round(nextMilestone.hours - dashboardData.totalHours)
                        )}
                        h to{" "}
                        <span className="font-medium text-foreground">
                          {nextMilestone.label}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="font-medium">Your story starts soon</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hours and meals shared will appear here once your first shift
                  is logged.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
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
                      {formatShiftDate(ts.date)}
                      {" · "}
                      {formatTimeRange(ts.startTime, ts.endTime)}
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

      {/* News & Updates */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <SectionEyebrow maori="Ngā Kōrero" english="News & Updates" />
          {announcements.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/news">
                All updates
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="p-4 sm:p-5">
            {announcements.length > 0 ? (
              <ul className="divide-y divide-border">
                {announcements.map((a, i) => (
                  <li key={a.id} className={i === 0 ? "pb-3" : "py-3 last:pb-0"}>
                    <Link
                      href={`/news#${a.id}`}
                      className="group block rounded-sm border-l-2 border-transparent pl-3 transition-colors hover:border-primary"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-semibold leading-tight">
                          {a.title}
                        </p>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatShiftDate(a.sentAt)}
                        </p>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {a.body}
                      </p>
                      {a.authorName && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          — {a.authorName}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-3 py-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <RiMegaphoneLine className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Nothing new just yet</p>
                  <p className="text-sm text-muted-foreground">
                    Kitchen news and updates will land here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Policies & Procedures */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <RiShieldCheckLine className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Policies &amp; Procedures</CardTitle>
                <CardDescription>
                  Read and confirm the kaupapa we work by
                </CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/documents">
                Open
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Other Ways to Support */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent">
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <RiHandHeartLine className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold">Other ways to tautoko</p>
              <p className="text-sm text-muted-foreground">
                Donate kai, support a drive, or share the kaupapa with your whānau.
              </p>
            </div>
          </div>
          <Button asChild>
            <a href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer">
              See current needs
              <RiArrowRightLine className="size-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
