import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/brand/page-header";
import { auth } from "@/lib/auth";
import { getStaffEvents } from "@/lib/event-actions";
import { EventManager } from "./event-manager";
import { EventsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Events | Te Pūaroha Staff",
};

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
