import type { Metadata } from "next";
import { connection } from "next/server";
import { getApplicationsList } from "@/lib/staff-actions";
import { ApplicationsList } from "./applications-list";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Applications | Te Pūaroha",
};

export default async function ApplicationsPage() {
  await connection();
  const applications = await getApplicationsList();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā tono · Applications"
        title="Applications"
        description="Review and manage volunteer applications"
      />

      <ApplicationsList initialApplications={applications} />
    </div>
  );
}
