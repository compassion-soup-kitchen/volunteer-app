import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/brand/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getRosterMonth } from "@/lib/closed-day-actions";
import { parseMonthParam } from "@/lib/closed-days";
import { startOfMonthInAppZone } from "@/lib/date-only";
import { RosterCalendar } from "./roster-calendar";

export const metadata: Metadata = {
  title: "Calendar | Te Pūaroha",
};

type SearchParams = Promise<{ [key: string]: string | undefined }>;

async function CalendarContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const month = parseMonthParam(params.month) ?? startOfMonthInAppZone();
  const data = await getRosterMonth(month);
  if (!data) notFound();

  // Keyed by month so the selected day resets when the month changes.
  return <RosterCalendar key={month} data={data} initialDate={params.day} />;
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-[28rem] w-full" />
      </Card>
      <div className="space-y-6">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function StaffCalendarPage(props: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Maramataka · Calendar"
        title="Calendar"
        description="The month's roster at a glance, and the days the kitchen is closed"
      />

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
