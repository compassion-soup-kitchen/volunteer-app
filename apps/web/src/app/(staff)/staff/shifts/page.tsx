import type { Metadata } from "next";
import { connection } from "next/server";
import { getStaffShifts } from "@/lib/shift-actions";
import { getServiceAreas } from "@/lib/application-actions";
import { StaffShiftList } from "./staff-shift-list";
import { Button } from "@/components/ui/button";
import { RiAddLine } from "@remixicon/react";
import Link from "next/link";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Manage Shifts | Te Pūaroha",
};

export default async function StaffShiftsPage() {
  await connection();
  const [shifts, serviceAreas] = await Promise.all([
    getStaffShifts(),
    getServiceAreas(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā wāhi mahi · Roster"
        title="Shifts"
        description="Manage rostered mahi for volunteers"
        actions={
          <Button asChild>
            <Link href="/staff/shifts/new">
              <RiAddLine className="size-4" />
              New shift
            </Link>
          </Button>
        }
      />

      <StaffShiftList
        initialShifts={shifts}
        serviceAreas={serviceAreas}
      />
    </div>
  );
}
