import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RiCalendarLine,
  RiTimeLine,
  RiArrowRightLine,
} from "@remixicon/react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard | Te Pūaroha",
};

export default async function VolunteerDashboard() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Kia ora, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Welcome to your volunteer dashboard
        </p>
      </div>

      {session?.user?.role === "PUBLIC" && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle>Complete Your Application</CardTitle>
            <CardDescription>
              To start volunteering, please complete your application form. We
              can&apos;t wait to have you on board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/application">
                Start Application
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                <RiCalendarLine className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Upcoming Shifts</CardTitle>
                <CardDescription>Your next scheduled mahi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No upcoming shifts. Browse available shifts to sign up.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                <RiTimeLine className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Your Hours</CardTitle>
                <CardDescription>Volunteer time this month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">0h</p>
            <p className="text-sm text-muted-foreground">
              Hours will appear here once you start volunteering
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
