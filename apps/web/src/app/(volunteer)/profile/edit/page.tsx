import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/brand/page-header";
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
      <PageHeader
        backHref="/profile"
        eyebrow="Tō kōtaha · Profile"
        title="Edit profile"
        description="Keep your details up to date"
      />

      <ProfileEditForm profile={profile} />
    </div>
  );
}
