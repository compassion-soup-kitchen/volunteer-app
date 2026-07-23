import type { Metadata } from "next";
import { connection } from "next/server";
import { getAvailableShifts } from "@/lib/shift-actions";
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
  title: "Browse Shifts | Te Pūaroha",
};

export default async function ShiftsPage() {
  await connection();
  const [shifts, serviceAreas, appStatus] = await Promise.all([
    getAvailableShifts(),
    getServiceAreas(),
    getUserApplicationStatus(),
  ]);

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
        initialShifts={shifts}
        serviceAreas={serviceAreas}
        canSignUp={isApproved}
      />
    </div>
  );
}
