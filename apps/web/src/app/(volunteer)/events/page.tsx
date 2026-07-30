import type { Metadata } from "next";
import { connection } from "next/server";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/page-header";
import { SectionHeader } from "@/components/brand/section-header";
import { Illustration } from "@/components/brand/illustration";
import { EventInvitation } from "@/components/event/event-invitation";
import { auth } from "@/lib/auth";
import { todayInAppZone } from "@/lib/date-only";
import { getPastEvents, getUpcomingEvents } from "@/lib/event-actions";

export const metadata: Metadata = {
  title: "Events | Te Pūaroha",
};

export default async function EventsPage() {
  await connection();

  const [session, upcoming, past] = await Promise.all([
    auth(),
    getUpcomingEvents(),
    getPastEvents(),
  ]);

  const role = session?.user?.role ?? "VOLUNTEER";
  const today = todayInAppZone();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Ngā hui · Gatherings"
        title="Come along"
        description="Parties, hui and get-togethers for the whānau. Let us know if you can make it."
      />

      {upcoming.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {upcoming.map((event) => (
            <Card key={event.id} id={event.id} className="scroll-mt-20">
              <CardContent>
                <EventInvitation event={event} role={role} today={today} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Illustration name="korero" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                Nothing in the diary
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                When the team plans a gathering, your invitation will show up here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {past.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader divider eyebrow="Kua oti" title="Been and gone" />
          <Card>
            <ul className="divide-y divide-border">
              {past.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3"
                >
                  <span className="font-serif text-base font-medium tracking-tight">
                    {event.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.status === "CANCELLED"
                      ? "Cancelled"
                      : event.myRsvp?.response === "GOING"
                        ? "You were there"
                        : `${event.counts.going} came along`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
