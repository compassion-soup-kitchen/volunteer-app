import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import {
  getStaffDashboardStats,
  getRecentActivity,
} from "@/lib/staff-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RiTeamLine,
  RiFileListLine,
  RiCalendarLine,
  RiTimeLine,
  RiUserLine,
  RiCheckLine,
} from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff Dashboard | Te Pūaroha",
};

export default async function StaffDashboard() {
  await connection();
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Kia ora, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Staff dashboard — manage volunteers and operations
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivitySection />
      </Suspense>
    </div>
  );
}

async function StatsCards() {
  const stats = await getStaffDashboardStats();

  const cards = [
    {
      label: "Active Volunteers",
      value: stats?.activeVolunteers ?? 0,
      suffix: "",
      sublabel: "Kaimahi tūao",
      icon: RiTeamLine,
      href: "/staff/volunteers",
    },
    {
      label: "Pending Applications",
      value: stats?.pendingApplications ?? 0,
      suffix: "",
      sublabel: "Awaiting review",
      icon: RiFileListLine,
      href: "/staff/applications",
    },
    {
      label: "Shifts This Week",
      value: stats?.shiftsThisWeek ?? 0,
      suffix: "",
      sublabel: "Mahi o te wiki",
      icon: RiCalendarLine,
      href: "/staff/shifts",
    },
    {
      label: "Hours This Month",
      value: stats?.hoursThisMonth ?? 0,
      suffix: "h",
      sublabel: "Total volunteer hours",
      icon: RiTimeLine,
      href: null,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Wrapper = card.href ? Link : "div";
        return (
          <Wrapper
            key={card.label}
            href={card.href || "#"}
            className={card.href ? "group" : undefined}
          >
            <Card className={card.href ? "transition-colors group-hover:border-primary/30" : undefined}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl">
                    {card.value}{card.suffix}
                  </span>
                  <card.icon className="size-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.sublabel}</p>
              </CardContent>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
}

async function RecentActivitySection() {
  const activities = await getRecentActivity();

  if (activities.length === 0) return null;

  const iconMap = {
    application: RiFileListLine,
    signup: RiCheckLine,
    shift: RiCalendarLine,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <CardDescription>He aha ngā mahi hou — what&apos;s been happening</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity, i) => {
            const Icon = iconMap[activity.type] || RiUserLine;
            return (
              <div
                key={i}
                className="flex items-start gap-3 text-sm"
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-medium">{activity.label}</span>{" "}
                    <span className="text-muted-foreground">
                      {activity.detail}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.time, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-12 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="size-7 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
