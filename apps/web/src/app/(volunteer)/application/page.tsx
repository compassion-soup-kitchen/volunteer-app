import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { PageHeader } from "@/components/brand/page-header";
import { IconChip } from "@/components/brand/icon-chip";
import { StatusBadge } from "@/components/brand/status-badge";

export const metadata: Metadata = {
  title: "Volunteer Application | Te Pūaroha",
};

const STATUS_CONFIG = {
  PENDING: {
    icon: RiTimeLine,
    tone: "warning" as const,
    cardVariant: "default" as const,
    description:
      "Your application has been received and is being reviewed by our team. We'll be in touch soon - ngā mihi for your patience.",
  },
  APPROVED: {
    icon: RiCheckLine,
    tone: "success" as const,
    cardVariant: "tint" as const,
    description:
      "Congratulations! Your application has been approved. Welcome to the whānau - you can now sign up for shifts.",
  },
  DECLINED: {
    icon: RiCloseLine,
    tone: "destructive" as const,
    cardVariant: "default" as const,
    description:
      "Unfortunately, your application was not approved at this time. Please contact us if you have questions.",
  },
  INFO_REQUESTED: {
    icon: RiInformationLine,
    tone: "info" as const,
    cardVariant: "default" as const,
    description:
      "We need a bit more information before we can process your application. Please check the notes below.",
  },
};

export default async function ApplicationPage() {
  await connection();
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
        <PageHeader
          backHref="/dashboard"
          eyebrow="Te tono · Application"
          title="Volunteer application"
          description="Tēnā koe, your application status"
        />

        <Card variant={config.cardVariant} className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-4 pt-2 text-center">
            <IconChip tone={config.tone} size="lg">
              <StatusIcon />
            </IconChip>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h2 className="font-serif text-xl font-medium tracking-tight">
                  Application status
                </h2>
                <StatusBadge status={status} />
              </div>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
          </CardContent>
          {appStatus.applicationNotes && (
            <CardContent>
              <div className="rounded-lg bg-muted p-4 text-left">
                <p className="eyebrow text-muted-foreground">
                  Notes from our team
                </p>
                <p className="mt-1.5 text-sm">{appStatus.applicationNotes}</p>
              </div>
            </CardContent>
          )}
          <CardContent className="flex flex-wrap justify-center gap-3 pb-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            {status === "APPROVED" && (
              <Button asChild>
                <Link href="/shifts">
                  Browse shifts
                  <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No application yet — show form
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <PageHeader
        eyebrow="Te tono · Application"
        title="Volunteer application"
        description="Tēnā koe, thank you for your interest in volunteering with us"
      />

      <ApplicationForm serviceAreas={serviceAreas} />
    </div>
  );
}
