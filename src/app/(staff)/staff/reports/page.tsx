import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getReportSummary,
  getHoursByServiceArea,
  getMonthlyTrends,
  getVolunteerLeaderboard,
  getOnboardingMetrics,
  getReportServiceAreas,
} from "@/lib/report-actions";
import { ReportDashboard } from "./report-dashboard";

export const metadata: Metadata = {
  title: "Pūrongo — Reports | Te Pūaroha Staff",
};

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

async function ReportsContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = {
    fromDate: params.from,
    toDate: params.to,
    serviceAreaId: params.area,
  };

  const [summary, byArea, trends, leaderboard, onboarding, serviceAreas] =
    await Promise.all([
      getReportSummary(filters),
      getHoursByServiceArea(filters),
      getMonthlyTrends(filters),
      getVolunteerLeaderboard(filters),
      getOnboardingMetrics(),
      getReportServiceAreas(),
    ]);

  return (
    <ReportDashboard
      summary={summary}
      byArea={byArea}
      trends={trends}
      leaderboard={leaderboard}
      onboarding={onboarding}
      serviceAreas={serviceAreas}
      filters={filters}
    />
  );
}

export default function StaffReportsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pūrongo — Reports
        </h1>
        <p className="text-muted-foreground">
          Volunteer hours, attendance, and onboarding insights
        </p>
      </div>

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
