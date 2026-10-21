import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { RiSuitcaseLine } from "@remixicon/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChip } from "@/components/brand/icon-chip";
import { PageHeader } from "@/components/brand/page-header";
import { EmptyState } from "@/components/brand/empty-state";
import { LeaveEntries } from "@/components/leave/leave-entries";
import { LogLeaveForm } from "@/components/leave/log-leave-card";
import { getMyLeave } from "@/lib/leave-actions";
import { describeLeaveStatus, formatLeaveRange } from "@/lib/leave";
import { Eyebrow } from "@/components/brand/eyebrow";
import { ListCard } from "@/components/brand/list-card";

export const metadata: Metadata = {
  title: "My leave | Te Pūaroha",
};

export default async function MyLeavePage() {
  await connection();
  const leave = await getMyLeave();

  // Leave belongs to a volunteer record, which starts with the application.
  if (!leave) redirect("/application");

  const { today, current, upcoming, past } = leave;
  const ahead = [...(current ? [current] : []), ...upcoming];

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        backHref="/profile"
        eyebrow="Wā okioki · Leave"
        title="My leave"
        description="Going away? Let the kitchen know, and we'll take you off the roster while you're gone."
      />

      {current && (
        <Card variant="ink">
          <CardContent className="flex items-start gap-4">
            <IconChip size="md" tone="onInk">
              <RiSuitcaseLine />
            </IconChip>
            <div className="space-y-1">
              <Eyebrow tone="ink">Kei te wehe koe · You&apos;re away</Eyebrow>
              <p className="font-serif text-2xl font-medium tracking-tight">
                {describeLeaveStatus(current, today)}
              </p>
              <p className="text-sm text-ink-muted-foreground">
                {formatLeaveRange(current, today)}
                {current.reason ? ` · ${current.reason}` : ""}. Back sooner? Let us know below and
                we&apos;ll open the roster up for you again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log leave</CardTitle>
              <CardDescription>
                Any shifts you&apos;re on while you&apos;re away come off the roster, so someone
                else can step in.
              </CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border pt-5">
              <LogLeaveForm today={today} />
            </CardContent>
          </Card>

          <ListCard title="Coming up">
            {ahead.length > 0 ? (
              <LeaveEntries entries={ahead} audience="self" today={today} stageBadge="current" />
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiSuitcaseLine />}
                title="No leave logged"
                description="We'll see you on the roster."
                className="border-t border-border"
              />
            )}
          </ListCard>
        </div>

        <ListCard title="Past leave">
          {past.length > 0 ? (
            <LeaveEntries entries={past} audience="self" today={today} stageBadge="none" />
          ) : (
            <EmptyState
              bare
              size="compact"
              icon={<RiSuitcaseLine />}
              title="No past leave"
              description="Leave you've taken will be kept here."
              className="border-t border-border"
            />
          )}
        </ListCard>
      </div>
    </div>
  );
}
