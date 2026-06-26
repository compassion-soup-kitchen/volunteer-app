import type { Metadata } from "next";
import { connection } from "next/server";
import { getVolunteersList } from "@/lib/staff-actions";
import { VolunteerDirectory } from "./volunteer-directory";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Volunteers | Te Pūaroha",
};

export default async function VolunteersPage() {
  await connection();
  const volunteers = await getVolunteersList();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Te whānau · Volunteers"
        title="Volunteers"
        description="Manage your volunteer whānau"
      />

      <VolunteerDirectory initialVolunteers={volunteers} />
    </div>
  );
}
