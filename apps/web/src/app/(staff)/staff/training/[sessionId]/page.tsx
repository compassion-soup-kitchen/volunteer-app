import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTrainingDetail } from "@/lib/training-actions";
import { TrainingDetailView } from "./training-detail-view";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Training Detail | Te Pūaroha Staff",
};

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await connection();
  const { sessionId } = await params;
  const session = await getTrainingDetail(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/training"
        eyebrow="Whakangungu · Training"
        title={session.title}
      />
      <TrainingDetailView session={session} />
    </div>
  );
}
