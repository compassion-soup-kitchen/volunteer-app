import type { Metadata } from "next";
import { connection } from "next/server";
import { getApplicationsList } from "@/lib/staff-actions";
import { ApplicationsList } from "./applications-list";

export const metadata: Metadata = {
  title: "Applications | Te Pūaroha",
};

export default async function ApplicationsPage() {
  await connection();
  const applications = await getApplicationsList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">
          Review and manage volunteer applications — ngā tono kaimahi tūao
        </p>
      </div>

      <ApplicationsList initialApplications={applications} />
    </div>
  );
}
