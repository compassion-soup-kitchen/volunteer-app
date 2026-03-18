import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";
import { getTrainingDetail } from "@/lib/training-actions";
import { TrainingDetailView } from "./training-detail-view";

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/staff/training">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {session.title}
        </h1>
      </div>
      <TrainingDetailView session={session} />
    </div>
  );
}
