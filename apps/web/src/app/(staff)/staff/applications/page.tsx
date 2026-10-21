import type { Metadata } from "next";
import { connection } from "next/server";
import { getApplicationsList } from "@/lib/staff-actions";
import { APPLICATION_SORT_KEYS, parseSort } from "@/lib/table-sort";
import { ApplicationsList } from "./applications-list";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Applications | Te Pūaroha",
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  await connection();
  const { sort } = await searchParams;
  const applications = await getApplicationsList();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā tono · Applications"
        title="Applications"
        description="Review and manage volunteer applications"
      />

      <ApplicationsList
        initialApplications={applications}
        initialSort={parseSort(sort, APPLICATION_SORT_KEYS)}
      />
    </div>
  );
}
