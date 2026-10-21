import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/brand/empty-state";
import { PageHeader } from "@/components/brand/page-header";
import { GroupBadge } from "@/components/brand/group-badge";
import { PersonAvatar } from "@/components/brand/person-avatar";
import { ListCard, ListCardBody } from "@/components/brand/list-card";
import { RiGroupLine } from "@remixicon/react";
import { getVisibleTeam } from "@/lib/group-actions";
import { memberCountLabel } from "@/lib/volunteer-groups";

export const metadata: Metadata = {
  title: "Our team | Te Pūaroha",
};

export default async function TeamPage() {
  await connection();
  const groups = await getVisibleTeam();

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Tō mātou tīma · Our team"
        title="Who's who"
        description="The people behind each part of the mahi - and who to turn to when you need a hand."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<RiGroupLine />}
          title="Nothing to show just yet"
          description="Once the team is set up here, you'll see who leads each part of the mahi. In the meantime, ask any coordinator on shift."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <ListCard
              key={group.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <GroupBadge group={group} />
                  <Badge variant="neutral" className="tnum">
                    {memberCountLabel(group.members.length)}
                  </Badge>
                </span>
              }
              description={group.description}
            >
              {group.members.length > 0 ? (
                <ListCardBody className="pt-4">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {group.members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3">
                        <PersonAvatar name={member.name} size="lg" />
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {member.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ListCardBody>
              ) : (
                <EmptyState
                  bare
                  size="compact"
                  icon={<RiGroupLine />}
                  title="No one in this group yet"
                  className="border-t border-border"
                />
              )}
            </ListCard>
          ))}
        </div>
      )}
    </div>
  );
}
