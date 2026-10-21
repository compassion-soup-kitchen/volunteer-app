import type { Metadata } from "next";
import { Suspense } from "react";
import { getVolunteerHoursData } from "@/lib/dashboard-actions";
import { HoursDetail } from "./hours-detail";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand/empty-state";
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
      <EmptyState
        icon={<RiTimeLine />}
        tone="brand"
        title="Nothing to count just yet"
        description="Complete your application to start tracking hours."
        action={
          <Button asChild size="sm">
            <Link href="/application">Go to my application</Link>
          </Button>
        }
      />
    );
  }

  return <HoursDetail data={data} />;
}

export default function HoursPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tō pānga · Impact"
        title="The good you've done"
        description="Every hour of mahi you've shared with the kitchen"
      />

      <Suspense fallback={<HoursSkeleton />}>
        <HoursContent />
      </Suspense>
    </div>
  );
}
