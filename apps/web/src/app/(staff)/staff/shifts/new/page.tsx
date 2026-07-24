import type { Metadata } from "next";
import { connection } from "next/server";
import { getServiceAreas } from "@/lib/application-actions";
import { getVolunteerOptions } from "@/lib/shift-actions";
import { ShiftForm } from "../shift-form";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Create Shift | Te Pūaroha",
};

export default async function NewShiftPage() {
  await connection();
  const [serviceAreas, volunteers] = await Promise.all([
    getServiceAreas(),
    getVolunteerOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/shifts"
        eyebrow="Hanga · New shift"
        title="Create shift"
        description="Add a new shift to the roster"
      />

      <ShiftForm serviceAreas={serviceAreas} volunteers={volunteers} />
    </div>
  );
}
