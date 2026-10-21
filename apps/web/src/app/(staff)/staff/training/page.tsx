import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiAddLine, RiSettings3Line } from "@remixicon/react";
import { getStaffTrainingSessions } from "@/lib/training-actions";
import { TrainingList } from "./training-list";
import { PageHeader } from "@/components/brand/page-header";
import { TrainingListSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Training sessions | Te Pūaroha",
};

async function TrainingContent() {
  const sessions = await getStaffTrainingSessions();
  return <TrainingList sessions={sessions} />;
}

export default function StaffTrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Whakangungu · Training"
        title="Training"
        description="Manage training sessions for volunteers"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/staff/training/types">
                <RiSettings3Line className="size-4" />
                Training types
              </Link>
            </Button>
            <Button asChild>
              <Link href="/staff/training/new">
                <RiAddLine className="size-4" />
                Schedule training
              </Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<TrainingListSkeleton />}>
        <TrainingContent />
      </Suspense>
    </div>
  );
}
