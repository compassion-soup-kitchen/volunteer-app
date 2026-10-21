import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/brand/empty-state";
import { PageHeader } from "@/components/brand/page-header";
import { GroupBadge } from "@/components/brand/group-badge";
import { RiGroupLine } from "@remixicon/react";
import { getVisibleTeam } from "@/lib/group-actions";
import { memberCountLabel } from "@/lib/volunteer-groups";

export const metadata: Metadata = {
  title: "Our team | Te Pūaroha",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

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
            <Card key={group.id} className="gap-0 pb-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <GroupBadge group={group} />
                  <Badge variant="neutral" className="tnum">
                    {memberCountLabel(group.members.length)}
                  </Badge>
                </CardTitle>
                {group.description && (
                  <p className="text-sm text-muted-foreground">
                    {group.description}
                  </p>
                )}
              </CardHeader>
              {group.members.length > 0 ? (
                <CardContent className="border-t border-border pt-4 pb-2">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {group.members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-neutral-tint-foreground"
                        >
                          {initials(member.name)}
                        </span>
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {member.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : (
                <EmptyState
                  bare
                  size="compact"
                  icon={<RiGroupLine />}
                  title="No one in this group yet"
                  className="border-t border-border"
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
