import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/brand/page-header";
import { getServiceAreas } from "@/lib/application-actions";
import { getOfflineVolunteerValues } from "@/lib/offline-volunteer-actions";
import { OfflineVolunteerForm } from "../../offline-volunteer-form";

export const metadata: Metadata = {
  title: "Edit volunteer | Te Pūaroha",
};

export default async function EditOfflineVolunteerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await connection();
  const { userId } = await params;
  const [values, serviceAreas] = await Promise.all([
    getOfflineVolunteerValues(userId),
    getServiceAreas(),
  ]);

  // Only offline records are edited by staff; everyone else owns their details.
  if (!values) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/staff/volunteers/${userId}`}
        eyebrow="Te tangata · Volunteer record"
        title={`Edit ${values.name}'s details`}
      />

      <OfflineVolunteerForm serviceAreas={serviceAreas} values={values} />
    </div>
  );
}
