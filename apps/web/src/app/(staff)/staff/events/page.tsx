import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/brand/page-header";
import { auth } from "@/lib/auth";
import { getStaffEvents } from "@/lib/event-actions";
import { EventManager } from "./event-manager";

export const metadata: Metadata = {
  title: "Events | Te Pūaroha Staff",
};

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

async function EventsContent() {
  // The coordinator's own role decides whether they can reply to each event —
  // they're on the invite list for anything addressed to staff.
  const [events, session] = await Promise.all([getStaffEvents(), auth()]);
  return (
    <EventManager
      initialEvents={events}
      viewerRole={session?.user?.role ?? "COORDINATOR"}
    />
  );
}

export default function StaffEventsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā hui · Gatherings"
        title="Events"
        description="Parties, hui and working bees — invite the whānau and see who's coming."
      />
      <Suspense fallback={<EventsSkeleton />}>
        <EventsContent />
      </Suspense>
    </div>
  );
}
