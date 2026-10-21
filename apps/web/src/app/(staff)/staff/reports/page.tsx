import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getReportSummary,
  getHoursByServiceArea,
  getMonthlyTrends,
  getVolunteerLeaderboard,
  getOnboardingMetrics,
  getReportServiceAreas,
} from "@/lib/report-actions";
import { ReportDashboard } from "./report-dashboard";
import { PageHeader } from "@/components/brand/page-header";
import { ReportsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Pūrongo — Reports | Te Pūaroha Staff",
};

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
      <PageHeader
        eyebrow="Pūrongo · Reports"
        title="Reports"
        description="Volunteer hours, attendance, and onboarding insights"
      />

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
