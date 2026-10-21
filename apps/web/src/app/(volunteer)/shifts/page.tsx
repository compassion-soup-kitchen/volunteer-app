import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAvailableShifts } from "@/lib/shift-actions";
import { getWeekClosures } from "@/lib/closed-day-actions";
import {
  addDaysToDateOnly,
  startOfWeekOf,
  todayInAppZone,
} from "@/lib/date-only";
import {
  parseDayParam,
  parseWeekParam,
  rosterWeekHref,
} from "@/lib/roster-week";
import { getServiceAreas } from "@/lib/application-actions";
import { getUserApplicationStatus } from "@/lib/application-actions";
import { ShiftBrowser } from "./shift-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/brand/icon-chip";
import { RiInformationLine, RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Browse shifts | Te Pūaroha",
};

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function ShiftsPage(props: { searchParams: SearchParams }) {
  await connection();
  const params = await props.searchParams;
  const today = todayInAppZone();
  const thisWeek = startOfWeekOf(today);
  // Weeks gone by hold nothing a volunteer can take, so the earliest is this one.
  const requested = parseWeekParam(params.week);
  const weekStart = requested && requested > thisWeek ? requested : thisWeek;
  const areaId = params.area || null;

  const [shifts, closures, serviceAreas, appStatus] = await Promise.all([
    getAvailableShifts({
      fromDate: weekStart,
      toDate: addDaysToDateOnly(weekStart, 6),
      ...(areaId ? { serviceAreaId: areaId } : {}),
    }),
    getWeekClosures(weekStart),
    getServiceAreas(),
    getUserApplicationStatus(),
  ]);

  // A link to an area that has since gone would read as "nothing on" - drop
  // the filter instead.
  if (areaId && !serviceAreas.some((area) => area.id === areaId)) {
    redirect(rosterWeekHref("/shifts", weekStart, today));
  }

  const isApproved = appStatus?.applicationStatus === "APPROVED";

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Ngā wāhi mahi · Roster"
        title="Available shifts"
        description="Browse and sign up for upcoming mahi"
      />

      {!isApproved && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <IconChip tone="info">
                <RiInformationLine />
              </IconChip>
              <div className="min-w-0 space-y-0.5">
                <h2 className="font-serif text-lg font-medium tracking-tight">
                  Application required
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your application needs to be approved before you can sign up
                  for shifts. You can still browse what&apos;s available.
                </p>
              </div>
            </div>
            {!appStatus && (
              <Button asChild size="sm" variant="outline">
                <Link href="/application">
                  Start application
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ShiftBrowser
        shifts={shifts}
        closures={closures}
        serviceAreas={serviceAreas}
        canSignUp={isApproved}
        weekStart={weekStart}
        today={today}
        areaId={areaId}
        focusDay={parseDayParam(params.day, weekStart)}
      />
    </div>
  );
}
