import type { Metadata } from "next";
import { connection } from "next/server";
import { getStaffShifts } from "@/lib/shift-actions";
import { getServiceAreas } from "@/lib/application-actions";
import { StaffShiftList } from "./staff-shift-list";
import { Button } from "@/components/ui/button";
import { RiAddLine } from "@remixicon/react";
import Link from "next/link";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shifts</h1>
          <p className="text-muted-foreground">
            Manage rostered mahi for volunteers
          </p>
        </div>
        <Button asChild>
          <Link href="/staff/shifts/new">
            <RiAddLine className="size-4" />
            New Shift
          </Link>
        </Button>
      </div>

      <StaffShiftList
        initialShifts={shifts}
        serviceAreas={serviceAreas}
      />
    </div>
  );
}
