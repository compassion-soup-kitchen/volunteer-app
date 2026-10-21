import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import {
  getStaffDashboardStats,
  getRecentActivity,
} from "@/lib/staff-actions";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatFigure } from "@/components/brand/stat-figure";
import { IconChip } from "@/components/brand/icon-chip";
import { BleedList } from "@/components/brand/detail-list";
import { Eyebrow } from "@/components/brand/eyebrow";
import { rowLinkVariants } from "@/components/brand/row-link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/brand/empty-state";
import { StatsSkeleton, ActivitySkeleton, AwayTodaySkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Staff dashboard | Te Pūaroha",
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

  const cards = [
    {
      label: "Active volunteers",
      value: stats?.activeVolunteers ?? 0,
      unit: undefined as string | undefined,
      sublabel: "Kaimahi tūao",
      icon: RiTeamLine,
      href: "/staff/volunteers",
      tone: "brand" as const,
    },
    {
      label: "Pending applications",
      value: stats?.pendingApplications ?? 0,
      unit: undefined,
      sublabel: "Awaiting review",
      icon: RiFileListLine,
      href: "/staff/applications",
      tone: (stats?.pendingApplications ?? 0) > 0 ? ("warning" as const) : ("neutral" as const),
    },
    {
      label: "Shifts this week",
      value: stats?.shiftsThisWeek ?? 0,
      unit: undefined,
      sublabel: "Mahi o te wiki",
      icon: RiCalendarLine,
      href: "/staff/shifts",
      tone: "info" as const,
    },
    {
      label: "Hours this month",
      value: stats?.hoursThisMonth ?? 0,
      unit: "h",
      sublabel: "Total volunteer hours",
      icon: RiTimeLine,
      href: null,
      tone: "success" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const body = (
          <CardContent className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Eyebrow size="sm" tone="muted">
                {card.label}
              </Eyebrow>
              <StatFigure value={card.value} unit={card.unit} />
              <p className="text-xs text-muted-foreground">{card.sublabel}</p>
            </div>
            <IconChip tone={card.tone} size="sm">
              <card.icon />
            </IconChip>
          </CardContent>
        );
        return card.href ? (
          <Card key={card.label} className="transition-colors hover:ring-input">
            <Link
              href={card.href}
              className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {body}
            </Link>
          </Card>
        ) : (
          <Card key={card.label}>{body}</Card>
        );
      })}
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
                  className={cn(rowLinkVariants(), "px-4 py-2.5")}
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
                className={cn(rowLinkVariants(), "px-4 py-2.5")}
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

