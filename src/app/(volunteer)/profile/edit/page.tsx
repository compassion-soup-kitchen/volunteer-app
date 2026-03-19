import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";
import { getVolunteerProfile } from "@/lib/application-actions";
import { ProfileEditForm } from "../profile-edit-form";

export const metadata: Metadata = {
  title: "Edit Profile | Te Pūaroha",
};

export default async function EditProfilePage() {
  await connection();
  const profile = await getVolunteerProfile();

  if (!profile) {
    redirect("/application");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/profile">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      <ProfileEditForm profile={profile} />
    </div>
  );
}
