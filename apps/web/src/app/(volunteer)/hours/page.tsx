import type { Metadata } from "next";
import { Suspense } from "react";
import { getVolunteerHoursData } from "@/lib/dashboard-actions";
import { HoursDetail } from "./hours-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "@/components/brand/icon-chip";
import { PageHeader } from "@/components/brand/page-header";
import { RiTimeLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Your impact | Te Pūaroha",
  description: "View your volunteer hours, milestones, and service area breakdown.",
};

function HoursSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
      <div className="min-w-0 space-y-6">
        <Skeleton className="h-52" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

async function HoursContent() {
  const data = await getVolunteerHoursData();

  if (!data) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <IconChip tone="brand" size="lg">
            <RiTimeLine />
          </IconChip>
          <div>
            <p className="font-serif text-lg font-medium tracking-tight">
              Nothing to count just yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete your application to start tracking hours.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <HoursDetail data={data} />;
}

export default function HoursPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Tō pānga · Your impact"
        title="Your impact"
        description="Every hour of mahi you've shared with the kitchen"
      />

      <Suspense fallback={<HoursSkeleton />}>
        <HoursContent />
      </Suspense>
    </div>
  );
}
