import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/staff-actions";
import { ApplicationReview } from "./application-review";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Review Application | Te Pūaroha",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = await getApplicationDetail(applicationId);

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/staff/applications">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {application.volunteer.user.name || "Unnamed Applicant"}
          </h1>
          <p className="text-muted-foreground">
            Application review — arotake tono
          </p>
        </div>
      </div>

      <ApplicationReview application={application} />
    </div>
  );
}
