import type { Metadata } from "next";
import { connection } from "next/server";
import { APP_TIME_ZONE, formatDateOnly } from "@/lib/date-only";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eyebrow } from "@/components/brand/eyebrow";
import { SectionHeader } from "@/components/brand/section-header";
import { DateBlock } from "@/components/brand/date-block";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import {
  RiArrowRightLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCheckLine,
  RiFileTextLine,
  RiGraduationCapLine,
  RiGroupLine,
  RiHandHeartLine,
  RiInformationLine,
  RiMegaphoneLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiTimerLine,
  RiTrophyLine,
} from "@remixicon/react";
import Link from "next/link";
import { getUserApplicationStatus } from "@/lib/application-actions";
import { getDashboardData } from "@/lib/dashboard-actions";
import { getAvailableTraining } from "@/lib/training-actions";
import { getPendingResignCount } from "@/lib/document-actions";
import { getRecentAnnouncements } from "@/lib/announcement-actions";
import { formatTimeRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard | Te Pūaroha",
};

const SUPPORT_LINK = "https://www.compassion.org.nz/donate";

function nzHour() {
  return Number(
    new Intl.DateTimeFormat("en-NZ", {
      timeZone: APP_TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
  );
}

/** Time-of-day greeting, matching the mobile app. */
function greeting() {
  const h = nzHour();
  if (h < 12) return "Mōrena"; // good morning
  if (h < 18) return "Ahiahi mārie"; // good afternoon
  return "Pō mārie"; // good evening
}

function formatToday() {
  return new Date().toLocaleDateString("en-NZ", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShiftDate(date: Date) {
  // A stored calendar day: a shift on the 3rd is on the 3rd wherever it's read.
  return formatDateOnly(date, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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
      getRecentAnnouncements(2),
    ]);

  const registeredTraining = trainingSessions.filter(
    (s) => s.userAttendanceStatus === "REGISTERED"
  );

  const reachedMilestones = dashboardData?.milestones?.filter((m) => m.reached) ?? [];
  const nextMilestone = dashboardData?.milestones?.find((m) => !m.reached);

  const nextShift = dashboardData?.nextShift;
  const nextShiftDate = nextShift ? new Date(nextShift.date) : null;

  return (
    <div className="space-y-8">
      {/* Greeting masthead */}
      <div className="relative overflow-hidden">
        <Kowhaiwhai className="pointer-events-none absolute -right-12 -top-14 hidden w-64 opacity-[0.05] sm:block" />
        <div className="relative space-y-1">
          <Eyebrow>{greeting()}</Eyebrow>
          <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            Kia ora, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">{formatToday()}</p>
        </div>
      </div>

      {/* No application yet */}
      {!appStatus && session?.user?.role === "PUBLIC" && (
        <Card variant="tint">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-medium tracking-tight">
                Complete your application
              </h2>
              <p className="text-sm text-muted-foreground">
                To start volunteering, please complete your application form. We
                can&apos;t wait to have you on board.
              </p>
            </div>
            <Button asChild>
              <Link href="/application">
                Start application
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Application pending */}
      {appStatus?.applicationStatus === "PENDING" && (
        <Card>
          <CardContent className="flex items-start gap-3">
            <IconChip tone="warning">
              <RiTimerLine />
            </IconChip>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg font-medium tracking-tight">
                  Application under review
                </h2>
                <Badge variant="warning">Pending</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Ngā mihi for applying — our team is reviewing your application
                and will be in touch soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application approved */}
      {appStatus?.applicationStatus === "APPROVED" && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <IconChip tone="success">
                <RiCheckLine />
              </IconChip>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-lg font-medium tracking-tight">
                    Welcome to the whānau!
                  </h2>
                  <Badge variant="success">Approved</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your application has been approved. You can now sign up for
                  shifts and start volunteering.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/shifts">
                Browse available shifts
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* More info requested */}
      {appStatus?.applicationStatus === "INFO_REQUESTED" && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <IconChip tone="info">
                <RiInformationLine />
              </IconChip>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-lg font-medium tracking-tight">
                    More information needed
                  </h2>
                  <Badge variant="info">Action required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  We need a bit more info to process your application. Please
                  check your application page for details.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/application">
                View details
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agreements needing re-acknowledgement */}
      {pendingResigns > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <IconChip tone="warning">
              <RiFileTextLine />
            </IconChip>
            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="font-serif text-lg font-medium tracking-tight">
                Review &amp; confirm
              </h2>
              <p className="text-sm text-muted-foreground">
                {pendingResigns} {pendingResigns === 1 ? "policy needs" : "policies need"}{" "}
                your acknowledgment before your next shift.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/documents">
                Review &amp; sign
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Two zones on desktop: the day's essentials + a quiet side rail */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-8">
      {/* Next shift hero */}
      {dashboardData && (
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Tō rōhita"
            title="Your next shift"
            action={{ label: "All shifts", href: "/shifts" }}
          />

          {nextShift && nextShiftDate ? (
            <Card className="rounded-2xl">
              {/* The red mission rail marks the volunteer's own commitment */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1 bg-primary"
              />
              <CardContent className="flex items-center gap-4 sm:gap-5">
                <DateBlock date={nextShiftDate} />
                <span aria-hidden className="self-stretch border-l border-border" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-serif text-xl/tight font-medium tracking-tight">
                    {nextShift.serviceArea.name}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <RiTimeLine className="size-3.5 shrink-0" aria-hidden />
                    {formatTimeRange(nextShift.startTime, nextShift.endTime)}
                  </p>
                  {nextShift.notes && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {nextShift.notes}
                    </p>
                  )}
                </div>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/shifts">View</Link>
                </Button>
              </CardContent>

              {dashboardData.upcomingShifts.length > 1 && (
                <div className="border-t border-border">
                  <ul className="divide-y divide-border">
                    {dashboardData.upcomingShifts.slice(1, 4).map((shift) => (
                      <li
                        key={shift.id}
                        className="flex flex-col gap-0.5 px-5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <span className="min-w-0 font-medium">
                          {shift.serviceArea.name}
                        </span>
                        <span className="text-muted-foreground sm:shrink-0">
                          {formatShiftDate(shift.date)}
                          {" · "}
                          {formatTimeRange(shift.startTime, shift.endTime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <IconChip tone="brand" size="lg">
                  <RiCalendarLine />
                </IconChip>
                <div>
                  <p className="font-serif text-lg font-medium tracking-tight">
                    No shift on the horizon yet
                  </p>
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
        <section className="space-y-4">
          <SectionHeader
            divider
            eyebrow="Hei āwhina mai"
            title="Shifts you can fill"
            action={{ label: "Browse all", href: "/shifts" }}
          />
          <Card>
            <ul className="divide-y divide-border">
              {dashboardData.openShiftsForYou.slice(0, 3).map((shift) => (
                <li key={shift.id}>
                  <Link
                    href="/shifts"
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {shift.serviceArea.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatShiftDate(shift.date)}
                        {" · "}
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {shift.spotsLeft} {shift.spotsLeft === 1 ? "spot" : "spots"} left
                    </span>
                    <RiArrowRightSLine
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Your contribution — ink stat strip + milestones */}
      {dashboardData && (
        <section className="space-y-4">
          <SectionHeader
            divider
            eyebrow="Tō takoha"
            title="Your contribution"
            action={{ label: "Details", href: "/hours" }}
          />

          {dashboardData.totalShifts > 0 ? (
            <div className="space-y-3">
              <Card variant="ink">
                <CardContent className="flex items-stretch justify-between gap-4">
                  {[
                    {
                      label: "Hours",
                      value: dashboardData.totalHours,
                      delta:
                        dashboardData.hoursThisMonth > 0
                          ? `+${dashboardData.hoursThisMonth} this month`
                          : null,
                    },
                    {
                      label: "Meals",
                      value: dashboardData.totalMeals.toLocaleString("en-NZ"),
                      delta:
                        dashboardData.mealsThisMonth > 0
                          ? `+${dashboardData.mealsThisMonth.toLocaleString("en-NZ")} this month`
                          : null,
                    },
                    {
                      label: "Shifts",
                      value: dashboardData.totalShifts,
                      delta: null,
                    },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className={
                        i > 0
                          ? "flex-1 border-l border-ink-foreground/15 pl-4"
                          : "flex-1"
                      }
                    >
                      <p className="eyebrow text-ink-muted-foreground">{stat.label}</p>
                      <StatFigure value={stat.value} className="mt-1.5" />
                      {stat.delta && (
                        <p className="mt-1 text-xs font-medium text-ink-muted-foreground">
                          {stat.delta}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {(reachedMilestones.length > 0 || nextMilestone) && (
                <Card size="sm">
                  <CardContent className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <IconChip tone="warning" size="sm">
                          <RiTrophyLine />
                        </IconChip>
                        <p className="text-sm font-semibold">
                          {reachedMilestones.length > 0
                            ? `${reachedMilestones.length} milestone${
                                reachedMilestones.length !== 1 ? "s" : ""
                              } reached`
                            : "Working toward your first milestone"}
                        </p>
                      </div>
                      {nextMilestone && (
                        <p className="text-xs text-muted-foreground">
                          {Math.max(
                            0,
                            Math.round(nextMilestone.hours - dashboardData.totalHours)
                          )}
                          h to{" "}
                          <span className="font-semibold text-foreground">
                            {nextMilestone.label}
                          </span>
                        </p>
                      )}
                    </div>
                    {nextMilestone && (
                      <Progress
                        aria-label={`Progress to ${nextMilestone.label}`}
                        value={Math.min(
                          (dashboardData.totalHours / nextMilestone.hours) * 100,
                          100
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="font-serif text-lg font-medium tracking-tight">
                  Your story starts soon
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hours and meals shared will appear here once your first shift
                  is logged.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Training reminder */}
      {registeredTraining.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            divider
            eyebrow="He maumahara"
            title="Don't forget"
            action={{ label: "All training", href: "/training" }}
          />
          <Card>
            <ul className="divide-y divide-border">
              {registeredTraining.slice(0, 3).map((ts) => (
                <li key={ts.id} className="flex items-start gap-3 px-5 py-3">
                  <IconChip tone="info" size="sm" className="mt-0.5">
                    <RiGraduationCapLine />
                  </IconChip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{ts.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShiftDate(ts.date)}
                      {" · "}
                      {formatTimeRange(ts.startTime, ts.endTime)}
                      {ts.location && ` · ${ts.location}`}
                    </p>
                  </div>
                  <Badge variant="info" className="shrink-0">
                    Booked
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
      </div>

      {/* Side rail — kōrero and quiet utilities */}
      <div className="min-w-0 space-y-8">
      {/* Notices */}
      <section className="space-y-4">
        <SectionHeader
          divider
          className="lg:border-t-0 lg:pt-0"
          eyebrow="Pānui"
          title="Notices"
          action={announcements.length > 0 ? { label: "All notices", href: "/news" } : undefined}
        />
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} size="sm">
                <Link
                  href={`/news#${a.id}`}
                  className="block transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <CardContent className="space-y-1.5 py-0.5">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {formatShiftDate(a.sentAt)}
                      </p>
                      <p className="font-serif text-base font-medium tracking-tight">
                        {a.title}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                    {a.authorName && (
                      <p className="text-xs text-muted-foreground">— {a.authorName}</p>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <IconChip size="sm">
                <RiMegaphoneLine />
              </IconChip>
              <div>
                <p className="text-sm font-semibold">Nothing new just yet</p>
                <p className="text-sm text-muted-foreground">
                  Kitchen news and updates will land here.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quiet utility rows */}
      <section className="space-y-3 border-t border-border pt-6">
        <Card size="sm">
          <Link
            href="/documents"
            className="block transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <CardContent className="flex items-center gap-3">
              <IconChip size="sm">
                <RiShieldCheckLine />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Policies &amp; procedures</p>
                <p className="text-xs text-muted-foreground">
                  Read and confirm the kaupapa we work by
                </p>
              </div>
              <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </CardContent>
          </Link>
        </Card>

        <Card size="sm">
          <Link
            href="/team"
            className="block transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <CardContent className="flex items-center gap-3">
              <IconChip size="sm">
                <RiGroupLine />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Tō mātou tīma · Our team</p>
                <p className="text-xs text-muted-foreground">
                  Team leaders, guardian angels - who to turn to
                </p>
              </div>
              <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </CardContent>
          </Link>
        </Card>

        <Card size="sm" variant="tint">
          <CardContent className="flex flex-wrap items-center gap-3">
            <IconChip tone="brand" size="sm">
              <RiHandHeartLine />
            </IconChip>
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-sm font-semibold">Other ways to tautoko</p>
              <p className="text-xs text-muted-foreground">
                Donate kai, support a drive, or share the kaupapa.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
              <a href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer">
                See needs
                <RiArrowRightLine className="size-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Kaupapa grace note — Suzanne Aubert's founding words */}
      <Card variant="ink">
        <CardContent className="space-y-3">
          <p className="eyebrow text-ink-muted-foreground">Tō tātou kaupapa</p>
          <blockquote className="font-serif text-lg/relaxed italic">
            &ldquo;Help one another and make use of the many little occasions to
            lighten the burden of others.&rdquo;
          </blockquote>
          <p className="eyebrow text-ink-muted-foreground">
            Suzanne Aubert · Meri Hōhepa
          </p>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
