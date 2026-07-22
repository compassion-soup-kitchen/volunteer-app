import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getVolunteersList } from "@/lib/staff-actions";
import { VolunteerDirectory } from "./volunteer-directory";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Volunteers | Te Pūaroha",
};

export default async function VolunteersPage() {
  await connection();
  const [volunteers, session] = await Promise.all([
    getVolunteersList(),
    auth(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Te whānau · Volunteers"
        title="Volunteers"
        description="Manage your volunteer whānau"
      />

      <VolunteerDirectory
        initialVolunteers={volunteers}
        currentUserId={session?.user?.id ?? ""}
        isAdmin={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
