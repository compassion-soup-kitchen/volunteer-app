import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/brand/page-header";
import { getServiceAreas } from "@/lib/application-actions";
import { OfflineVolunteerForm } from "../offline-volunteer-form";

export const metadata: Metadata = {
  title: "Add a volunteer | Te Pūaroha",
};

export default async function NewOfflineVolunteerPage() {
  await connection();
  const serviceAreas = await getServiceAreas();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/volunteers"
        eyebrow="Te tangata · New volunteer"
        title="Add a volunteer who doesn't use the app"
        description="Keep their record here, roster them, and log their hours by marking attendance"
      />

      <OfflineVolunteerForm serviceAreas={serviceAreas} />
    </div>
  );
}
