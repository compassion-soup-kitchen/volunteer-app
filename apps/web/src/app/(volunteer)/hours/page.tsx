import type { Metadata } from "next";
import { Suspense } from "react";
import { getVolunteerHoursData } from "@/lib/dashboard-actions";
import { HoursDetail } from "./hours-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "My Hours | Te Pūaroha",
  description: "View your volunteer hours, milestones, and service area breakdown.",
};

function HoursSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}

async function HoursContent() {
  const data = await getVolunteerHoursData();

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete your application to start tracking hours.
      </p>
    );
  }

  return <HoursDetail data={data} />;
}

export default function HoursPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Ngā hāora · Your hours"
        title="Your hours"
        description="Track your volunteer mahi and milestones"
      />

      <Suspense fallback={<HoursSkeleton />}>
        <HoursContent />
      </Suspense>
    </div>
  );
}
