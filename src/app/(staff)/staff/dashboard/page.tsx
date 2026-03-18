import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RiTeamLine,
  RiFileListLine,
  RiCalendarLine,
  RiTimeLine,
} from "@remixicon/react";

export const metadata: Metadata = {
  title: "Staff Dashboard | Te Pūaroha",
};

export default async function StaffDashboard() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Kia ora, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Staff dashboard — manage volunteers and operations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Volunteers</CardDescription>
            <CardTitle className="flex items-baseline gap-2">
              <span className="font-mono text-2xl">0</span>
              <RiTeamLine className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Kaimahi tūao</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Applications</CardDescription>
            <CardTitle className="flex items-baseline gap-2">
              <span className="font-mono text-2xl">0</span>
              <RiFileListLine className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shifts This Week</CardDescription>
            <CardTitle className="flex items-baseline gap-2">
              <span className="font-mono text-2xl">0</span>
              <RiCalendarLine className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mahi o te wiki</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hours This Month</CardDescription>
            <CardTitle className="flex items-baseline gap-2">
              <span className="font-mono text-2xl">0h</span>
              <RiTimeLine className="size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total volunteer hours
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
