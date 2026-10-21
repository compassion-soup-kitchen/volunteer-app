import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/brand/page-header";
import { getRosterMonth } from "@/lib/closed-day-actions";
import { parseMonthParam } from "@/lib/closed-days";
import { startOfMonthInAppZone } from "@/lib/date-only";
import { RosterCalendar } from "./roster-calendar";
import { CalendarSkeleton } from "./skeleton";

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
