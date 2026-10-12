import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getVolunteersList } from "@/lib/staff-actions";
import { getAssignableGroups } from "@/lib/group-actions";
import { VolunteerDirectory } from "./volunteer-directory";
import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RiUserAddLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Volunteers | Te Pūaroha",
};

export default async function VolunteersPage() {
  await connection();
  const [volunteers, groups, session] = await Promise.all([
    getVolunteersList(),
    getAssignableGroups(),
    auth(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Te whānau · Volunteers"
        title="Volunteers"
        description="Manage your volunteer whānau"
        actions={
          <Button asChild>
            <Link href="/staff/volunteers/new">
              <RiUserAddLine className="size-4" />
              Add offline volunteer
            </Link>
          </Button>
        }
      />

      <VolunteerDirectory
        initialVolunteers={volunteers}
        groups={groups}
        currentUserId={session?.user?.id ?? ""}
        isAdmin={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
