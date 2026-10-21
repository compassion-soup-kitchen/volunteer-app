import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";
import { ActivitySkeleton, AwayTodaySkeleton, StatsSkeleton } from "./skeleton";

export default function StaffDashboardLoading() {
  return (
    <PageSkeleton className="space-y-8">
      <PageHeaderSkeleton />
      <StatsSkeleton />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
        <ActivitySkeleton />
        <div className="min-w-0 space-y-8">
          <AwayTodaySkeleton />
          {/* Quick actions */}
          <section className="space-y-4">
            <SectionHeaderSkeleton />
            <ListCardSkeleton rows={4} />
          </section>
        </div>
      </div>
    </PageSkeleton>
  );
}
