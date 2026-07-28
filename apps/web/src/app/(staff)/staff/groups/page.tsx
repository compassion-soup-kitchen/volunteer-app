import type { Metadata } from "next";
import { connection } from "next/server";
import { getGroupCandidates, getVolunteerGroups } from "@/lib/group-actions";
import { GroupManager } from "./group-manager";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Groups | Te Pūaroha",
};

export default async function GroupsPage() {
  await connection();
  const [groups, candidates] = await Promise.all([
    getVolunteerGroups(),
    getGroupCandidates(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā rōpū · Groups"
        title="Volunteer groups"
        description="Name the crews inside the whānau - team leaders, guardian angels, your regulars - so everyone knows who's who"
      />

      <GroupManager initialGroups={groups} candidates={candidates} />
    </div>
  );
}
