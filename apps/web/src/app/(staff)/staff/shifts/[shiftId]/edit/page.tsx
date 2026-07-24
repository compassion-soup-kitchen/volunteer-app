import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getServiceAreas } from "@/lib/application-actions";
import { getShiftDetail, getVolunteerOptions } from "@/lib/shift-actions";
import { ShiftForm } from "../../shift-form";
import { PageHeader } from "@/components/brand/page-header";
import { formatDateOnly } from "@/lib/date-only";

export const metadata: Metadata = {
  title: "Edit Shift | Te Pūaroha",
};

export default async function EditShiftPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  await connection();
  const { shiftId } = await params;

  const [shift, serviceAreas, volunteers] = await Promise.all([
    getShiftDetail(shiftId),
    getServiceAreas(),
    getVolunteerOptions(),
  ]);

  if (!shift) notFound();

  const signupCount = shift.signups.filter(
    (signup) => signup.status === "SIGNED_UP" || signup.status === "ATTENDED"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/staff/shifts/${shift.id}`}
        eyebrow="Whakatika · Edit shift"
        title={shift.serviceArea.name}
        description={`Change the details of this shift on ${formatDateOnly(shift.date, { weekday: "long", day: "numeric", month: "long" })}`}
      />

      <ShiftForm
        serviceAreas={serviceAreas}
        volunteers={volunteers}
        shift={{
          id: shift.id,
          serviceAreaId: shift.serviceArea.id,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          capacity: shift.capacity,
          notes: shift.notes,
          offersCloseOn: shift.offersCloseOn,
          offers: shift.offers.map((offer) => ({
            volunteerId: offer.volunteer.id,
            status: offer.status,
          })),
          signupCount,
        }}
      />
    </div>
  );
}
