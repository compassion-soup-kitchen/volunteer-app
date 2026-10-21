import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RiSuitcaseLine } from "@remixicon/react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/page-header";
import { EmptyState } from "@/components/brand/empty-state";
import { LeaveEntries } from "@/components/leave/leave-entries";
import { LogLeaveDialog } from "@/components/leave/log-leave-dialog";
import { auth } from "@/lib/auth";
import {
  getLeaveBoard,
  getLeavePeopleOptions,
  type StaffLeaveRecord,
} from "@/lib/leave-actions";
import { RECENT_DAYS } from "@/lib/data/leave";
import type { DateOnly } from "@/lib/date-only";
import { BoardSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Leave | Te Pūaroha",
};

async function LeaveBoard() {
  const [board, people, session] = await Promise.all([
    getLeaveBoard(),
    getLeavePeopleOptions(),
    auth(),
  ]);
  if (!board) notFound();
  const { today, current, upcoming, recent } = board;
  const viewerUserId = session?.user?.id;

  return (
    <>
      <div className="flex justify-end">
        <LogLeaveDialog today={today} people={people} viewerUserId={viewerUserId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <LeaveSection
            title="Away now"
            description="Back soonest first"
            entries={current}
            today={today}
            viewerUserId={viewerUserId}
            empty={{ title: "Everyone's around", description: "Nobody is on leave today." }}
          />
          <LeaveSection
            title="Recently back"
            description={`Leave that ended in the last ${RECENT_DAYS} days`}
            entries={recent}
            today={today}
            viewerUserId={viewerUserId}
            empty={{ title: "Nobody back lately", description: "No leave has ended in that time." }}
          />
        </div>
        <LeaveSection
          title="Coming up"
          description="Soonest first"
          entries={upcoming}
          today={today}
          viewerUserId={viewerUserId}
          empty={{ title: "No leave booked ahead", description: "Leave logged for the days to come will show here." }}
        />
      </div>
    </>
  );
}

function LeaveSection({
  title,
  description,
  entries,
  today,
  viewerUserId,
  empty,
}: {
  title: string;
  description: string;
  entries: StaffLeaveRecord[];
  today: DateOnly;
  viewerUserId: string | undefined;
  empty: { title: string; description: string };
}) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="tnum text-sm font-normal text-muted-foreground">{entries.length}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {entries.length > 0 ? (
        <div className="border-t border-border">
          <LeaveEntries
            entries={entries}
            audience="staff"
            today={today}
            showPerson
            viewerUserId={viewerUserId}
            stageBadge="none"
          />
        </div>
      ) : (
        <EmptyState
          bare
          size="compact"
          icon={<RiSuitcaseLine />}
          title={empty.title}
          description={empty.description}
          className="border-t border-border"
        />
      )}
    </Card>
  );
}

export default function StaffLeavePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wā okioki · Leave"
        title="Leave"
        description="Who's away, who's going, and who's just back - volunteers and the kitchen team. Volunteers log their own in the app; log it here for anyone who rings in, or for yourself."
      />
      <Suspense fallback={<BoardSkeleton />}>
        <LeaveBoard />
      </Suspense>
    </div>
  );
}
