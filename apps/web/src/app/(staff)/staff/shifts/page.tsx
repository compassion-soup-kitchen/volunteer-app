import type { Metadata } from "next";
import { connection } from "next/server";
import { getStaffShifts } from "@/lib/shift-actions";
import { todayInAppZone } from "@/lib/date-only";
import { pageOfShifts, staffShiftsLimit } from "@/lib/staff-shift-pages";
import { getServiceAreas } from "@/lib/application-actions";
import { StaffShiftList } from "./staff-shift-list";
import { Button } from "@/components/ui/button";
import { RiAddLine, RiRepeatLine } from "@remixicon/react";
import Link from "next/link";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Manage Shifts | Te Pūaroha",
};

export default async function StaffShiftsPage() {
  await connection();
  // Matches the list's default "Upcoming" filter, so the first paint agrees with it.
  const [rows, serviceAreas] = await Promise.all([
    getStaffShifts({ fromDate: todayInAppZone(), limit: staffShiftsLimit(1) }),
    getServiceAreas(),
  ]);
  const { shifts, hasMore } = pageOfShifts(rows, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā wāhi mahi · Roster"
        title="Shifts"
        description="Manage rostered mahi for volunteers"
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

      <StaffShiftList
        initialShifts={shifts}
        initialHasMore={hasMore}
        serviceAreas={serviceAreas}
      />
    </div>
  );
}
