import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { RiSuitcaseLine } from "@remixicon/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChip } from "@/components/brand/icon-chip";
import { PageHeader } from "@/components/brand/page-header";
import { LeaveEntries } from "@/components/leave/leave-entries";
import { LogLeaveForm } from "@/components/leave/log-leave-card";
import { getMyLeave } from "@/lib/leave-actions";
import { describeLeaveStatus, formatLeaveRange } from "@/lib/leave";

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
              <p className="eyebrow text-ink-muted-foreground">Kei te wehe koe · You&apos;re away</p>
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

          <Card className="gap-0 pb-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Coming up</CardTitle>
            </CardHeader>
            {ahead.length > 0 ? (
              <div className="border-t border-border">
                <LeaveEntries entries={ahead} audience="self" today={today} stageBadge="current" />
              </div>
            ) : (
              <CardContent className="border-t border-border pt-3 pb-5">
                <p className="text-sm text-muted-foreground">
                  No leave logged. We&apos;ll see you on the roster.
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Past leave</CardTitle>
          </CardHeader>
          {past.length > 0 ? (
            <div className="border-t border-border">
              <LeaveEntries entries={past} audience="self" today={today} stageBadge="none" />
            </div>
          ) : (
            <CardContent className="border-t border-border pt-3 pb-5">
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
