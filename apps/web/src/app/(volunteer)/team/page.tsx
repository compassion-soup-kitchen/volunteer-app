import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/brand/icon-chip";
import { PageHeader } from "@/components/brand/page-header";
import { GroupBadge } from "@/components/brand/group-badge";
import { PersonAvatar } from "@/components/brand/person-avatar";
import { ListCard, ListCardBody } from "@/components/brand/list-card";
import { RiGroupLine } from "@remixicon/react";
import { getVisibleTeam } from "@/lib/group-actions";
import { memberCountLabel } from "@/lib/volunteer-groups";

export const metadata: Metadata = {
  title: "Our Team | Te Pūaroha",
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
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip tone="brand" size="lg">
              <RiGroupLine />
            </IconChip>
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                Nothing to show just yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once the team is set up here, you&apos;ll see who leads each part
                of the mahi. In the meantime, ask any coordinator on shift.
              </p>
            </div>
          </CardContent>
        </Card>
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
              <ListCardBody className="pt-4">
                {group.members.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No one in this group yet.
                  </p>
                )}
              </ListCardBody>
            </ListCard>
          ))}
        </div>
      )}
    </div>
  );
}
