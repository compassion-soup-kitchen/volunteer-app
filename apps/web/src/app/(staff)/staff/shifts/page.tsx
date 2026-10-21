import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStaffShifts } from "@/lib/shift-actions";
import { getWeekClosures } from "@/lib/closed-day-actions";
import {
  addDaysToDateOnly,
  startOfWeekOf,
  todayInAppZone,
} from "@/lib/date-only";
import { parseWeekParam, rosterWeekHref } from "@/lib/roster-week";
import { getServiceAreas } from "@/lib/application-actions";
import { StaffShiftWeek } from "./staff-shift-week";
import { Button } from "@/components/ui/button";
import { RiAddLine, RiRepeatLine } from "@remixicon/react";
import Link from "next/link";
import { PageHeader } from "@/components/brand/page-header";
import { ShiftWeekSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Manage Shifts | Te Pūaroha",
};

type SearchParams = Promise<{ [key: string]: string | undefined }>;

async function ShiftWeekContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = todayInAppZone();
  const weekStart = parseWeekParam(params.week) ?? startOfWeekOf(today);
  const areaId = params.area || null;

  const [shifts, closures, serviceAreas] = await Promise.all([
    getStaffShifts({
      fromDate: weekStart,
      toDate: addDaysToDateOnly(weekStart, 6),
      ...(areaId ? { serviceAreaId: areaId } : {}),
    }),
    getWeekClosures(weekStart),
    getServiceAreas(),
  ]);

  // A link to an area that has since gone would show an empty week that
  // looks like nothing is rostered - drop the filter instead.
  if (areaId && !serviceAreas.some((area) => area.id === areaId)) {
    redirect(rosterWeekHref("/staff/shifts", weekStart, today));
  }

  return (
    <StaffShiftWeek
      shifts={shifts}
      closures={closures}
      serviceAreas={serviceAreas}
      weekStart={weekStart}
      today={today}
      areaId={areaId}
    />
  );
}

export default function StaffShiftsPage(props: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā wāhi mahi · Roster"
        title="Shifts"
        description="Manage rostered mahi for volunteers, a week at a time"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/staff/shifts/repeating">
                <RiRepeatLine className="size-4" />
                Repeating shifts
              </Link>
            </Button>
            <Button asChild>
              <Link href="/staff/shifts/new">
                <RiAddLine className="size-4" />
                Create shift
              </Link>
            </Button>
          </>
        }
      />

      <Suspense fallback={<ShiftWeekSkeleton />}>
        <ShiftWeekContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
