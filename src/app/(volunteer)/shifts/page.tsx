import type { Metadata } from "next";
import { connection } from "next/server";
import { getAvailableShifts } from "@/lib/shift-actions";
import { getServiceAreas } from "@/lib/application-actions";
import { getUserApplicationStatus } from "@/lib/application-actions";
import { ShiftBrowser } from "./shift-browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiInformationLine, RiArrowRightLine, RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

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
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <RiArrowLeftLine className="size-4" />
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Available Shifts
          </h1>
          <p className="text-muted-foreground">
            Browse and sign up for upcoming mahi
          </p>
        </div>
      </div>

      {!isApproved && (
        <Card className="border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <RiInformationLine className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Application Required</CardTitle>
                <CardDescription>
                  Your application needs to be approved before you can sign up
                  for shifts. You can still browse what&apos;s available.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {!appStatus && (
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link href="/application">
                  Start Application
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          )}
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
