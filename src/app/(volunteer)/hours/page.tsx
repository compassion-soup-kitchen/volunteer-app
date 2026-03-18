import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";
import { getVolunteerHoursData } from "@/lib/dashboard-actions";
import { HoursDetail } from "./hours-detail";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <RiArrowLeftLine className="size-4" />
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ngā Hāora — Your Hours
          </h1>
          <p className="text-muted-foreground">
            Track your volunteer mahi and milestones
          </p>
        </div>
      </div>

      <Suspense fallback={<HoursSkeleton />}>
        <HoursContent />
      </Suspense>
    </div>
  );
}
