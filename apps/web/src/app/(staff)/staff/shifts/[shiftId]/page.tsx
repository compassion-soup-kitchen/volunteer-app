import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getShiftDetail, getVolunteerOptions } from "@/lib/shift-actions";
import { ShiftDetailView } from "./shift-detail-view";
import { getLeaveBetweenDays } from "@/lib/leave-actions";
import { dateOnlyOf } from "@/lib/date-only";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Shift Details | Te Pūaroha",
};

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  await connection();
  const { shiftId } = await params;
  const [shift, volunteers] = await Promise.all([
    getShiftDetail(shiftId),
    getVolunteerOptions(),
  ]);

  if (!shift) notFound();

  // Who's on leave that day, so the roster picker can say so up front.
  const day = dateOnlyOf(shift.date);
  const away = await getLeaveBetweenDays(day, day);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/shifts"
        eyebrow="Te wāhi mahi · Shift"
        title={shift.serviceArea.name}
        description="View and manage this shift"
      />

      <ShiftDetailView
        shift={shift}
        volunteers={volunteers}
        away={away.flatMap((leave) =>
          // Only someone with a volunteer record can be on the roster.
          leave.person.volunteerId
            ? [{ volunteerId: leave.person.volunteerId, startsOn: leave.startsOn, endsOn: leave.endsOn }]
            : []
        )}
      />
    </div>
  );
}
