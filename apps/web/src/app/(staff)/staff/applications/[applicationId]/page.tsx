import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/staff-actions";
import { ApplicationReview } from "./application-review";
import { PageHeader } from "@/components/brand/page-header";
import { StatusBadge } from "@/components/brand/status-badge";

export const metadata: Metadata = {
  title: "Review Application | Te Pūaroha",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  await connection();
  const { applicationId } = await params;
  const application = await getApplicationDetail(applicationId);

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/applications"
        eyebrow="Arotake tono · Application review"
        title={application.volunteer.user.name || "Unnamed applicant"}
        description={application.volunteer.user.email}
        actions={<StatusBadge status={application.status} className="text-sm" />}
      />

      <ApplicationReview application={application} />
    </div>
  );
}
