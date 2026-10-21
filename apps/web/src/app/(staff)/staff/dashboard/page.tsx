import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import {
  getStaffDashboardStats,
  getRecentActivity,
} from "@/lib/staff-actions";
import { Card } from "@/components/ui/card";
import {
  RiTeamLine,
  RiFileListLine,
  RiCalendarLine,
  RiTimeLine,
  RiUserLine,
  RiCheckLine,
  RiAddLine,
  RiMegaphoneLine,
  RiArrowRightSLine,
  RiGraduationCapLine,
  RiSuitcaseLine,
} from "@remixicon/react";
import { getAwayToday } from "@/lib/leave-actions";
import { todayInAppZone } from "@/lib/date-only";
import { describeLeaveStatus } from "@/lib/leave";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { PageHeader } from "@/components/brand/page-header";
import { SectionHeader } from "@/components/brand/section-header";
import { StatCard } from "@/components/brand/stat-card";
import { IconChip } from "@/components/brand/icon-chip";
import { BleedList } from "@/components/brand/detail-list";
import { EmptyState } from "@/components/brand/empty-state";
import { StatsSkeleton, ActivitySkeleton, AwayTodaySkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Staff Dashboard | Te Pūaroha",
};

export default async function StaffDashboard() {
  await connection();
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Whakahaere · Operations"
        title={`Kia ora, ${firstName}`}
        description="Today's picture across volunteers, shifts and mahi."
      />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivitySection />
        </Suspense>

        <div className="min-w-0 space-y-8">
          <Suspense fallback={<AwayTodaySkeleton />}>
            <AwayTodaySection />
          </Suspense>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

async function StatsCards() {
  const stats = await getStaffDashboardStats();

  const pending = stats?.pendingApplications ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active volunteers"
        value={stats?.activeVolunteers ?? 0}
        sublabel="Kaimahi tūao"
        icon={RiTeamLine}
        href="/staff/volunteers"
      />
      <StatCard
        label="Pending applications"
        value={pending}
        sublabel="Awaiting review"
        icon={RiFileListLine}
        tone={pending > 0 ? "warning" : "neutral"}
        href="/staff/applications"
      />
      <StatCard
        label="Shifts this week"
        value={stats?.shiftsThisWeek ?? 0}
        sublabel="Mahi o te wiki"
        icon={RiCalendarLine}
        href="/staff/shifts"
      />
      <StatCard
        label="Hours this month"
        value={stats?.hoursThisMonth ?? 0}
        unit="h"
        sublabel="Total volunteer hours"
        icon={RiTimeLine}
      />
    </div>
  );
}

async function RecentActivitySection() {
  const activities = await getRecentActivity();

  const iconMap = {
    application: RiFileListLine,
    signup: RiCheckLine,
    shift: RiCalendarLine,
    leave: RiSuitcaseLine,
  };

  return (
    <section className="min-w-0 space-y-4">
      <SectionHeader
        eyebrow="Ngā mahi hou"
        title="Recent activity"
      />
      {activities.length === 0 ? (
        <EmptyState
          size="compact"
          icon={<RiTimeLine />}
          title="All quiet so far"
          description="New applications, shift sign-ups and leave will show up here as they happen."
        />
      ) : (
        <Card>
          <BleedList>
            {activities.map((activity, i) => {
              const Icon = iconMap[activity.type] || RiUserLine;
              return (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <IconChip size="sm" className="mt-0.5">
                    <Icon />
                  </IconChip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{activity.label}</span>{" "}
                      <span className="text-muted-foreground">{activity.detail}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.time, { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </BleedList>
        </Card>
      )}
    </section>
  );
}

/** Who's on leave today - the first thing to know before ringing round for cover. */
async function AwayTodaySection() {
  const away = await getAwayToday();
  const today = todayInAppZone();
  const shown = away.slice(0, 5);

  return (
    <section className="min-w-0 space-y-4">
      <SectionHeader
        eyebrow="Wā okioki"
        title="Away today"
        action={{ label: "All leave", href: "/staff/leave" }}
      />
      {away.length === 0 ? (
        <EmptyState
          size="compact"
          icon={<RiSuitcaseLine />}
          tone="success"
          title="Everyone's around"
          description="Nobody is on leave today."
        />
      ) : (
        <Card size="sm">
          <ul className="divide-y divide-border">
            {shown.map((leave) => (
              <li key={leave.id}>
                <Link
                  href={`/staff/volunteers/${leave.person.userId}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <IconChip size="sm" tone="warning">
                    <RiSuitcaseLine />
                  </IconChip>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {leave.person.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {describeLeaveStatus(leave, today)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {away.length > shown.length && (
              <li className="px-4 py-2.5 text-xs text-muted-foreground">
                and {away.length - shown.length} more
              </li>
            )}
          </ul>
        </Card>
      )}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { href: "/staff/shifts/new", label: "Create a shift", icon: RiAddLine },
    { href: "/staff/training/new", label: "Schedule training", icon: RiGraduationCapLine },
    { href: "/staff/announcements", label: "Write a pānui", icon: RiMegaphoneLine },
    { href: "/staff/applications", label: "Review applications", icon: RiFileListLine },
  ];

  return (
    <section className="min-w-0 space-y-4">
      <SectionHeader eyebrow="Mahi tere" title="Quick actions" />
      <Card size="sm">
        <BleedList>
          {actions.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <IconChip size="sm">
                  <action.icon />
                </IconChip>
                <span className="flex-1 text-sm font-medium">{action.label}</span>
                <RiArrowRightSLine
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </BleedList>
      </Card>
    </section>
  );
}

