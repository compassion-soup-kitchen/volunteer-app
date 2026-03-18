import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RiCheckLine,
  RiTimeLine,
  RiCloseLine,
  RiInformationLine,
  RiArrowRightLine,
} from "@remixicon/react";
import { ApplicationForm } from "./application-form";
import {
  getServiceAreas,
  getUserApplicationStatus,
} from "@/lib/application-actions";

export const metadata: Metadata = {
  title: "Volunteer Application | Te Pūaroha",
};

const STATUS_CONFIG = {
  PENDING: {
    icon: RiTimeLine,
    label: "Under Review",
    badgeVariant: "secondary" as const,
    description:
      "Your application has been received and is being reviewed by our team. We'll be in touch soon — ngā mihi for your patience.",
  },
  APPROVED: {
    icon: RiCheckLine,
    label: "Approved",
    badgeVariant: "default" as const,
    description:
      "Congratulations! Your application has been approved. Welcome to the whānau — you can now sign up for shifts.",
  },
  DECLINED: {
    icon: RiCloseLine,
    label: "Declined",
    badgeVariant: "destructive" as const,
    description:
      "Unfortunately, your application was not approved at this time. Please contact us if you have questions.",
  },
  INFO_REQUESTED: {
    icon: RiInformationLine,
    label: "More Info Needed",
    badgeVariant: "outline" as const,
    description:
      "We need a bit more information before we can process your application. Please check the notes below.",
  },
};

export default async function ApplicationPage() {
  const [appStatus, serviceAreas] = await Promise.all([
    getUserApplicationStatus(),
    getServiceAreas(),
  ]);

  // Already submitted — show status
  if (appStatus) {
    const status = appStatus.applicationStatus;
    if (!status) redirect("/dashboard");

    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    const StatusIcon = config.icon;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Volunteer Application
          </h1>
          <p className="text-muted-foreground">
            Tēnā koe — your application status
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <StatusIcon className="size-6 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <CardTitle>Application Status</CardTitle>
              <Badge variant={config.badgeVariant}>{config.label}</Badge>
            </div>
            <CardDescription className="mx-auto max-w-sm">
              {config.description}
            </CardDescription>
          </CardHeader>
          {appStatus.applicationNotes && (
            <CardContent>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Notes from our team
                </p>
                <p className="text-sm">{appStatus.applicationNotes}</p>
              </div>
            </CardContent>
          )}
          <CardContent className="pt-0">
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  Back to Dashboard
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
              {status === "APPROVED" && (
                <Button asChild>
                  <Link href="/shifts">Browse Shifts</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No application yet — show form
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Volunteer Application
        </h1>
        <p className="text-muted-foreground">
          Tēnā koe — thank you for your interest in volunteering with us
        </p>
      </div>

      <ApplicationForm serviceAreas={serviceAreas} />
    </div>
  );
}
